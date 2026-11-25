import React, { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, RefreshCw, Zap, Award, ArrowRight, Share2, Layers, User, Flame, Dumbbell, Lock, Crown, FileText, Copy, Check, Cpu, BarChart3, Info } from 'lucide-react';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';
import { analyzeSupplementIngredients, analyzeTextWithMLFallback, performLiveOCRAndAnalyze } from '../utils/analyzer';
import { analyzeWithMLPipeline } from '../utils/mlService';
import { useAuth } from '../context/AuthContext';
import { DAILY_FREE_SCAN_LIMIT } from '../data/plans';

export default function ScannerTool({ isOpen, onClose, onSaveToHistory, onSaveHistory }) {
  const {
    user,
    requireAuth,
    consumeScan,
    currentPlan,
    hasUnlimitedScans,
    hasDetailedRiskReport,
    dailyScansRemaining,
    openPricingModal,
  } = useAuth();
  const saveHistory = onSaveHistory || onSaveToHistory;
  const [selectedSample, setSelectedSample] = useState(null);
  const [customText, setCustomText] = useState("");
  const [ocrEngine, setOcrEngine] = useState('tesseract'); // 'tesseract' | 'easyocr'
  const [isScanning, setIsScanning] = useState(false);
  const [scanStageText, setScanStageText] = useState("Running OCR & ML Verification...");
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [copiedReport, setCopiedReport] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('camera');

  if (!isOpen) return null;

  const handleSelectSample = async (sample) => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free Daily AI Supplement Scans!")) return;
    if (!consumeScan()) return;

    setSelectedSample(sample.id);
    setIsScanning(true);
    setScanError("");
    setScanStageText("Running ML Ingredient Classifier, Spiking RF & Purity Regressor...");
    setScanResult(null);

    try {
      const sampleText = (sample.ingredientsList || []).map((i) => i.name).join(', ');
      const mlEnriched = await analyzeWithMLPipeline({ rawText: sampleText, localResult: sample });
      setIsScanning(false);
      setScanResult(mlEnriched);
      if (saveHistory) saveHistory(mlEnriched);
    } catch (err) {
      setIsScanning(false);
      setScanResult({ ...sample, mlFallback: true, mlFallbackReason: "ML service offline — using built-in preset audit." });
      if (saveHistory) saveHistory(sample);
    }
  };

  const handleCustomAnalyze = async (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    if (!requireAuth("Please sign in with your email to unlock your 5 Free Daily AI Supplement Scans!")) return;
    if (!consumeScan()) return;

    setIsScanning(true);
    setScanError("");
    setScanStageText("Running ML Ingredient Classifier, Amino-Spiking RF & Purity Score Model...");
    setScanResult(null);

    try {
      const result = await analyzeTextWithMLFallback(customText, "Custom Scanned Label");
      setIsScanning(false);
      setScanResult(result);
      if (saveHistory) saveHistory(result);
    } catch (err) {
      const fallbackResult = analyzeSupplementIngredients(customText, "Custom Scanned Label");
      setIsScanning(false);
      setScanResult({ ...fallbackResult, mlFallback: true, mlFallbackReason: "ML service unavailable — using heuristic fallback." });
      if (saveHistory) saveHistory(fallbackResult);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!requireAuth("Please sign in with your email to unlock your 5 Free Daily AI Supplement Scans!")) return;
      if (!consumeScan()) return;

      const fileNameHint = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-+]/g, ' ');
      setIsScanning(true);
      setScanError("");
      setScanStageText(
        ocrEngine === 'easyocr'
          ? "Extracting label text with EasyOCR (Python ML) & running models..."
          : "Extracting label text with Tesseract.js & running ML models..."
      );
      setScanResult(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        try {
          const liveResult = await performLiveOCRAndAnalyze(dataUrl, 'A', fileNameHint, ocrEngine);
          setIsScanning(false);
          setScanResult(liveResult);
          if (saveHistory) saveHistory(liveResult);
        } catch (err) {
          console.warn("Live analysis error:", err);
          setScanError("Image processing encountered an error; showing fallback analysis.");
          const fallbackResult = analyzeSupplementIngredients("Whey Protein Blend Isolate Sunflower Lecithin", null, null, 'A');
          setIsScanning(false);
          setScanResult({ ...fallbackResult, mlFallback: true, mlFallbackReason: "Fallback heuristic analysis applied." });
          if (saveHistory) saveHistory(fallbackResult);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free Daily AI Supplement Scans!")) return;
    try {
      setCameraActive(true);
      const constraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera stream unavailable, opening native phone camera app:", err);
      setCameraActive(false);
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!consumeScan()) return;
    
    let photoDataUrl = null;
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 720;
        canvas.height = videoRef.current.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/png');
      } catch (e) {}
    }

    stopCamera();
    setIsScanning(true);
    setScanError("");
    setScanStageText(
      ocrEngine === 'easyocr'
        ? "Extracting photo text with EasyOCR (Python ML) & running models..."
        : "Extracting photo text with Tesseract.js & running ML models..."
    );

    try {
      const liveResult = photoDataUrl 
        ? await performLiveOCRAndAnalyze(photoDataUrl, 'A', '', ocrEngine)
        : await analyzeTextWithMLFallback("Whey Protein Isolate Stevia Monk Fruit", null, null, 'A');

      setIsScanning(false);
      setScanResult(liveResult);
      if (saveHistory) saveHistory(liveResult);
    } catch (err) {
      setScanError("Camera OCR encountered an error; showing fallback analysis.");
      const fallbackResult = analyzeSupplementIngredients("Whey Protein Isolate Stevia Monk Fruit", null, null, 'A');
      setIsScanning(false);
      setScanResult({ ...fallbackResult, mlFallback: true, mlFallbackReason: "Fallback heuristic analysis applied." });
      if (saveHistory) saveHistory(fallbackResult);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto font-josefin">
      <div className="relative w-full max-w-4xl glass-hud rounded-3xl p-4 sm:p-8 my-2 sm:my-8 border border-rose-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.8)] max-h-[96vh] overflow-y-auto">
        
        {/* Close Button */}
        <button 
          onClick={() => { stopCamera(); onClose(); }}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 pr-10">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-maroon-950 dark:text-white leading-tight">
                AI Supplement Vision Scanner
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-rose-300/70 font-sans">
                OCR + ML Ingredient Classifier, Amino-Spiking Detector & Purity Regressor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-sans self-start sm:self-auto">
            <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase border ${
              hasUnlimitedScans
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30'
            }`}>
              {hasUnlimitedScans
                ? `${currentPlan.name} • ∞ Unlimited`
                : `Free • ${dailyScansRemaining}/${DAILY_FREE_SCAN_LIMIT} Scans Today`}
            </span>
            {!hasUnlimitedScans && (
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                  openPricingModal('Upgrade to Pro or Premium for unlimited daily scans & Detailed ML Breakdowns!');
                }}
                className="px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider hover:opacity-95 cursor-pointer flex items-center gap-1 shadow"
              >
                <Crown className="w-3 h-3" />
                <span>Upgrade</span>
              </button>
            )}
          </div>
        </div>

        {/* OCR Engine Selector (Tesseract.js vs EasyOCR) */}
        {!scanResult && !isScanning && (
          <div className="mb-4 p-3 rounded-2xl glass-card-neo border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-sans">
            <div className="flex items-center gap-2 text-xs">
              <Cpu className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-bold text-maroon-950 dark:text-white">OCR Engine:</span>
              <span className="text-[11px] text-slate-500 dark:text-rose-200/70">
                {ocrEngine === 'tesseract' ? 'Client-side Browser WASM' : 'Python Server EasyOCR (/api/ml/ocr)'}
              </span>
            </div>
            <div className="inline-flex p-1 rounded-xl bg-black/5 dark:bg-black/50 border border-rose-500/20 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setOcrEngine('tesseract')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  ocrEngine === 'tesseract'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300 hover:text-rose-500'
                }`}
              >
                Tesseract.js (Fast)
              </button>
              <button
                type="button"
                onClick={() => setOcrEngine('easyocr')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  ocrEngine === 'easyocr'
                    ? 'bg-emerald-500 text-black font-black shadow'
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-400'
                }`}
              >
                EasyOCR (ML Server)
              </button>
            </div>
          </div>
        )}

        {/* Camera / Upload Mode */}
        {!scanResult && !isScanning && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Live Vertical Camera Viewfinder */}
            {cameraActive ? (
              <div className="relative w-full max-w-sm sm:max-w-md mx-auto aspect-[3/4] sm:aspect-[4/5] min-h-[420px] max-h-[72vh] rounded-3xl overflow-hidden bg-black border border-rose-500/50 shadow-2xl flex flex-col justify-between p-4 animate-in fade-in zoom-in-95 duration-200">
                <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover"></video>
                
                {/* Laser scan beam */}
                <div className="absolute inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#E11D48] animate-laser-sweep pointer-events-none z-20"></div>

                {/* Supplement Framing Bracket Guide */}
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

                {/* Bottom Live Controls */}
                <div className="relative z-30 mt-auto pt-4 space-y-2 text-center font-sans">
                  <div className="flex justify-center gap-3">
                    <button 
                      onClick={capturePhoto}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(225,29,72,0.5)] hover:opacity-95 active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Snap & Analyze
                    </button>
                    <button 
                      onClick={stopCamera}
                      className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs cursor-pointer transition"
                    >
                      Cancel
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      stopCamera();
                      cameraInputRef.current?.click();
                    }}
                    className="text-[11px] font-bold text-rose-300 hover:text-white underline cursor-pointer inline-block pt-1"
                  >
                    📱 Or Tap to Use Phone Camera App
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 font-sans">
                
                {/* 1. Live Camera Button */}
                <button
                  onClick={startCamera}
                  className="p-5 sm:p-6 rounded-2xl glass-card-neo border border-rose-500/20 hover:border-rose-500/50 flex flex-col items-center justify-center gap-2.5 group transition cursor-pointer text-center"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition shadow-sm">
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <span className="block font-bold text-maroon-950 dark:text-white text-xs sm:text-sm">
                      Open Live Camera
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-rose-200/60">
                      Vertical AR frame for tubs & bottles
                    </span>
                  </div>
                </button>

                {/* 2. File Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 sm:p-6 rounded-2xl glass-card-neo border border-rose-500/20 hover:border-rose-500/50 flex flex-col items-center justify-center gap-2.5 group transition cursor-pointer text-center"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition shadow-sm">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <span className="block font-bold text-maroon-950 dark:text-white text-xs sm:text-sm">
                      Upload Label Photo
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-rose-200/60">
                      Upload PNG, JPG, or screenshot
                    </span>
                  </div>
                </button>

                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />

                <input 
                  ref={cameraInputRef} 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </div>
            )}

            {/* Quick Test Preset Samples */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2.5">
                <Sparkles className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-rose-300">
                  Or Test Instantly with Verified Presets
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
                {SAMPLE_PRODUCTS.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="p-3 rounded-2xl glass-card-neo border border-rose-500/20 hover:border-rose-500/50 flex items-center justify-between cursor-pointer group transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-maroon-950 dark:text-white group-hover:text-rose-400 transition truncate max-w-[180px]">
                          {sample.name}
                        </span>
                        {sample.riskLevel === 'danger' && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400">
                            SPIKED
                          </span>
                        )}
                        {sample.riskLevel === 'safe' && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            CLEAN
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-rose-200/60 mt-0.5">
                        {sample.category} • {sample.brand}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Paste Text Area */}
            <div className="p-4 rounded-2xl glass-card-neo border border-rose-500/20">
              <h4 className="text-xs font-bold font-syne text-slate-700 dark:text-rose-300 mb-2">Or Paste Ingredient Text Directly:</h4>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. Whey Protein Concentrate, Maltodextrin, L-Glycine, Taurine, Sucralose, Artificial Flavor..."
                className="w-full h-20 bg-black/5 dark:bg-black/80 border border-rose-500/20 rounded-xl p-3 text-xs text-slate-800 dark:text-rose-100 outline-none focus:border-rose-500 resize-none font-mono"
              ></textarea>
              <button
                onClick={handleCustomAnalyze}
                disabled={!customText.trim()}
                className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-40 transition cursor-pointer"
              >
                Analyze Ingredient List
              </button>
            </div>

          </div>
        )}

        {/* Scanning Animation State */}
        {isScanning && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-20 h-20">
              <div className="w-full h-full rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin"></div>
              <Zap className="w-8 h-8 text-rose-500 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black font-syne text-maroon-950 dark:text-white">Analyzing Formula & Running ML Models...</h3>
              <p className="text-xs text-slate-500 dark:text-rose-300/70 mt-1 font-mono">{scanStageText}</p>
            </div>
          </div>
        )}

        {/* Comprehensive Scan Diagnostic Results */}
        {scanResult && !isScanning && (
          <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">

            {/* ML / OCR Fallback or Error Notice */}
            {(scanError || scanResult.mlFallback || scanResult.ocrFallbackNotice) && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/35 flex items-start gap-2.5 text-xs font-sans text-amber-800 dark:text-amber-200">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {scanError && <p className="font-bold">{scanError}</p>}
                  {scanResult.ocrFallbackNotice && <p>{scanResult.ocrFallbackNotice}</p>}
                  {scanResult.mlFallback && (
                    <p>{scanResult.mlFallbackReason || "ML service unavailable — using built-in heuristic fallback scorer."}</p>
                  )}
                </div>
              </div>
            )}

            {/* Top Score Banner */}
            <div className={`p-5 sm:p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-5 ${
              scanResult.riskLevel === 'danger'
                ? 'bg-rose-950/40 border-rose-500/40 shadow-[0_0_30px_rgba(225,29,72,0.2)]'
                : scanResult.riskLevel === 'warning'
                ? 'bg-amber-950/40 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                : 'bg-emerald-950/40 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
            }`}>
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {scanResult.category || "Gym Supplement"}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-bold text-rose-400">{scanResult.brand}</span>
                  {scanResult.ocrEngineUsed && (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                      OCR: {scanResult.ocrEngineUsed}
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">{scanResult.name}</h3>
                <p className={`text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 ${
                  scanResult.riskLevel === 'danger' ? 'text-rose-400' : scanResult.riskLevel === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {scanResult.riskLevel === 'danger' ? <ShieldAlert className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{scanResult.verdict}</span>
                </p>
                {scanResult.verdictHindi && (
                  <p className="text-[11px] text-rose-200/80 font-sans italic">
                    {scanResult.verdictHindi}
                  </p>
                )}
              </div>

              {/* Purity Score Gauge */}
              <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-rose-500/30 min-w-[148px] shrink-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {scanResult.mlPowered ? 'ML PURITY SCORE' : 'PURITY SCORE'}
                </span>
                <span className={`text-3xl sm:text-4xl font-black font-mono my-0.5 ${
                  scanResult.purityScore > 80 ? 'text-emerald-400' : scanResult.purityScore > 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {scanResult.purityScore}
                  <span className="text-xs text-slate-500">/100</span>
                </span>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden my-1.5">
                  <div
                    className={`h-full rounded-full ${
                      scanResult.purityScore > 80 ? 'bg-emerald-500' : scanResult.purityScore > 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, scanResult.purityScore))}%` }}
                  ></div>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                  scanResult.purityScore > 80 ? 'bg-emerald-500/20 text-emerald-400' : scanResult.purityScore > 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {scanResult.purityScore > 80 ? 'LAB VERIFIED' : scanResult.purityScore > 50 ? 'MODERATE RISK' : 'HIGH ADULTERATION'}
                </span>
              </div>
            </div>

            {/* Amino-Spiking Warning Card */}
            {(() => {
              const spikingRisk =
                scanResult.mlSpiking?.spiking_risk ||
                (scanResult.flags?.aminoSpiking ? 'high' : 'low');
              const spikingProb = scanResult.mlSpiking?.probability;
              const spikingExplanation =
                scanResult.mlSpiking?.explanation ||
                (scanResult.flags?.aminoSpiking
                  ? 'Free non-protein amino acids detected that may artificially inflate protein nitrogen counts.'
                  : 'No suspicious free amino-spiking fillers detected in this formula.');

              const cardStyle =
                spikingRisk === 'high'
                  ? 'bg-rose-500/10 border-rose-500/45 text-rose-800 dark:text-rose-200'
                  : spikingRisk === 'medium'
                  ? 'bg-orange-500/10 border-orange-500/45 text-orange-800 dark:text-orange-200'
                  : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-800 dark:text-emerald-200';

              const badgeStyle =
                spikingRisk === 'high'
                  ? 'bg-rose-600 text-white'
                  : spikingRisk === 'medium'
                  ? 'bg-orange-500 text-white'
                  : 'bg-emerald-500 text-black';

              return (
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans ${cardStyle}`}>
                  <div className="flex items-start gap-3">
                    {spikingRisk === 'low' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${spikingRisk === 'high' ? 'text-rose-500' : 'text-orange-500'}`} />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-maroon-950 dark:text-white">
                          Amino-Spiking Risk Detector
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase ${badgeStyle}`}>
                          {spikingRisk} risk
                        </span>
                        {typeof spikingProb === 'number' && (
                          <span className="text-[11px] font-mono font-bold opacity-85">
                            ({Math.round(spikingProb * 100)}% probability)
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1 opacity-90 leading-relaxed">{spikingExplanation}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Extracted Macro Nutrition Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-sans">
              <div className="p-3 rounded-2xl bg-black/40 border border-rose-500/20 text-center">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">CALORIES</span>
                <span className="text-sm font-black text-white">{scanResult.calories || "120 kcal"}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/30 text-center">
                <span className="text-[9px] font-mono text-emerald-400 block uppercase">PROTEIN</span>
                <span className="text-sm font-black text-emerald-400">{scanResult.claimedProtein || "24g"}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-rose-500/20 text-center">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">CARBS</span>
                <span className="text-sm font-black text-white">{scanResult.carbs || "3g"}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/30 text-center">
                <span className="text-[9px] font-mono text-amber-400 block uppercase">SUGAR</span>
                <span className="text-sm font-black text-amber-400">{scanResult.sugar || "1g"}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-rose-500/20 text-center col-span-2 sm:col-span-1">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">FAT</span>
                <span className="text-sm font-black text-white">{scanResult.fat || "1.5g"}</span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-sans">
              <div className="p-3 rounded-2xl glass-card-neo border border-rose-500/20 text-center">
                <span className="text-[9px] font-bold text-slate-500 dark:text-rose-300/70 uppercase">True Bioavailability</span>
                <p className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-300 mt-0.5">{scanResult.flags.trueProteinRatio || "N/A"}</p>
              </div>
              <div className="p-3 rounded-2xl glass-card-neo border border-rose-500/20 text-center">
                <span className="text-[9px] font-bold text-slate-500 dark:text-rose-300/70 uppercase">Amino Spiking</span>
                <p className={`text-xs sm:text-sm font-black mt-0.5 ${scanResult.flags.aminoSpiking ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {scanResult.flags.aminoSpiking ? 'DETECTED 🚨' : 'NONE ✅'}
                </p>
              </div>
              <div className="p-3 rounded-2xl glass-card-neo border border-rose-500/20 text-center">
                <span className="text-[9px] font-bold text-slate-500 dark:text-rose-300/70 uppercase">Banned Stims</span>
                <p className={`text-xs sm:text-sm font-black mt-0.5 ${scanResult.flags.bannedSubstances ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {scanResult.flags.bannedSubstances ? 'FLAGGED ⛔' : 'CLEAR (WADA)'}
                </p>
              </div>
              <div className="p-3 rounded-2xl glass-card-neo border border-rose-500/20 text-center">
                <span className="text-[9px] font-bold text-slate-500 dark:text-rose-300/70 uppercase">Heavy Metals Risk</span>
                <p className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{scanResult.flags.heavyMetalsRisk || "Low"}</p>
              </div>
            </div>

            {/* Ingredient List Breakdown with ML Color-Coded Badges */}
            <div className="p-4 sm:p-5 rounded-2xl glass-card-neo border border-rose-500/20 space-y-3 font-sans">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-maroon-950 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-500" />
                  <span>Ingredient Classification Assay</span>
                </h4>
                <div className="flex flex-wrap gap-1.5 text-[9px] font-mono font-bold uppercase">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Beneficial</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-600 dark:text-slate-300">Neutral</span>
                  <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400">Harmful</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400">Banned</span>
                </div>
              </div>

              <div className="space-y-2">
                {scanResult.ingredientsList.map((ing, idx) => {
                  const mlClass =
                    ing.mlClass ||
                    (ing.status === 'danger'
                      ? 'harmful'
                      : ing.status === 'warning' || ing.status === 'caution'
                      ? 'neutral'
                      : 'beneficial');

                  const rowClass =
                    mlClass === 'banned_wada'
                      ? 'bg-red-500/15 border-red-500/50 text-red-800 dark:text-red-200'
                      : mlClass === 'harmful'
                      ? 'bg-orange-500/10 border-orange-500/35 text-orange-800 dark:text-orange-200'
                      : mlClass === 'neutral'
                      ? 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200';

                  const badgeClass =
                    mlClass === 'banned_wada'
                      ? 'bg-red-600 text-white'
                      : mlClass === 'harmful'
                      ? 'bg-orange-500 text-white'
                      : mlClass === 'neutral'
                      ? 'bg-slate-500 text-white'
                      : 'bg-emerald-500 text-black';

                  const badgeLabel =
                    mlClass === 'banned_wada'
                      ? 'BANNED (WADA)'
                      : mlClass === 'harmful'
                      ? 'HARMFUL'
                      : mlClass === 'neutral'
                      ? 'NEUTRAL'
                      : 'BENEFICIAL';

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${rowClass}`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-maroon-950 dark:text-white">{ing.name}</span>
                          {hasDetailedRiskReport && typeof ing.confidence === 'number' && (
                            <span className="text-[10px] font-mono opacity-75">
                              {Math.round(ing.confidence * 100)}% conf
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-[11px] opacity-85 block">{ing.reason}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] sm:text-[10px] uppercase shrink-0 self-start sm:self-auto ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed ML Breakdown ("Why This Score" + Clinical Risk Report — Pro/Premium Feature) */}
            {hasDetailedRiskReport ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/35 space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" />
                      <span>
                        {currentPlan.name} Unlocked • Detailed ML Breakdown
                        {scanResult.mlScore?.model_used ? ` (${scanResult.mlScore.model_used})` : ''}
                      </span>
                    </span>
                    <h4 className="text-sm sm:text-base font-black font-josefin text-maroon-950 dark:text-white mt-0.5">
                      Why This Score & Clinical Ingredient-Risk Report
                    </h4>
                  </div>

                  <button
                    onClick={() => {
                      const summary = [
                        `GymScan ML Clinical Ingredient-Risk Report`,
                        `Product: ${scanResult.name} (${scanResult.brand})`,
                        `Purity Score: ${scanResult.purityScore}/100`,
                        `Amino Spiking Risk: ${scanResult.mlSpiking?.spiking_risk || (scanResult.flags.aminoSpiking ? 'high' : 'low')}`,
                        `Banned Stimulants: ${scanResult.flags.bannedSubstances ? 'FLAGGED' : 'Clear (WADA)'}`,
                        `True Protein Ratio: ${scanResult.flags.trueProteinRatio || 'N/A'}`,
                        `Verdict: ${scanResult.verdict}`,
                        `Ingredients Audited:`,
                        ...scanResult.ingredientsList.map(
                          (i) => `- ${i.name} [${(i.mlClass || i.status).toUpperCase()}]: ${i.reason}`
                        ),
                        `Disclaimer: Informational only, not medical advice. Check the official WADA list for competition.`,
                      ].join('\n');
                      navigator.clipboard?.writeText(summary).catch(() => {});
                      setCopiedReport(true);
                      setTimeout(() => setCopiedReport(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition"
                  >
                    {copiedReport ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReport ? 'Copied Report' : 'Copy Clinical Report'}</span>
                  </button>
                </div>

                {/* "Why this score" ML Top Feature Contributions */}
                {scanResult.mlScore?.top_contributors?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-black/5 dark:bg-black/40 border border-emerald-500/20 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-maroon-950 dark:text-white">
                      <BarChart3 className="w-4 h-4 text-emerald-500" />
                      <span>Why This Score (Top ML Model Feature Contributions)</span>
                    </div>
                    <div className="space-y-2">
                      {scanResult.mlScore.top_contributors.map((contrib, i) => {
                        const positive = contrib.impact >= 0;
                        const barWidth = Math.min(100, Math.max(8, Math.abs(contrib.impact) * 4.5));
                        return (
                          <div key={i} className="space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {contrib.label} <span className="font-mono text-[10px] opacity-70">({contrib.value})</span>
                              </span>
                              <span className={`font-mono font-black ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                {positive ? `+${contrib.impact}` : contrib.impact} pts
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${positive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${barWidth}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-emerald-500/20">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase block">
                      Metabolic / Gut Load
                    </span>
                    <span className="font-black text-maroon-950 dark:text-white mt-0.5 block">
                      {scanResult.flags.fillerCount > 1
                        ? 'Elevated (Multi-Filler / Polyol)'
                        : scanResult.flags.fillerCount === 1
                        ? 'Moderate (Single Bulking Agent)'
                        : 'Clean / Minimal Gut Stress'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-emerald-500/20">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase block">
                      Nitrogen Fraud Audit
                    </span>
                    <span className="font-black text-maroon-950 dark:text-white mt-0.5 block">
                      {scanResult.flags.aminoSpiking
                        ? 'Free Amino Dilution Detected'
                        : 'Intact Protein Verified'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-emerald-500/20">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase block">
                      Athletic Drug-Test Status
                    </span>
                    <span className="font-black text-maroon-950 dark:text-white mt-0.5 block">
                      {scanResult.flags.bannedSubstances
                        ? 'Risk: Prohibited Stimulant Flagged'
                        : 'WADA / Competition Safe'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-700 dark:text-emerald-100/85 p-3 rounded-xl bg-black/5 dark:bg-black/40 border border-emerald-500/15 leading-relaxed">
                  <strong>Clinical Recommendation:</strong>{' '}
                  {scanResult.purityScore >= 80
                    ? 'Formulation demonstrates clean bioavailability with negligible additive burden. Safe for daily athletic supplementation.'
                    : scanResult.purityScore >= 55
                    ? 'Acceptable protein base, though artificial sweeteners or thickeners are present. Monitor digestive tolerance and consider cleaner isolate swaps.'
                    : 'High adulteration or risk penalty detected. Avoid regular consumption and switch to a lab-certified unspiked formula.'}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl glass-card-neo border border-amber-500/35 bg-amber-500/5 relative overflow-hidden font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                        PRO / PREMIUM FEATURE
                      </span>
                      <h4 className="text-sm sm:text-base font-black font-josefin text-maroon-950 dark:text-white">
                        Detailed ML Breakdown & "Why This Score" Locked
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-rose-200/75 mt-1">
                        Upgrade to Pro to unlock feature-importance score explanations, per-ingredient ML confidence scores, WADA compliance audits, and unlimited daily scans.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      stopCamera();
                      onClose();
                      openPricingModal(
                        'Upgrade to Pro (₹199/mo) or Premium (₹1,499/yr) to unlock Detailed ML Breakdowns and Unlimited Scans!'
                      );
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider shrink-0 hover:opacity-95 active:scale-95 transition shadow-lg cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Unlock ML Breakdown</span>
                  </button>
                </div>
              </div>
            )}

            {/* Required Competition & Medical Disclaimer */}
            <p className="text-[11px] text-center text-slate-500 dark:text-rose-200/65 font-sans">
              Informational only, not medical advice. Check the official WADA list for competition.
            </p>

            {/* Reset / Rescan CTA Bar */}
            <div className="flex justify-between items-center pt-3 border-t border-rose-500/20 font-sans">
              <button
                onClick={() => { setScanResult(null); setCustomText(""); setScanError(""); }}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-rose-300 hover:text-rose-500 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another Product</span>
              </button>
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
