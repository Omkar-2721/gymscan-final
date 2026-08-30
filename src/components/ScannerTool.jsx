import React, { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, RefreshCw, Zap, Award, ArrowRight, Share2, Layers, User } from 'lucide-react';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';
import { analyzeSupplementIngredients } from '../utils/analyzer';
import { useAuth } from '../context/AuthContext';

export default function ScannerTool({ isOpen, onClose, onSaveToHistory }) {
  const { user, requireAuth, consumeScan } = useAuth();
  const [selectedSample, setSelectedSample] = useState(null);
  const [customText, setCustomText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('camera');

  if (!isOpen) return null;

  const handleSelectSample = (sample) => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    if (!consumeScan()) return;

    setSelectedSample(sample.id);
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      setScanResult(sample);
      if (onSaveToHistory) onSaveToHistory(sample);
    }, 900);
  };

  const handleCustomAnalyze = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
    if (!consumeScan()) return;

    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      const result = analyzeSupplementIngredients(customText, "Custom Scanned Label");
      setIsScanning(false);
      setScanResult(result);
      if (onSaveToHistory) onSaveToHistory(result);
    }, 1000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
      if (!consumeScan()) return;

      setIsScanning(true);
      setScanResult(null);
      setTimeout(() => {
        const simulatedSpiked = SAMPLE_PRODUCTS[0];
        setIsScanning(false);
        setScanResult(simulatedSpiked);
        if (onSaveToHistory) onSaveToHistory(simulatedSpiked);
      }, 1200);
    }
  };

  const startCamera = async () => {
    if (!requireAuth("Please sign in with your email to unlock your 5 Free AI Supplement Scans!")) return;
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

  const capturePhoto = () => {
    if (!consumeScan()) return;
    stopCamera();
    setIsScanning(true);
    setTimeout(() => {
      const simulatedIsolate = SAMPLE_PRODUCTS[1];
      setIsScanning(false);
      setScanResult(simulatedIsolate);
      if (onSaveToHistory) onSaveToHistory(simulatedIsolate);
    }, 1100);
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
        <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6 pr-10">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-maroon-950 dark:text-white leading-tight">
              AI Supplement Vision Scanner
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-rose-300/70 font-sans">
              Scan any Whey Protein, Pre-Workout, or Creatine tub label
            </p>
          </div>
        </div>

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
              <h3 className="text-lg font-black font-syne text-maroon-950 dark:text-white">De-Masking Proprietary Blends...</h3>
              <p className="text-xs text-slate-500 dark:text-rose-300/70 mt-1 font-mono">Running nitrogen-balance check • Screening 1,400+ banned stimulants</p>
            </div>
          </div>
        )}

        {/* Comprehensive Scan Diagnostic Results */}
        {scanResult && !isScanning && (
          <div className="space-y-6">
            
            {/* Top Score Banner */}
            <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-6 ${
              scanResult.riskLevel === 'danger'
                ? 'bg-rose-950/40 border-rose-500/40 shadow-[0_0_30px_rgba(225,29,72,0.2)]'
                : scanResult.riskLevel === 'warning'
                ? 'bg-amber-950/40 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                : 'bg-emerald-950/40 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
            }`}>
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{scanResult.category}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-bold text-rose-400">{scanResult.brand}</span>
                </div>
                <h3 className="text-2xl font-black font-syne text-white">{scanResult.name}</h3>
                <p className={`text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 ${
                  scanResult.riskLevel === 'danger' ? 'text-rose-400' : scanResult.riskLevel === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {scanResult.riskLevel === 'danger' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {scanResult.verdict}
                </p>
              </div>

              {/* Purity Score Gauge */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/60 border border-rose-500/30 min-w-[140px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-syne">PURITY SCORE</span>
                <span className={`text-4xl font-black font-mono my-1 ${
                  scanResult.purityScore > 80 ? 'text-emerald-400' : scanResult.purityScore > 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {scanResult.purityScore}
                  <span className="text-xs text-slate-500">/100</span>
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  scanResult.purityScore > 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {scanResult.purityScore > 80 ? 'LAB VERIFIED' : 'HIGH ADULTERATION'}
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl glass-card-neo border border-rose-500/20 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-rose-300/70 uppercase">True Protein %</span>
                <p className="text-base font-black font-mono text-rose-600 dark:text-rose-300 mt-1">{scanResult.flags.trueProteinRatio || "N/A"}</p>
              </div>
              <div className="p-3.5 rounded-2xl glass-card-neo border border-rose-500/20 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-rose-300/70 uppercase">Amino Spiking</span>
                <p className={`text-base font-black mt-1 ${scanResult.flags.aminoSpiking ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {scanResult.flags.aminoSpiking ? 'DETECTED 🚨' : 'NONE ✅'}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl glass-card-neo border border-rose-500/20 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-rose-300/70 uppercase">Banned Stims</span>
                <p className={`text-base font-black mt-1 ${scanResult.flags.bannedSubstances ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {scanResult.flags.bannedSubstances ? 'FLAGGED ⛔' : 'CLEAR (WADA)'}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl glass-card-neo border border-rose-500/20 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-rose-300/70 uppercase">Heavy Metals</span>
                <p className="text-base font-black text-slate-700 dark:text-slate-200 mt-1">{scanResult.flags.heavyMetalsRisk || "Low"}</p>
              </div>
            </div>

            {/* Ingredient List Breakdown */}
            <div className="p-5 rounded-2xl glass-card-neo border border-rose-500/20 space-y-3">
              <h4 className="text-xs font-black font-syne uppercase tracking-wider text-maroon-950 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-500" />
                <span>Full AI Ingredient Breakdown</span>
              </h4>

              <div className="space-y-2">
                {scanResult.ingredientsList.map((ing, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      ing.status === 'danger' 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200' 
                        : ing.status === 'warning' 
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200' 
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                    }`}
                  >
                    <div>
                      <span className="font-bold block text-maroon-950 dark:text-white">{ing.name}</span>
                      <span className="text-[11px] opacity-80">{ing.reason}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase shrink-0 self-start sm:self-auto ${
                      ing.status === 'danger' ? 'bg-rose-500 text-white' : ing.status === 'warning' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-white'
                    }`}>
                      {ing.status === 'danger' ? 'AVOID' : ing.status === 'warning' ? 'CAUTION' : 'CLEAN'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clean Alternative Recommendation Card */}
            {scanResult.cleanAlternative && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/60 to-maroon-950/60 border border-rose-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-black mb-1 font-syne">
                    <Sparkles className="w-4 h-4" />
                    <span>RECOMMENDED CLEAN LAB-TESTED SWAP</span>
                  </div>
                  <h5 className="text-base font-black font-syne text-white">{scanResult.cleanAlternative.name}</h5>
                  <p className="text-xs text-rose-200/80 mt-0.5">{scanResult.cleanAlternative.whyBetter}</p>
                </div>
                <button
                  onClick={() => handleSelectSample(SAMPLE_PRODUCTS.find(p => p.name === scanResult.cleanAlternative.name) || SAMPLE_PRODUCTS[1])}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition shadow-lg shrink-0 cursor-pointer"
                >
                  View Clean Swap Report
                </button>
              </div>
            )}

            {/* Reset / Rescan CTA */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setScanResult(null)}
                className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-rose-300/70 hover:text-rose-500 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another Product</span>
              </button>
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="px-6 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 text-slate-800 dark:text-white font-bold text-xs transition cursor-pointer"
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
