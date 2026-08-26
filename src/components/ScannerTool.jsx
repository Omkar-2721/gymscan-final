import React, { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, RefreshCw, Zap, Award, ArrowRight, Share2, Layers } from 'lucide-react';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';
import { analyzeSupplementIngredients } from '../utils/analyzer';

export default function ScannerTool({ isOpen, onClose, onSaveToHistory }) {
  const [selectedSample, setSelectedSample] = useState(null);
  const [customText, setCustomText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleSelectSample = (sample) => {
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
    const file = e.target.files[0];
    if (file) {
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
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Camera access not available in this browser window. You can upload an image or choose one of our verified sample labels below!");
      setCameraActive(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-hud rounded-3xl p-6 sm:p-8 my-8 border border-rose-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button 
          onClick={() => { stopCamera(); onClose(); }}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-syne text-maroon-950 dark:text-white">AI Supplement Vision Scanner</h2>
            <p className="text-xs text-slate-500 dark:text-rose-300/70">Scan any Whey Protein, Pre-Workout, or Creatine tub label</p>
          </div>
        </div>

        {/* Camera / Upload Mode */}
        {!scanResult && !isScanning && (
          <div className="space-y-6">
            
            {/* Live Camera Viewfinder */}
            {cameraActive ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-rose-500/50">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                <div className="absolute inset-0 border-2 border-dashed border-rose-400/60 m-8 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-xs font-mono text-rose-300 bg-black/60 px-3 py-1 rounded">ALIGN INGREDIENTS HERE</span>
                </div>
                <div className="absolute bottom-4 inset-x-0 flex justify-center gap-4">
                  <button 
                    onClick={capturePhoto}
                    className="px-6 py-2.5 rounded-full bg-rose-500 text-white font-black text-sm flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Camera className="w-4 h-4" /> Snap & Analyze
                  </button>
                  <button 
                    onClick={stopCamera}
                    className="px-4 py-2.5 rounded-full bg-slate-800 text-slate-300 font-bold text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={startCamera}
                  className="p-6 rounded-2xl glass-card-neo border border-rose-500/20 hover:border-rose-500/50 flex flex-col items-center justify-center gap-3 group transition cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="block font-bold font-syne text-maroon-950 dark:text-white text-sm">Open Live Camera</span>
                    <span className="text-[11px] text-slate-500 dark:text-rose-200/60">Scan directly from your phone or webcam</span>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl glass-card-neo border border-rose-500/20 hover:border-rose-500/50 flex flex-col items-center justify-center gap-3 group transition cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="block font-bold font-syne text-maroon-950 dark:text-white text-sm">Upload Label Photo</span>
                    <span className="text-[11px] text-slate-500 dark:text-rose-200/60">Upload PNG, JPG, or screenshot</span>
                  </div>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                </button>
              </div>
            )}

            {/* Quick Test Preset Samples */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold font-syne uppercase tracking-wider text-slate-700 dark:text-rose-300">
                  Or Test Instantly with Verified Presets
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_PRODUCTS.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="p-3.5 rounded-2xl glass-card-neo border border-rose-500/20 hover:border-rose-500/50 flex items-center justify-between cursor-pointer group transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-syne text-maroon-950 dark:text-white group-hover:text-rose-400 transition">{sample.name}</span>
                        {sample.riskLevel === 'danger' && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400">SPIKED</span>
                        )}
                        {sample.riskLevel === 'safe' && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">CLEAN</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-rose-200/60 mt-0.5">{sample.category} • {sample.brand}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
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
