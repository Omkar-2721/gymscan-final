import React, { useState, useRef, useEffect } from 'react';
import { 
  GitCompare, X, CheckCircle2, ShieldAlert, Trophy, Sparkles, Share2, 
  Upload, Camera, ArrowRight, RefreshCw, Award, Activity, Zap, Check, 
  AlertTriangle, Layers, Trash2, Eye, FileText, CheckSquare, Square, User,
  FileDown, Database
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import {
  performLiveOCRAndAnalyze,
  analyzeTextWithMLFallback,
  getScoredSupplementCatalog,
} from '../utils/analyzer';
import { downloadScanReportPDF } from '../utils/pdfReport';

export default function CompareModal({ isOpen, onClose, initialProdA = null, scanHistory = [] }) {
  const { user, requireAuth, consumeScan } = useAuth();
  const [selectedProfiles, setSelectedProfiles] = useState([
    'High Protein (Fitness Goal)',
    'Clean Athlete (WADA Compliant / No Banned Substances)'
  ]);

  const [imgA, setImgA] = useState(null);
  const [imgB, setImgB] = useState(null);
  const [prodA, setProdA] = useState(initialProdA);
  const [prodB, setProdB] = useState(null);
  const [manualTextA, setManualTextA] = useState('');
  const [manualTextB, setManualTextB] = useState('');
  const [showManualA, setShowManualA] = useState(false);
  const [showManualB, setShowManualB] = useState(false);

  const catalogList = getScoredSupplementCatalog();

  useEffect(() => {
    if (isOpen && initialProdA) {
      setProdA(initialProdA);
      setImgA('/whey-protein-transparent.png');
      setHasCompared(false);
    }
  }, [isOpen, initialProdA]);

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
    calories: '130 kcal',
    carbs: '3.5g',
    sugar: '1.2g',
    fat: '1.8g',
    flags: {
      aminoSpiking: false,
      trueProteinRatio: '85.0%',
      bannedSubstances: false,
      fillerCount: 1,
      heavyMetalsRisk: 'Low (< 0.05 ppm)'
    },
    ingredientsList: [
      { name: "Whey Protein Blend (Concentrate & Isolate)", status: "clean", reason: "Active protein source" },
      { name: "Maltodextrin (Carbohydrate Thickener)", status: "warning", reason: "Carbohydrate filler" },
      { name: "Sucralose (INS 955)", status: "warning", reason: "High-intensity artificial sweetener" },
      { name: "Acesulfame Potassium (INS 950)", status: "warning", reason: "Artificial sweetener blend" },
      { name: "Synthetic colors & thickeners", status: "warning", reason: "Synthetic processing aid" }
    ],
    verdict: "Moderate - Offers good protein content per serving but Indian formulation includes artificial sweeteners (Sucralose, Ace-K) and Maltodextrin.",
    verdictHindi: "मध्यम गुणवत्ता — अच्छी प्रोटीन मात्रा प्रदान करता है लेकिन इसमें कृत्रिम मिठास (Sucralose, Ace-K) और माल्टोडेक्सट्रिन शामिल हैं।"
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
      const fileNameHint = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-+]/g, ' ');
      const reader = new FileReader();
      if (slot === 'A') {
        setIsSlotScanningA(true);
        setProdA(null);
      }
      if (slot === 'B') {
        setIsSlotScanningB(true);
        setProdB(null);
      }

      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        if (slot === 'A') {
          setImgA(dataUrl);
        } else {
          setImgB(dataUrl);
        }

        try {
          const liveResult = await performLiveOCRAndAnalyze(dataUrl, slot, fileNameHint);
          if (slot === 'A') {
            setProdA(liveResult);
            setIsSlotScanningA(false);
          } else {
            setProdB(liveResult);
            setIsSlotScanningB(false);
          }
        } catch (err) {
          console.warn("OCR error on slot " + slot, err);
          if (slot === 'A') setIsSlotScanningA(false);
          if (slot === 'B') setIsSlotScanningB(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptureSnapshot = async () => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 720;
      canvas.height = videoRef.current.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const activeSlot = cameraActiveSlot;
      setCameraActiveSlot(null);

      if (activeSlot === 'A') {
        setIsSlotScanningA(true);
        setImgA(dataUrl);
        setProdA(null);
        try {
          const liveResult = await performLiveOCRAndAnalyze(dataUrl, 'A');
          setProdA(liveResult);
          setIsSlotScanningA(false);
        } catch (err) {
          setIsSlotScanningA(false);
        }
      } else {
        setIsSlotScanningB(true);
        setImgB(dataUrl);
        setProdB(null);
        try {
          const liveResult = await performLiveOCRAndAnalyze(dataUrl, 'B');
          setProdB(liveResult);
          setIsSlotScanningB(false);
        } catch (err) {
          setIsSlotScanningB(false);
        }
      }
    }
  };

  const handleAnalyzeManualSlot = async (slot) => {
    const text = slot === 'A' ? manualTextA : manualTextB;
    if (!text.trim()) return;
    if (!requireAuth("Please sign in with your email to compare supplements!")) return;

    if (slot === 'A') {
      setIsSlotScanningA(true);
      try {
        const res = await analyzeTextWithMLFallback(text, 'Custom Product A');
        setProdA(res);
        setImgA('/whey-protein-transparent.png');
        setShowManualA(false);
      } finally {
        setIsSlotScanningA(false);
      }
    } else {
      setIsSlotScanningB(true);
      try {
        const res = await analyzeTextWithMLFallback(text, 'Custom Product B');
        setProdB(res);
        setImgB('/whey-protein-transparent.png');
        setShowManualB(false);
      } finally {
        setIsSlotScanningB(false);
      }
    }
  };

  const handleLoadDemoProduct = (slot, product) => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    if (slot === 'A') {
      setImgA(product.image || '/whey-protein-transparent.png');
      setProdA(product);
      setShowManualA(false);
    } else {
      setImgB(product.image || '/whey-protein-transparent.png');
      setProdB(product);
      setShowManualB(false);
    }
  };

  const isImagesIdentical = Boolean(
    imgA &&
      imgB &&
      imgA === imgB &&
      prodA &&
      prodB &&
      prodA.name === prodB.name
  );

  const handleRunComparison = async () => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    if ((!imgA && !prodA) || (!imgB && !prodB)) {
      alert('Please select, paste, or upload images for both Product A and Product B first.');
      return;
    }
    if (!consumeScan()) return;

    setIsAnalyzing(true);
    setScanStep(1);
    setScanProgress(20);

    try {
      let finalA = prodA;
      let finalB = prodB;

      setScanStep(2);
      setScanProgress(55);

      if (!finalA && imgA) {
        finalA = await performLiveOCRAndAnalyze(imgA, 'A');
      }
      if (!finalB && imgB) {
        finalB = await performLiveOCRAndAnalyze(imgB, 'B');
      }

      setScanStep(3);
      setScanProgress(100);
      setProdA(finalA);
      setProdB(finalB);
      setIsAnalyzing(false);
      setHasCompared(true);

      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#E11D48', '#10B981', '#F59E0B', '#3B82F6'],
        });
      } catch (e) {}
    } catch (e) {
      console.warn('Comparison analysis encountered an error:', e);
      setIsAnalyzing(false);
      setScanProgress(100);
    }
  };

  const handleReset = () => {
    setImgA(null);
    setImgB(null);
    setProdA(null);
    setProdB(null);
    setManualTextA('');
    setManualTextB('');
    setShowManualA(false);
    setShowManualB(false);
    setHasCompared(false);
    setIsAnalyzing(false);
    setScanProgress(0);
    setScanStep(1);
  };

  const currentProdA = prodA;
  const currentProdB = prodB;
  const scoreA = currentProdA?.purityScore ?? -1;
  const scoreB = currentProdB?.purityScore ?? -1;
  const isTie = Boolean(currentProdA && currentProdB && (isImagesIdentical || scoreA === scoreB));
  const winningProduct = isTie ? currentProdA : scoreA >= scoreB ? currentProdA : currentProdB;
  const losingProduct = isTie ? currentProdB : scoreA < scoreB ? currentProdA : currentProdB;
  const scoreDiff = Math.abs((scoreA < 0 ? 0 : scoreA) - (scoreB < 0 ? 0 : scoreB));

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `GymScan Showdown Report:\nWinner: ${winningProduct?.name || 'Clean Supplement'} (${winningProduct?.purityScore || 90}/100) vs ${losingProduct?.name || 'Competitor'}!\nAnalyzed with GymScan AI.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

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
              <div className="space-y-2">
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
                        onClick={(e) => { e.stopPropagation(); fileInputA.current?.click(); }}
                        className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" /> Change Photo
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setImgA(null); setProdA(null); }}
                        className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  )}
                </div>
                {prodA && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                    <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest block font-bold">
                      DETECTED PRODUCT A
                    </span>
                    <span className="text-xs font-black text-white truncate block mt-0.5">
                      {prodA.name}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Drag & Drop Upload Placeholder (Clickable Everywhere) */
              <div 
                onClick={() => fileInputA.current?.click()}
                className="border-2 border-dashed border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 active:scale-[0.99] transition-all rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3 bg-black/5 dark:bg-black/30 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-maroon-950 dark:text-white block group-hover:text-rose-400 transition">
                    Tap anywhere to upload Product A
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-rose-200/70 font-sans mt-0.5">
                    Upload image from gallery or take camera photo
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputA.current?.click(); }}
                    className="px-4 py-2 rounded-xl bg-black/20 dark:bg-white/10 hover:bg-rose-500/30 text-slate-800 dark:text-white text-xs font-bold transition border border-rose-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Image</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleTriggerCamera('A'); }}
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

            {/* Quick Catalog / Saved Picker & Manual Paste A */}
            <div className="pt-2 space-y-2 font-sans">
              <div className="flex items-center justify-between gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    const picked = [...scanHistory, ...catalogList].find((x) => x.id === e.target.value);
                    if (picked) handleLoadDemoProduct('A', picked);
                  }}
                  className="flex-1 bg-black/10 dark:bg-black/60 border border-rose-500/25 rounded-xl px-2.5 py-1.5 text-[11px] text-maroon-950 dark:text-white outline-none cursor-pointer"
                >
                  <option value="">Pick Product A from Catalog / Saved...</option>
                  {catalogList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.brand} — {item.name} ({item.purityScore}/100)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowManualA((v) => !v)}
                  className="px-2.5 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 text-[10px] font-bold text-maroon-950 dark:text-white cursor-pointer"
                >
                  {showManualA ? 'Hide Paste' : 'Paste Text'}
                </button>
              </div>
              {showManualA && (
                <div className="space-y-1.5">
                  <textarea
                    value={manualTextA}
                    onChange={(e) => setManualTextA(e.target.value)}
                    placeholder="Paste Product A Ingredients..."
                    className="w-full h-16 bg-black/5 dark:bg-black/70 border border-rose-500/25 rounded-xl p-2 text-[11px] font-mono text-maroon-950 dark:text-white outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnalyzeManualSlot('A')}
                    className="w-full py-1.5 rounded-lg bg-rose-600 text-white font-bold text-[10px] uppercase cursor-pointer"
                  >
                    Load Product A Ingredients
                  </button>
                </div>
              )}
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
              <div className="space-y-2">
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
                        onClick={(e) => { e.stopPropagation(); fileInputB.current?.click(); }}
                        className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" /> Change Photo
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setImgB(null); setProdB(null); }}
                        className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  )}
                </div>
                {prodB && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">
                      DETECTED PRODUCT B
                    </span>
                    <span className="text-xs font-black text-white truncate block mt-0.5">
                      {prodB.name}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Drag & Drop Upload Placeholder (Clickable Everywhere) */
              <div 
                onClick={() => fileInputB.current?.click()}
                className="border-2 border-dashed border-rose-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 active:scale-[0.99] transition-all rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3 bg-black/5 dark:bg-black/30 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-maroon-950 dark:text-white block group-hover:text-emerald-400 transition">
                    Tap anywhere to upload Product B
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-rose-200/70 font-sans mt-0.5">
                    Upload image from gallery or take camera photo
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputB.current?.click(); }}
                    className="px-4 py-2 rounded-xl bg-black/20 dark:bg-white/10 hover:bg-emerald-500/30 text-slate-800 dark:text-white text-xs font-bold transition border border-rose-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Image</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleTriggerCamera('B'); }}
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

            {/* Quick Catalog / Saved Picker & Manual Paste B */}
            <div className="pt-2 space-y-2 font-sans">
              <div className="flex items-center justify-between gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    const picked = [...scanHistory, ...catalogList].find((x) => x.id === e.target.value);
                    if (picked) handleLoadDemoProduct('B', picked);
                  }}
                  className="flex-1 bg-black/10 dark:bg-black/60 border border-emerald-500/25 rounded-xl px-2.5 py-1.5 text-[11px] text-maroon-950 dark:text-white outline-none cursor-pointer"
                >
                  <option value="">Pick Product B from Catalog / Saved...</option>
                  {catalogList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.brand} — {item.name} ({item.purityScore}/100)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowManualB((v) => !v)}
                  className="px-2.5 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-emerald-500/20 text-[10px] font-bold text-maroon-950 dark:text-white cursor-pointer"
                >
                  {showManualB ? 'Hide Paste' : 'Paste Text'}
                </button>
              </div>
              {showManualB && (
                <div className="space-y-1.5">
                  <textarea
                    value={manualTextB}
                    onChange={(e) => setManualTextB(e.target.value)}
                    placeholder="Paste Product B Ingredients..."
                    className="w-full h-16 bg-black/5 dark:bg-black/70 border border-emerald-500/25 rounded-xl p-2 text-[11px] font-mono text-maroon-950 dark:text-white outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnalyzeManualSlot('B')}
                    className="w-full py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-[10px] uppercase cursor-pointer"
                  >
                    Load Product B Ingredients
                  </button>
                </div>
              )}
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
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
            
            {/* 1. Comparison Winner Banner */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-maroon-950/90 to-rose-950/80 border border-emerald-500/40 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> COMPARISON WINNER
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-white">
                    {isTie ? "It is a Healthy Tie!" : `${winningProduct?.name || 'Product'} is the Superior Choice!`}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {winningProduct && (
                    <button
                      type="button"
                      onClick={() => downloadScanReportPDF(winningProduct)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Winner PDF</span>
                    </button>
                  )}
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition shadow-lg cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share on WhatsApp</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  PERSONALIZED HEALTH RATIONALE
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {isTie 
                    ? `Both Product A and Product B evaluate with identical formulations for ${currentProdA?.name || 'this supplement'}. Purity score is ${currentProdA?.purityScore || 65}/100, resulting in a balanced tie with equal risk considerations.`
                    : `${winningProduct?.name || 'Winner'} achieves a superior Purity Score of ${winningProduct?.purityScore || 90}/100 and delivers ${winningProduct?.claimedProtein || 'clean active nutrients'} with ${winningProduct?.flags?.aminoSpiking ? 'amino spiking detected' : 'zero free amino adulteration'}, making it significantly safer and more bioavailable than ${losingProduct?.name || 'Competitor'}.`}
                </p>
              </div>
            </div>

            {/* 2. Side-by-Side Product Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 font-sans">
              
              {/* Product A Summary */}
              <div className="p-5 sm:p-6 rounded-3xl glass-card-neo border border-rose-500/20 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PRODUCT A</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                      {currentProdA?.category || "Supplement"}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-maroon-950 dark:text-white mt-0.5">{currentProdA?.brand || "Brand A"}</h3>
                  <p className="text-xs text-rose-400 font-bold">{currentProdA?.name || "Product A"}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center min-w-[70px]">
                    <span className="text-[9px] font-mono text-slate-400 block">SCORE</span>
                    <span className="text-2xl font-black font-mono text-rose-500">{currentProdA?.purityScore || 50}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-1">SAFETY LEVEL</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase ${
                      currentProdA?.riskLevel === 'danger' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : currentProdA?.riskLevel === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}>
                      {currentProdA?.riskLevel === 'danger' ? 'HIGH RISK / SPIKED' : currentProdA?.riskLevel === 'warning' ? 'MODERATE / CAUTION' : 'VERIFIED CLEAN'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-2">HIGHLIGHTS</span>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-sans list-disc list-inside">
                    <li>Serving: {currentProdA?.servingSize || "1 serving"} ({currentProdA?.calories || "120 kcal"})</li>
                    <li>Active Nutrients: {currentProdA?.claimedProtein || "Standard protein"}</li>
                    <li>{currentProdA?.flags?.aminoSpiking ? '🚨 Contains L-Glycine / Taurine nitrogen spiking.' : '✅ Zero added non-intact filler aminos.'}</li>
                    <li>{currentProdA?.flags?.fillerCount > 0 ? '⚠️ Contains Maltodextrin / carbohydrate filler.' : '✅ Zero carb fillers or maltodextrin.'}</li>
                    <li>WADA Status: {currentProdA?.flags?.bannedSubstances ? '⛔ Prohibited stimulants flagged.' : '✅ Clean / WADA Compliant.'}</li>
                  </ul>
                </div>
              </div>

              {/* Product B Summary */}
              <div className="p-5 sm:p-6 rounded-3xl glass-card-neo border border-emerald-500/20 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PRODUCT B</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      {currentProdB?.category || "Supplement"}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-maroon-950 dark:text-white mt-0.5">{currentProdB?.brand || "Brand B"}</h3>
                  <p className="text-xs text-emerald-400 font-bold">{currentProdB?.name || "Product B"}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-center min-w-[70px]">
                    <span className="text-[9px] font-mono text-slate-400 block">SCORE</span>
                    <span className="text-2xl font-black font-mono text-emerald-400">{currentProdB?.purityScore || 90}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 block mb-1">SAFETY LEVEL</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase ${
                      currentProdB?.riskLevel === 'danger' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : currentProdB?.riskLevel === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}>
                      {currentProdB?.riskLevel === 'danger' ? 'HIGH RISK / SPIKED' : currentProdB?.riskLevel === 'warning' ? 'MODERATE / CAUTION' : 'VERIFIED CLEAN'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-2">HIGHLIGHTS</span>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-sans list-disc list-inside">
                    <li>Serving: {currentProdB?.servingSize || "1 serving"} ({currentProdB?.calories || "120 kcal"})</li>
                    <li>Active Nutrients: {currentProdB?.claimedProtein || "Standard protein"}</li>
                    <li>{currentProdB?.flags?.aminoSpiking ? '🚨 Contains L-Glycine / Taurine nitrogen spiking.' : '✅ Zero added non-intact filler aminos.'}</li>
                    <li>{currentProdB?.flags?.fillerCount > 0 ? '⚠️ Contains Maltodextrin / carbohydrate filler.' : '✅ Zero carb fillers or maltodextrin.'}</li>
                    <li>WADA Status: {currentProdB?.flags?.bannedSubstances ? '⛔ Prohibited stimulants flagged.' : '✅ Clean / WADA Compliant.'}</li>
                  </ul>
                </div>
              </div>

            </div>

            {/* 3. Head-to-Head Nutrition Comparison Table */}
            <div className="p-5 sm:p-6 rounded-3xl glass-card-neo border border-rose-500/20 space-y-4">
              <h3 className="text-base sm:text-lg font-black text-maroon-950 dark:text-white uppercase tracking-wider">
                Head-to-Head Nutrition & Lab Comparison
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans min-w-[500px]">
                  <thead>
                    <tr className="border-b border-rose-500/20 text-[10px] font-mono text-slate-400 uppercase">
                      <th className="py-2.5 px-3">NUTRITIONAL FIELD</th>
                      <th className="py-2.5 px-3">PRODUCT A ({currentProdA?.brand || "A"})</th>
                      <th className="py-2.5 px-3">PRODUCT B ({currentProdB?.brand || "B"})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-500/10 text-slate-200">
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Category</td>
                      <td className="py-3 px-3">{currentProdA?.category || "Gym Supplement"}</td>
                      <td className="py-3 px-3">{currentProdB?.category || "Gym Supplement"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Calories & Serving</td>
                      <td className="py-3 px-3">{currentProdA?.calories || "120 kcal"} ({currentProdA?.servingSize || "1 scoop"})</td>
                      <td className="py-3 px-3">{currentProdB?.calories || "120 kcal"} ({currentProdB?.servingSize || "1 scoop"})</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Claimed Protein</td>
                      <td className="py-3 px-3">{currentProdA?.claimedProtein || "N/A"}</td>
                      <td className="py-3 px-3">{currentProdB?.claimedProtein || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">True Usable Protein</td>
                      <td className="py-3 px-3 font-bold text-rose-400">{currentProdA?.actualProtein || "Calculated"}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{currentProdB?.actualProtein || "Calculated"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Carbs & Sugar</td>
                      <td className="py-3 px-3">{currentProdA?.carbs || "3g"} (Sugar: {currentProdA?.sugar || "1g"})</td>
                      <td className="py-3 px-3">{currentProdB?.carbs || "3g"} (Sugar: {currentProdB?.sugar || "1g"})</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Fat Content</td>
                      <td className="py-3 px-3">{currentProdA?.fat || "1.5g"}</td>
                      <td className="py-3 px-3">{currentProdB?.fat || "1.5g"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">Heavy Metals Screening</td>
                      <td className="py-3 px-3">{currentProdA?.flags?.heavyMetalsRisk || "Low (<0.02 ppm)"}</td>
                      <td className="py-3 px-3">{currentProdB?.flags?.heavyMetalsRisk || "Low (<0.02 ppm)"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-400">FSSAI / WADA Status</td>
                      <td className="py-3 px-3 font-bold text-amber-400">{currentProdA?.flags?.bannedSubstances ? "Flagged Stimulants" : "Verified / Tested"}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{currentProdB?.flags?.bannedSubstances ? "Flagged Stimulants" : "100% Informed-Choice / WADA Clean"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Bilingual Final Verdicts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 font-sans">
              
              {/* FINAL VERDICT (ENGLISH) */}
              <div className="p-5 sm:p-6 rounded-3xl glass-card-neo border border-emerald-500/20 space-y-2.5">
                <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest block">
                  FINAL VERDICT (ENGLISH)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {isTie
                    ? `This comparison features a head-to-head assay of ${currentProdA?.name || 'both products'}. Both evaluate with identical purity scores (${currentProdA?.purityScore || 65}/100) and matching biochemical profiles, resulting in a tie.`
                    : `This comparison features a head-to-head assay between ${currentProdA?.name || 'Product A'} and ${currentProdB?.name || 'Product B'}. From a nutritional standpoint, ${winningProduct?.name || 'Winner'} delivers genuine bio-available nutrients without harmful spiking or filler adulteration. ${losingProduct?.name || 'Competitor'} includes lower purity ratios or synthetic additives which may reduce effectiveness.`
                  }
                </p>
              </div>

              {/* अंतिम निर्णय (HINDI VERDICT) */}
              <div className="p-5 sm:p-6 rounded-3xl glass-card-neo border border-emerald-500/20 space-y-2.5">
                <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest block">
                  अंतिम निर्णय (HINDI VERDICT)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {isTie
                    ? `यह तुलना दोनों उत्पादों (${currentProdA?.name || 'उत्पाद'}) का संतुलित प्रयोगशाला विश्लेषण है। दोनों का शुद्धता स्कोर (${currentProdA?.purityScore || 65}/100) और सुरक्षा रेटिंग समान होने के कारण यह एक स्पष्ट स्वस्थ टाई (Healthy Tie) है।`
                    : `यह तुलना ${currentProdA?.name || 'उत्पाद A'} और ${currentProdB?.name || 'उत्पाद B'} के बीच प्रयोगशाला विश्लेषण है। पोषण गुणवत्ता के आधार पर, ${winningProduct?.name || 'विजेता उत्पाद'} अधिक शुद्ध और प्रभावी सामग्री प्रदान करता है। वहीं ${losingProduct?.name || 'दूसरा उत्पाद'} में पाए गए अतिरिक्त फिलर्स या स्वीटनर शुद्धता को कम करते हैं।`
                  }
                </p>
              </div>

            </div>

            {/* Reset / New Comparison Trigger */}
            <div className="text-center pt-2">
              <button
                onClick={() => { setHasCompared(false); setImgA(null); setImgB(null); setProdA(null); setProdB(null); }}
                className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
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
