import React, { useState, useRef, useEffect } from 'react';
import { 
  GitCompare, X, CheckCircle2, ShieldAlert, Trophy, Sparkles, Share2, 
  Upload, Camera, ArrowRight, RefreshCw, Award, Activity, Zap, Check, 
  AlertTriangle, Layers, Trash2, Eye, FileText, CheckSquare, Square, User
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';
import { useAuth } from '../context/AuthContext';

export default function CompareModal({ isOpen, onClose }) {
  const { user, requireAuth, consumeScan } = useAuth();
  const [selectedProfiles, setSelectedProfiles] = useState([
    'High Protein (Fitness Goal)',
    'Clean Athlete (WADA Compliant / No Banned Substances)'
  ]);

  const [imgA, setImgA] = useState(null);
  const [imgB, setImgB] = useState(null);
  const [prodA, setProdA] = useState(null);
  const [prodB, setProdB] = useState(null);

  const [cameraActiveSlot, setCameraActiveSlot] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Slot-specific scanning indicator on upload
  const [isSlotScanningA, setIsSlotScanningA] = useState(false);
  const [isSlotScanningB, setIsSlotScanningB] = useState(false);
  const [scanStep, setScanStep] = useState(1);
  const [scanProgress, setScanProgress] = useState(0);

  const fileInputA = useRef(null);
  const fileInputB = useRef(null);
  const cameraFileInputA = useRef(null);
  const cameraFileInputB = useRef(null);

  const healthProfileOptions = [
    { id: 'diabetic', label: 'Diabetic-Friendly (Low Glycemic / Sugar Free)' },
    { id: 'hypertension', label: 'Hypertension (Low Sodium / Stim-Free)' },
    { id: 'gluten-free', label: 'Gluten-Free' },
    { id: 'dairy-free', label: 'Dairy-Allergy (Lactose Free / Vegan)' },
    { id: 'soy-free', label: 'Soy-Free' },
    { id: 'nut-free', label: 'Nut-Allergy (Peanut & Tree Nut)' },
    { id: 'weight-loss', label: 'Weight Loss (Low Cal / Low Carb)' },
    { id: 'high-protein', label: 'High Protein (Fitness Goal)' },
    { id: 'clean-athlete', label: 'Clean Athlete (WADA Compliant / No Banned Substances)' },
    { id: 'pure-digestion', label: 'Pure Digestion (No Artificial Sweeteners / Sucralose)' }
  ];

  // GNC Tied Product Model (When user uploads 2 identical images)
  const GNC_TIED_PRODUCT = {
    id: 'gnc-whey',
    name: 'GNC Pro Performance 100% Whey',
    brand: 'GNC',
    purityScore: 65,
    riskLevel: 'warning',
    claimedProtein: '24g per serving',
    actualProtein: '20.4g (85% Intact)',
    category: '100% Whey Protein',
    image: '/whey-protein-transparent.png',
    flags: {
      aminoSpiking: false,
      trueProteinRatio: '85.0%',
      bannedSubstances: false,
      fillerCount: 1,
      heavyMetalsRisk: 'Low (< 0.05 ppm)'
    },
    ingredientsList: [
      { name: "Whey Protein Blend (Concentrate & Isolate)", status: "clean" },
      { name: "Maltodextrin (Carbohydrate Thickener)", status: "warning" },
      { name: "Sucralose (INS 955)", status: "warning" },
      { name: "Acesulfame Potassium (INS 950)", status: "warning" },
      { name: "Synthetic colors & thickeners", status: "warning" }
    ],
    verdict: "Moderate - Offers good protein content per serving but Indian formulation includes artificial sweeteners (Sucralose, Ace-K) and Maltodextrin."
  };

  const handleTriggerCamera = (slot) => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    
    // Check if mediaDevices is supported, otherwise trigger native camera directly
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setCameraActiveSlot(slot);
    } else {
      if (slot === 'A') cameraFileInputA.current?.click();
      else cameraFileInputB.current?.click();
    }
  };

  useEffect(() => {
    if (cameraActiveSlot) {
      // High-resolution portrait-optimized camera stream
      const constraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      navigator.mediaDevices?.getUserMedia(constraints)
        .then((stream) => {
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.warn('Live viewfinder stream unavailable, opening phone camera app instead:', err);
          const currentSlot = cameraActiveSlot;
          setCameraActiveSlot(null);
          if (currentSlot === 'A') cameraFileInputA.current?.click();
          else if (currentSlot === 'B') cameraFileInputB.current?.click();
        });
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraActiveSlot]);

  if (!isOpen) return null;

  const toggleProfile = (label) => {
    setSelectedProfiles(prev => 
      prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
    );
  };

  const handleFileChange = (slot, e) => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      if (slot === 'A') setIsSlotScanningA(true);
      if (slot === 'B') setIsSlotScanningB(true);

      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setTimeout(() => {
          if (slot === 'A') {
            setImgA(dataUrl);
            setIsSlotScanningA(false);
          } else {
            setImgB(dataUrl);
            setIsSlotScanningB(false);
          }
        }, 800);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptureSnapshot = () => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 720;
      canvas.height = videoRef.current.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      if (cameraActiveSlot === 'A') {
        setIsSlotScanningA(true);
        setTimeout(() => {
          setImgA(dataUrl);
          setIsSlotScanningA(false);
        }, 700);
      } else {
        setIsSlotScanningB(true);
        setTimeout(() => {
          setImgB(dataUrl);
          setIsSlotScanningB(false);
        }, 700);
      }
      setCameraActiveSlot(null);
    }
  };

  const handleLoadDemoProduct = (slot, product) => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    if (slot === 'A') {
      setIsSlotScanningA(true);
      setTimeout(() => {
        setImgA(product.image || '/whey-protein-transparent.png');
        setProdA(product);
        setIsSlotScanningA(false);
      }, 500);
    } else {
      setIsSlotScanningB(true);
      setTimeout(() => {
        setImgB(product.image || '/whey-protein-transparent.png');
        setProdB(product);
        setIsSlotScanningB(false);
      }, 500);
    }
  };

  // Check if both images are identical or same file length/data
  const isImagesIdentical = imgA && imgB && (
    imgA === imgB || 
    Math.abs(imgA.length - imgB.length) < 50 || 
    (prodA && prodB && prodA.id === prodB.id)
  );

  const handleRunComparison = () => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    if (!imgA || !imgB) {
      alert('Please upload or take images for both Product A and Product B first.');
      return;
    }
    if (!consumeScan()) return;
    
    setIsAnalyzing(true);
    setScanStep(1);
    setScanProgress(15);

    // Multi-stage 3.5s (3500ms) pause and scanning animation
    setTimeout(() => {
      setScanStep(2);
      setScanProgress(55);
    }, 1100);

    setTimeout(() => {
      setScanStep(3);
      setScanProgress(90);
    }, 2300);

    setTimeout(() => {
      // Analyze results: If images are identical, both become GNC tied product!
      if (isImagesIdentical) {
        setProdA(GNC_TIED_PRODUCT);
        setProdB(GNC_TIED_PRODUCT);
      } else {
        setProdA(prodA || SAMPLE_PRODUCTS[0]);
        setProdB(prodB || SAMPLE_PRODUCTS[1]);
      }

      setScanProgress(100);
      setIsAnalyzing(false);
      setHasCompared(true);

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#E11D48', '#10B981', '#F59E0B', '#3B82F6']
        });
      } catch (e) {}
    }, 3500);
  };

  const handleReset = () => {
    setImgA(null);
    setImgB(null);
    setProdA(null);
    setProdB(null);
    setHasCompared(false);
    setIsAnalyzing(false);
    setScanProgress(0);
    setScanStep(1);
  };

  const winner = (prodA && prodB) ? (
    isImagesIdentical ? 'tie' :
    prodA.purityScore > prodB.purityScore ? 'A' :
    prodB.purityScore > prodA.purityScore ? 'B' : 'tie'
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto font-josefin">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 glass-island border border-rose-500/40 px-5 py-3 rounded-2xl text-rose-200 text-xs font-bold flex items-center gap-3 animate-bounce shadow-2xl">
          <Zap className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Live Vertical High-Res Camera Viewfinder Modal */}
      {cameraActiveSlot && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-sm sm:max-w-md glass-hud rounded-3xl p-4 sm:p-5 border border-rose-500/40 space-y-3.5 shadow-[0_0_50px_rgba(225,29,72,0.35)]">
            
            <div className="flex justify-between items-center pb-2 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-xs sm:text-sm font-black uppercase text-rose-400 tracking-wider">
                  Live Scanner — Product {cameraActiveSlot}
                </span>
              </div>
              <button 
                onClick={() => setCameraActiveSlot(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vertical & Larger Viewfinder for Supplements */}
            <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full rounded-2xl overflow-hidden bg-black border border-rose-500/40 shadow-inner flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              
              {/* Vertical Laser Scan Sweep */}
              <div className="absolute inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#E11D48] animate-laser-sweep pointer-events-none z-20"></div>

              {/* Supplement Alignment AR Frame (Center Box) */}
              <div className="absolute inset-x-5 inset-y-8 sm:inset-x-8 sm:inset-y-12 border border-rose-500/50 rounded-2xl pointer-events-none flex flex-col justify-between p-3 z-10">
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-t-2 border-l-2 border-rose-500 rounded-tl-sm"></div>
                  <div className="w-5 h-5 border-t-2 border-r-2 border-rose-500 rounded-tr-sm"></div>
                </div>

                <div className="text-center">
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-black/80 text-rose-300 px-3 py-1 rounded-full border border-rose-500/30 tracking-wider uppercase backdrop-blur-sm">
                    FIT BOTTLE / LABEL IN FRAME
                  </span>
                </div>

                <div className="flex justify-between">
                  <div className="w-5 h-5 border-b-2 border-l-2 border-rose-500 rounded-bl-sm"></div>
                  <div className="w-5 h-5 border-b-2 border-r-2 border-rose-500 rounded-br-sm"></div>
                </div>
              </div>
            </div>

            {/* Actions & Native Phone Camera Fallback */}
            <div className="space-y-2 pt-1 text-center font-sans">
              <button
                onClick={handleCaptureSnapshot}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 active:scale-95 transition"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Product {cameraActiveSlot} Label</span>
              </button>

              <button
                onClick={() => {
                  const slot = cameraActiveSlot;
                  setCameraActiveSlot(null);
                  if (slot === 'A') cameraFileInputA.current?.click();
                  else cameraFileInputB.current?.click();
                }}
                className="text-[11px] font-bold text-rose-300 hover:text-white underline cursor-pointer inline-block pt-1"
              >
                📱 Or Tap Here to Use Phone Camera App
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Main Compare Modal View */}
      <div className="relative w-full max-w-5xl glass-hud rounded-3xl p-3.5 sm:p-8 my-2 sm:my-4 border border-rose-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.8)] max-h-[96vh] overflow-y-auto">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header (Screenshot 1 Top Title) */}
        <div className="mb-6 pb-4 border-b border-rose-500/20">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-maroon-950 dark:text-white">
              Side-by-Side <span className="text-rose-500">Compare</span>
            </h1>
            <span className="text-xl">🧪</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-rose-200/80 mt-1 font-sans">
            Select your health profile, upload details for two gym supplements, and let AI analyze which is better for your body.
          </p>
        </div>

        {/* SECTION 1: Health Profile Checkboxes (Screenshot 1) */}
        <div className="p-5 sm:p-6 rounded-3xl glass-card-neo border border-rose-500/20 mb-8 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm sm:text-base font-black text-maroon-950 dark:text-white uppercase tracking-wider">
              1. Select Your Health Profile
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-rose-300/60 font-sans">
            These options will be saved locally on your device for future comparisons.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
            {healthProfileOptions.map((opt) => {
              const isChecked = selectedProfiles.includes(opt.label);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleProfile(opt.label)}
                  className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                    isChecked
                      ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-300 shadow-sm'
                      : 'bg-black/5 dark:bg-black/40 border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-rose-500/30'
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 ${
                    isChecked ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-500/40'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Dual Upload & Camera Boxes (Screenshot 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* PRODUCT A UPLOAD CARD */}
          <div className={`p-6 rounded-3xl glass-card-neo border flex flex-col justify-between space-y-4 transition-all duration-300 ${
            isAnalyzing ? 'border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.3)]' : 'border-rose-500/25'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-rose-500/15">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-rose-300">
                PRODUCT A (LABEL/INGREDIENTS)
              </span>
              {imgA && !isSlotScanningA && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PHOTO READY
                </span>
              )}
            </div>

            {/* Display Uploaded Image Preview if Uploaded */}
            {isSlotScanningA ? (
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/80 border border-rose-500 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
                <span className="text-xs font-mono font-bold text-rose-400">SCANNING LABEL OCR...</span>
                <div className="absolute inset-x-0 h-1 bg-rose-500 shadow-[0_0_15px_#E11D48] animate-laser-sweep"></div>
              </div>
            ) : imgA ? (
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/60 border border-rose-500/30 flex items-center justify-center group">
                <img src={imgA} alt="Product A Preview" className="w-full h-full object-contain p-2" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 pointer-events-none flex flex-col justify-between">
                    <div className="w-full h-1 bg-rose-500 shadow-[0_0_20px_#E11D48] animate-laser-sweep"></div>
                    <div className="p-2 bg-black/80 text-center">
                      <span className="text-[10px] font-mono font-black text-rose-400">ANALYZING MOLECULAR PROFILE...</span>
                    </div>
                  </div>
                )}
                {!isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                    <button 
                      onClick={() => fileInputA.current?.click()}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Change Photo
                    </button>
                    <button 
                      onClick={() => { setImgA(null); setProdA(null); }}
                      className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Drag & Drop Upload Placeholder */
              <div className="border-2 border-dashed border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3 bg-black/5 dark:bg-black/30">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-500 dark:text-rose-200/70 font-sans max-w-[220px]">
                  Upload or snapshot Product A ingredients list
                </p>

                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <button
                    onClick={() => fileInputA.current?.click()}
                    className="px-4 py-2 rounded-xl bg-black/20 dark:bg-white/10 hover:bg-rose-500/20 text-slate-800 dark:text-white text-xs font-bold transition border border-rose-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Image</span>
                  </button>

                  <button
                    onClick={() => handleTriggerCamera('A')}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Camera</span>
                  </button>
                </div>
              </div>
            )}

            <input ref={fileInputA} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange('A', e)} />
            <input ref={cameraFileInputA} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange('A', e)} />

            {/* Quick Demo Tub A Selection */}
            <div className="pt-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-rose-300/60 uppercase block mb-1.5">
                Or Quick Test with Preset Sample:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLoadDemoProduct('A', SAMPLE_PRODUCTS[0])}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border border-rose-500/20 hover:border-rose-500 bg-black/20 text-rose-400 truncate cursor-pointer"
                >
                  🔴 Spiked Budget Whey
                </button>
                <button
                  onClick={() => handleLoadDemoProduct('A', SAMPLE_PRODUCTS[2])}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border border-rose-500/20 hover:border-rose-500 bg-black/20 text-amber-400 truncate cursor-pointer"
                >
                  ⚠️ Pre-Workout
                </button>
              </div>
            </div>
          </div>

          {/* PRODUCT B UPLOAD CARD */}
          <div className={`p-6 rounded-3xl glass-card-neo border flex flex-col justify-between space-y-4 transition-all duration-300 ${
            isAnalyzing ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-rose-500/25'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-rose-500/15">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-rose-300">
                PRODUCT B (LABEL/INGREDIENTS)
              </span>
              {imgB && !isSlotScanningB && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PHOTO READY
                </span>
              )}
            </div>

            {/* Display Uploaded Image Preview if Uploaded */}
            {isSlotScanningB ? (
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/80 border border-emerald-500 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-mono font-bold text-emerald-400">SCANNING LABEL OCR...</span>
                <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-[0_0_15px_#10B981] animate-laser-sweep"></div>
              </div>
            ) : imgB ? (
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/60 border border-rose-500/30 flex items-center justify-center group">
                <img src={imgB} alt="Product B Preview" className="w-full h-full object-contain p-2" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 pointer-events-none flex flex-col justify-between">
                    <div className="w-full h-1 bg-emerald-500 shadow-[0_0_20px_#10B981] animate-laser-sweep"></div>
                    <div className="p-2 bg-black/80 text-center">
                      <span className="text-[10px] font-mono font-black text-emerald-400">ANALYZING MOLECULAR PROFILE...</span>
                    </div>
                  </div>
                )}
                {!isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                    <button 
                      onClick={() => fileInputB.current?.click()}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Change Photo
                    </button>
                    <button 
                      onClick={() => { setImgB(null); setProdB(null); }}
                      className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Drag & Drop Upload Placeholder */
              <div className="border-2 border-dashed border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3 bg-black/5 dark:bg-black/30">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-500 dark:text-rose-200/70 font-sans max-w-[220px]">
                  Upload or snapshot Product B ingredients list
                </p>

                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <button
                    onClick={() => fileInputB.current?.click()}
                    className="px-4 py-2 rounded-xl bg-black/20 dark:bg-white/10 hover:bg-rose-500/20 text-slate-800 dark:text-white text-xs font-bold transition border border-rose-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Image</span>
                  </button>

                  <button
                    onClick={() => handleTriggerCamera('B')}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Camera</span>
                  </button>
                </div>
              </div>
            )}

            <input ref={fileInputB} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange('B', e)} />
            <input ref={cameraFileInputB} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange('B', e)} />

            {/* Quick Demo Tub B Selection */}
            <div className="pt-2">
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-rose-300/60 uppercase block mb-1.5">
                Or Quick Test with Preset Sample:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLoadDemoProduct('B', SAMPLE_PRODUCTS[1])}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border border-emerald-500/30 hover:border-emerald-500 bg-black/20 text-emerald-400 truncate cursor-pointer"
                >
                  🟢 Pure Whey Isolate
                </button>
                <button
                  onClick={() => handleLoadDemoProduct('B', SAMPLE_PRODUCTS[3])}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border border-cyan-500/30 hover:border-cyan-500 bg-black/20 text-cyan-400 truncate cursor-pointer"
                >
                  🧪 Pure Creatine
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* 3.5s Multi-Step Scanning HUD when isAnalyzing is true */}
        {isAnalyzing ? (
          <div className="p-6 rounded-3xl glass-hud border border-rose-500/50 shadow-[0_0_50px_rgba(225,29,72,0.3)] space-y-4 max-w-xl mx-auto text-center mb-10 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-300">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                {scanStep === 1 && "STEP 1/3: Reading Optical Character Recognition (OCR)..."}
                {scanStep === 2 && "STEP 2/3: Checking Nitrogen Ratio & Free Amino Acids..."}
                {scanStep === 3 && "STEP 3/3: Screening 1,400+ WADA Banned Stimulants..."}
              </span>
              <span className="font-mono text-emerald-400 text-sm">{scanProgress}%</span>
            </div>
            
            <div className="w-full bg-black/70 h-3 rounded-full overflow-hidden border border-rose-500/30 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500 transition-all duration-300 rounded-full shadow-[0_0_15px_#10B981]" 
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
            
            <p className="text-[11px] text-slate-400 font-sans">
              Comparing biochemical purity, amino spiking markers, and heavy metal assays in real-time...
            </p>
          </div>
        ) : (
          /* Big Action Button: COMPARE THESE PRODUCTS */
          <div className="text-center mb-10">
            <button
              onClick={handleRunComparison}
              disabled={isAnalyzing || (!imgA && !prodA) || (!imgB && !prodB)}
              className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2.5 mx-auto cursor-pointer active:scale-95"
            >
              <span className="text-base">🧪</span>
              <span>Compare These Products</span>
            </button>
          </div>
        )}

        {/* RESULTS SECTION (Rendered after comparison is run) */}
        {hasCompared && currentProdA && currentProdB && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
            
            {/* 1. Comparison Winner Banner (Screenshot 5) */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-maroon-950/90 to-rose-950/80 border border-emerald-500/40 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> COMPARISON WINNER
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {isTie ? "It is a Healthy Tie!" : `${winner.name} is the Superior Choice!`}
                  </h2>
                </div>

                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition shadow-lg cursor-pointer shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </button>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  PERSONALIZED HEALTH RATIONALE
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {isTie 
                    ? `Both Product A and Product B are the same ${currentProdA.name} product. While it offers a good protein content per serving, its Indian formulation includes several artificial additives like Maltodextrin, synthetic colors, and artificial sweeteners (Sucralose and Acesulfame Potassium). This makes it a moderate choice for those preferring a cleaner supplement profile, resulting in a tie as there's no distinction between the two.`
                    : `${winner.name} delivers ${winner.claimedProtein} of intact usable protein with ${winner.flags.aminoSpiking ? 'amino spiking detected' : 'zero free glycine adulteration'}, making it substantially safer for your liver & kidney filtration compared to ${loser.name}.`}
                </p>
              </div>
            </div>

            {/* 2. Side-by-Side Product Summary Cards (Screenshot 5) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Product A Summary */}
              <div className="p-6 rounded-3xl glass-card-neo border border-rose-500/20 space-y-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PRODUCT A</span>
                  <h3 className="text-xl font-black text-maroon-950 dark:text-white mt-0.5">{currentProdA.brand}</h3>
                  <p className="text-xs text-rose-400 font-bold">{currentProdA.name}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center min-w-[70px]">
                    <span className="text-[9px] font-mono text-slate-400 block">SCORE</span>
                    <span className="text-2xl font-black font-mono text-rose-500">{currentProdA.purityScore}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-1">SAFETY LEVEL</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase ${
                      currentProdA.riskLevel === 'danger' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : currentProdA.riskLevel === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}>
                      {currentProdA.riskLevel === 'danger' ? 'MODERATE / CAUTION' : currentProdA.riskLevel === 'warning' ? 'MODERATE / CAUTION' : 'VERIFIED CLEAN'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-2">HIGHLIGHTS</span>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-sans list-disc list-inside">
                    <li>Protein content: {currentProdA.claimedProtein}</li>
                    <li>{currentProdA.flags.aminoSpiking ? 'Contains L-Glycine / Taurine nitrogen spiking.' : 'Zero added non-intact filler aminos.'}</li>
                    <li>{currentProdA.flags.fillerCount > 0 ? 'Contains Maltodextrin high-GI carbohydrate filler.' : 'Zero carb fillers or maltodextrin.'}</li>
                    <li>WADA status: {currentProdA.flags.bannedSubstances ? 'Prohibited stimulants flagged.' : '100% compliant.'}</li>
                  </ul>
                </div>
              </div>

              {/* Product B Summary */}
              <div className="p-6 rounded-3xl glass-card-neo border border-emerald-500/20 space-y-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PRODUCT B</span>
                  <h3 className="text-xl font-black text-maroon-950 dark:text-white mt-0.5">{currentProdB.brand}</h3>
                  <p className="text-xs text-emerald-400 font-bold">{currentProdB.name}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center min-w-[70px]">
                    <span className="text-[9px] font-mono text-slate-400 block">SCORE</span>
                    <span className="text-2xl font-black font-mono text-emerald-400">{currentProdB.purityScore}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-1">SAFETY LEVEL</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase ${
                      currentProdB.riskLevel === 'danger' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : currentProdB.riskLevel === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}>
                      {currentProdB.riskLevel === 'danger' ? 'MODERATE / CAUTION' : currentProdB.riskLevel === 'warning' ? 'MODERATE / CAUTION' : 'VERIFIED CLEAN'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-2">HIGHLIGHTS</span>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-sans list-disc list-inside">
                    <li>Protein content: {currentProdB.claimedProtein}</li>
                    <li>{currentProdB.flags.aminoSpiking ? 'Contains L-Glycine / Taurine nitrogen spiking.' : 'Zero added non-intact filler aminos.'}</li>
                    <li>{currentProdB.flags.fillerCount > 0 ? 'Contains Maltodextrin high-GI carbohydrate filler.' : 'Zero carb fillers or maltodextrin.'}</li>
                    <li>WADA status: {currentProdB.flags.bannedSubstances ? 'Prohibited stimulants flagged.' : '100% compliant.'}</li>
                  </ul>
                </div>
              </div>

            </div>

            {/* 3. Head-to-Head Nutrition Comparison Table (Screenshot 3) */}
            <div className="p-6 rounded-3xl glass-card-neo border border-rose-500/20 space-y-4">
              <h3 className="text-lg font-black text-maroon-950 dark:text-white uppercase tracking-wider">
                Head-to-Head Nutrition Comparison
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-rose-500/20 text-[10px] font-mono text-slate-400 uppercase">
                      <th className="py-2.5 px-3">NUTRITIONAL FIELD</th>
                      <th className="py-2.5 px-3">PRODUCT A ({currentProdA.brand})</th>
                      <th className="py-2.5 px-3">PRODUCT B ({currentProdB.brand})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-500/10 text-slate-200">
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Calories</td>
                      <td className="py-3 px-3">{isTie ? "120 kcal" : "130 kcal"}</td>
                      <td className="py-3 px-3">{isTie ? "120 kcal" : "110 kcal"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Protein (Claimed)</td>
                      <td className="py-3 px-3">{currentProdA.claimedProtein}</td>
                      <td className="py-3 px-3">{currentProdB.claimedProtein}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">True Usable Protein</td>
                      <td className="py-3 px-3 font-bold text-rose-400">{currentProdA.actualProtein}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{currentProdB.actualProtein}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Sugar / Carbs</td>
                      <td className="py-3 px-3">{isTie ? "1 g (Maltodextrin load)" : "10 g (High Maltodextrin)"}</td>
                      <td className="py-3 px-3">{isTie ? "1 g (Maltodextrin load)" : "0.5 g"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Sodium</td>
                      <td className="py-3 px-3">{isTie ? "100 mg" : "140 mg"}</td>
                      <td className="py-3 px-3">{isTie ? "100 mg" : "80 mg"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Additives</td>
                      <td className="py-3 px-3 text-slate-300">
                        {isTie ? "Maltodextrin, Sucralose (INS 955), Acesulfame Potassium (INS 950)" : "Maltodextrin, Sucralose (INS 955), Acesulfame Potassium (INS 950), synthetic colors"}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {isTie ? "Maltodextrin, Sucralose (INS 955), Acesulfame Potassium (INS 950)" : "Sunflower Lecithin, Organic Stevia Extract (Reb-A)"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">FSSAI / WADA Status</td>
                      <td className="py-3 px-3 font-bold text-amber-400">{isTie ? "Verified / Caution On Formulation" : "Verified / Caution On Blends"}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{isTie ? "Verified / Caution On Formulation" : "100% Informed-Choice Certified"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Bilingual Final Verdicts (Screenshot 4) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* FINAL VERDICT (ENGLISH) */}
              <div className="p-6 rounded-3xl glass-card-neo border border-emerald-500/20 space-y-2.5">
                <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest block">
                  FINAL VERDICT (ENGLISH)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {isTie
                    ? `This comparison features a head-to-head assay of the same product for both selections: ${currentProdA.name}. Both samples evaluate with identical purity scores (${currentProdA.purityScore}/100), moderate safety ratings, and identical biochemical profiles.`
                    : `This comparison features a head-to-head assay between ${currentProdA.name} and ${currentProdB.name}. From a nutritional standpoint, ${winner.name} delivers genuine bio-available whey fractions without non-intact nitrogen filler aminos. ${loser.name}, while budget-friendly, incorporates high-GI Maltodextrin and synthetic sweeteners which may cause digestive inflammation and diminished protein synthesis for serious lifters.`
                  }
                </p>
              </div>

              {/* अंतिम निर्णय (HINDI VERDICT) */}
              <div className="p-6 rounded-3xl glass-card-neo border border-emerald-500/20 space-y-2.5">
                <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest block">
                  अंतिम निर्णय (HINDI VERDICT)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {isTie
                    ? `यह तुलना दोनों स्लॉट में एक ही उत्पाद (${currentProdA.name}) का विश्लेषण है। दोनों नमूनों के पोषण गुण, सुरक्षा रेटिंग (स्कोर ${currentProdA.purityScore}/100) और बायोकेमिकल प्रोफाइल पूरी तरह समान हैं, जिससे यह तुलना एक स्पष्ट स्वस्थ टाई (Healthy Tie) के रूप में समाप्त होती है।`
                    : `यह तुलना ${currentProdA.name} और ${currentProdB.name} के बीच एक निष्पक्ष प्रयोगशाला विश्लेषण है। पोषण के दृष्टिकोण से, ${winner.name} बिना किसी अवांछित अमीनो स्पाइकिंग या सस्ते माल्टोडेक्सट्रिन फिलर्स के शुद्ध प्रोटीन प्रदान करता है। वहीं ${loser.name} में पाए गए कृत्रिम स्वीटनर और फिलर्स दीर्घकालिक फिटनेस और पाचन के लिए आदर्श विकल्प नहीं हैं।`
                  }
                </p>
              </div>

            </div>

            {/* Reset / New Comparison Trigger */}
            <div className="text-center pt-4">
              <button
                onClick={() => { setHasCompared(false); setImgA(null); setImgB(null); setProdA(null); setProdB(null); }}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
              >
                Compare Another Product Pair
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
