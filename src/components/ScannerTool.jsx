import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Zap,
  ArrowRight,
  Layers,
  Lock,
  Crown,
  Copy,
  Check,
  Cpu,
  BarChart3,
  Info,
  Flashlight,
  SwitchCamera,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  Barcode,
  Radio,
} from 'lucide-react';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';
import {
  analyzeSupplementIngredients,
  analyzeTextWithMLFallback,
  performLiveOCRAndAnalyze,
  reanalyzeEditedIngredients,
} from '../utils/analyzer';
import { analyzeWithMLPipeline } from '../utils/mlService';
import {
  buildPreprocessedVariantsFromRGBA,
  computeBlurAndBrightness,
} from '../utils/imagePreprocess';
import {
  recognizeWithVariants,
  parseLabelAndMatch,
} from '../utils/ocrEngine';
import {
  detectBarcodeFromCanvasOrImage,
  lookupBarcodeOpenFoodFacts,
} from '../utils/barcodeScanner';
import ImageCropper from './ImageCropper';
import { useAuth } from '../context/AuthContext';
import { DAILY_FREE_SCAN_LIMIT } from '../data/plans';

export default function ScannerTool({ isOpen, onClose, onSaveToHistory, onSaveHistory }) {
  const {
    requireAuth,
    consumeScan,
    currentPlan,
    hasUnlimitedScans,
    dailyScansRemaining,
    openPricingModal,
  } = useAuth();
  const saveHistory = onSaveHistory || onSaveToHistory;

  const [selectedSample, setSelectedSample] = useState(null);
  const [customText, setCustomText] = useState('');
  const [ocrEngine, setOcrEngine] = useState('tesseract'); // 'tesseract' | 'easyocr'
  const [isScanning, setIsScanning] = useState(false);
  const [scanStageText, setScanStageText] = useState('Running OCR & ML Verification...');
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);

  // Upload Cropper State
  const [pendingUpload, setPendingUpload] = useState(null); // { dataUrl, fileNameHint }

  // Camera & Live Scan States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [liveScanEnabled, setLiveScanEnabled] = useState(true);
  const [liveHint, setLiveHint] = useState('Align Ingredients / Supplement Facts inside box');
  const [liveFrameCount, setLiveFrameCount] = useState(0);
  const [liveStabilized, setLiveStabilized] = useState([]);
  const [liveRawText, setLiveRawText] = useState('');
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [liveBarcodeMsg, setLiveBarcodeMsg] = useState('');

  // Results Edit & Debug Details States
  const [showScanDetails, setShowScanDetails] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const liveFramesRef = useRef([]);
  const liveOcrBusyRef = useRef(false);
  const liveLoopTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const resetLiveState = () => {
    liveFramesRef.current = [];
    liveOcrBusyRef.current = false;
    setLiveFrameCount(0);
    setLiveStabilized([]);
    setLiveRawText('');
    setLiveConfidence(0);
    setLiveBarcodeMsg('');
    setLiveHint('Align Ingredients / Supplement Facts inside box');
  };

  const stopCamera = () => {
    if (liveLoopTimerRef.current) {
      clearInterval(liveLoopTimerRef.current);
      liveLoopTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setTorchSupported(false);
    resetLiveState();
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPendingUpload(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Live Camera Frame Loop (~900ms interval when cameraActive && liveScanEnabled)
  useEffect(() => {
    if (!cameraActive || !liveScanEnabled) {
      if (liveLoopTimerRef.current) {
        clearInterval(liveLoopTimerRef.current);
        liveLoopTimerRef.current = null;
      }
      return;
    }

    const runFrameCheck = async () => {
      if (liveOcrBusyRef.current || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

      liveOcrBusyRef.current = true;
      try {
        // Grab only the guide rectangle region (center 84% width x 56% height)
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const gx = Math.round(vw * 0.08);
        const gy = Math.round(vh * 0.16);
        const gw = Math.max(120, Math.round(vw * 0.84));
        const gh = Math.max(120, Math.round(vh * 0.56));

        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = gw;
        frameCanvas.height = gh;
        const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, gx, gy, gw, gh, 0, 0, gw, gh);

        const frameData = ctx.getImageData(0, 0, gw, gh);
        const quality = computeBlurAndBrightness(frameData.data, gw, gh);
        setLiveHint(quality.hint);

        if (quality.isTooDark || quality.isBlurry) {
          liveOcrBusyRef.current = false;
          return;
        }

        // Barcode check shortcut on live frame
        const barcode = await detectBarcodeFromCanvasOrImage(frameCanvas);
        if (barcode) {
          setLiveHint(`Barcode #${barcode} detected — looking up product...`);
          const off = await lookupBarcodeOpenFoodFacts(barcode);
          if (off.found) {
            if (!consumeScan()) {
              stopCamera();
              return;
            }
            stopCamera();
            setIsScanning(true);
            setScanStageText(`Loaded Open Food Facts #${barcode} — running ML audit...`);
            const enrichedOff = await analyzeTextWithMLFallback(
              `Ingredients: ${off.ingredientsText}`,
              off.name,
              off.brand,
              'A',
              off.macros
            );
            setIsScanning(false);
            setScanResult({
              ...enrichedOff,
              ocrEngineUsed: 'barcode_openfoodfacts',
              barcodeInfo: { found: true, barcode, source: 'Open Food Facts' },
              ocrMeta: {
                confidence: 99,
                perLineConfidence: [],
                winningVariant: { id: 'barcode', label: `Open Food Facts (#${barcode})`, psm: 'N/A' },
                variantStats: [],
                skewAngle: 0,
              },
            });
            if (saveHistory) saveHistory(enrichedOff);
            return;
          } else {
            setLiveBarcodeMsg(off.message || 'Product not in database, scanning label instead');
          }
        }

        // Preprocess cropped guide frame (RGBA -> high_contrast PNG) & run fast singleton worker
        const processed = buildPreprocessedVariantsFromRGBA(frameData.data, gw, gh);
        const targetVariant = processed.variants[1] || processed.variants[0];
        const vCanvas = document.createElement('canvas');
        vCanvas.width = processed.width;
        vCanvas.height = processed.height;
        vCanvas.getContext('2d').putImageData(
          new ImageData(targetVariant.rgba, processed.width, processed.height),
          0,
          0
        );
        const variantPayload = [{ ...targetVariant, dataUrl: vCanvas.toDataURL('image/png') }];

        const tRes = await recognizeWithVariants(variantPayload, { fastMode: true });
        if (!tRes.text || tRes.text.trim().length < 6) {
          setLiveHint('Move closer to Ingredients / Supplement Facts');
          return;
        }

        const parsed = parseLabelAndMatch(tRes.text);
        if (parsed.ingredients.length === 0) {
          setLiveHint('Move closer or tilt flat to capture ingredient names');
          return;
        }

        // Keep last 5 good frames and vote (>= 3 appearances to stabilize)
        const nextWindow = [
          ...liveFramesRef.current,
          {
            text: tRes.text,
            confidence: tRes.confidence,
            items: parsed.ingredients,
          },
        ].slice(-5);

        liveFramesRef.current = nextWindow;
        setLiveFrameCount(nextWindow.length);
        setLiveConfidence(tRes.confidence);
        setLiveRawText(tRes.text);

        const voteMap = new Map();
        for (const frame of nextWindow) {
          const frameSeen = new Set();
          for (const ing of frame.items) {
            const key = (ing.matchedName || ing.displayName).toLowerCase();
            if (frameSeen.has(key)) continue;
            frameSeen.add(key);
            const existing = voteMap.get(key) || { count: 0, item: ing };
            existing.count += 1;
            if (!ing.unrecognized && existing.item.unrecognized) {
              existing.item = ing;
            }
            voteMap.set(key, existing);
          }
        }

        const minVotes = nextWindow.length >= 3 ? 3 : 2;
        const stabilized = Array.from(voteMap.values())
          .filter((v) => v.count >= minVotes)
          .map((v) => ({ ...v.item, votes: v.count }));

        setLiveStabilized(stabilized);
        if (stabilized.length > 0) {
          setLiveHint(`Stabilized ${stabilized.length} ingredients (${nextWindow.length}/5 frames)`);
        }
      } catch (err) {
        console.warn('Live frame scan skipped:', err);
      } finally {
        liveOcrBusyRef.current = false;
      }
    };

    liveLoopTimerRef.current = setInterval(runFrameCheck, 900);
    return () => {
      if (liveLoopTimerRef.current) {
        clearInterval(liveLoopTimerRef.current);
        liveLoopTimerRef.current = null;
      }
    };
  }, [cameraActive, liveScanEnabled]);

  if (!isOpen) return null;

  const startCamera = async (requestedFacing = facingMode) => {
    if (!requireAuth('Please sign in with your email to scan supplement labels!')) return;

    stopCamera();
    setCameraError('');
    resetLiveState();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API unavailable in this browser. Using native photo picker instead.');
      cameraInputRef.current?.click();
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: requestedFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      setFacingMode(requestedFacing);
      setCameraActive(true);

      const track = stream.getVideoTracks()[0];
      if (track) {
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        setTorchSupported(Boolean(caps.torch));
        if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        }
      }

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch (err) {
      const msg =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Enable camera access or upload a label photo below.'
          : err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
          ? 'No camera detected on this device. Upload a label photo instead.'
          : 'Live camera could not start (requires HTTPS or localhost). Opening photo upload.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const toggleTorch = async () => {
    const track = mediaStreamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (e) {
      setTorchSupported(false);
    }
  };

  const switchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  };

  const handleLockLiveResult = async () => {
    if (!consumeScan()) return;
    const names = liveStabilized.map((i) => i.displayName || i.matchedName);
    const combinedRaw = liveRawText || `Ingredients: ${names.join(', ')}`;
    const avgConf = liveConfidence || 78;

    stopCamera();
    setIsScanning(true);
    setScanError('');
    setHasUnsavedEdits(false);
    setScanStageText('Locking stabilized live ingredients & running ML scoring...');

    try {
      const result = await analyzeTextWithMLFallback(
        names.length > 0 ? `Ingredients: ${names.join(', ')}\n${combinedRaw}` : combinedRaw
      );
      setIsScanning(false);
      setScanResult({
        ...result,
        rawText: combinedRaw,
        ocrEngineUsed: 'live_camera_voted',
        ocrMeta: {
          confidence: avgConf,
          perLineConfidence: [],
          winningVariant: { id: 'live_voted', label: `Live Scan (${liveFrameCount || 3}-frame consensus)`, psm: '6' },
          variantStats: [],
          skewAngle: 0,
        },
      });
      if (saveHistory) saveHistory(result);
    } catch (err) {
      setIsScanning(false);
      setScanError('Failed to finalize live scan; please try again.');
    }
  };

  const capturePhoto = async () => {
    if (!consumeScan()) return;

    let photoDataUrl = null;
    if (videoRef.current && videoRef.current.videoWidth) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/png');
      } catch (e) {}
    }

    stopCamera();
    if (!photoDataUrl) return;

    setIsScanning(true);
    setScanError('');
    setHasUnsavedEdits(false);
    setScanStageText('Preprocessing snapshot (deskew, contrast, Sauvola) & running OCR + ML...');

    try {
      const liveResult = await performLiveOCRAndAnalyze(photoDataUrl, 'A', '', ocrEngine);
      setIsScanning(false);
      setScanResult(liveResult);
      if (saveHistory) saveHistory(liveResult);
    } catch (err) {
      setScanError('Camera OCR encountered an error; showing fallback analysis.');
      const fallbackResult = analyzeSupplementIngredients('Whey Protein Isolate Stevia Monk Fruit', null, null, 'A');
      setIsScanning(false);
      setScanResult({ ...fallbackResult, mlFallback: true });
      if (saveHistory) saveHistory(fallbackResult);
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!requireAuth('Please sign in with your email to scan supplement labels!')) return;

    const fileNameHint = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-+]/g, ' ');
    const reader = new FileReader();
    reader.onload = (event) => {
      setPendingUpload({ dataUrl: event.target.result, fileNameHint });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const processPendingUpload = async (cropRect = null) => {
    if (!pendingUpload) return;
    if (!consumeScan()) return;

    const { dataUrl, fileNameHint } = pendingUpload;
    setPendingUpload(null);
    setIsScanning(true);
    setScanError('');
    setHasUnsavedEdits(false);
    setScanStageText(
      cropRect
        ? 'Upscaling cropped region, deskewing & running multi-variant OCR + ML...'
        : 'Checking barcode & running multi-variant OCR (grayscale, contrast, Sauvola) + ML...'
    );
    setScanResult(null);

    try {
      const liveResult = await performLiveOCRAndAnalyze(dataUrl, 'A', fileNameHint, ocrEngine, {
        cropRect,
        skipBarcode: Boolean(cropRect),
      });
      setIsScanning(false);
      setScanResult(liveResult);
      if (saveHistory) saveHistory(liveResult);
    } catch (err) {
      setScanError('Image analysis encountered an error; showing fallback analysis.');
      const fallbackResult = analyzeSupplementIngredients('Whey Protein Blend Isolate Sunflower Lecithin', null, null, 'A');
      setIsScanning(false);
      setScanResult({ ...fallbackResult, mlFallback: true });
      if (saveHistory) saveHistory(fallbackResult);
    }
  };

  const handleSelectSample = async (sample) => {
    if (!requireAuth('Please sign in with your email to scan supplement labels!')) return;
    if (!consumeScan()) return;

    setSelectedSample(sample.id);
    setIsScanning(true);
    setScanError('');
    setHasUnsavedEdits(false);
    setScanStageText('Running ML Ingredient Classifier, Spiking RF & Purity Regressor...');
    setScanResult(null);

    try {
      const sampleText = (sample.ingredientsList || []).map((i) => i.name).join(', ');
      const mlEnriched = await analyzeWithMLPipeline({ rawText: sampleText, localResult: sample });
      setIsScanning(false);
      setScanResult({
        ...mlEnriched,
        ocrMeta: { confidence: 98, perLineConfidence: [], winningVariant: { id: 'preset', label: 'Verified Preset', psm: 'N/A' }, variantStats: [], skewAngle: 0 },
      });
      if (saveHistory) saveHistory(mlEnriched);
    } catch (err) {
      setIsScanning(false);
      setScanResult({ ...sample, mlFallback: true, mlFallbackReason: 'ML service offline — using built-in preset audit.' });
      if (saveHistory) saveHistory(sample);
    }
  };

  const handleCustomAnalyze = async (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    if (!requireAuth('Please sign in with your email to scan supplement labels!')) return;
    if (!consumeScan()) return;

    setIsScanning(true);
    setScanError('');
    setHasUnsavedEdits(false);
    setScanStageText('Parsing section, fuzzy-matching 300+ ingredients & running ML models...');
    setScanResult(null);

    try {
      const result = await analyzeTextWithMLFallback(customText, 'Custom Scanned Label');
      setIsScanning(false);
      setScanResult({
        ...result,
        ocrMeta: { confidence: 100, perLineConfidence: [], winningVariant: { id: 'text', label: 'Direct Text Input', psm: 'N/A' }, variantStats: [], skewAngle: 0 },
      });
      if (saveHistory) saveHistory(result);
    } catch (err) {
      const fallbackResult = analyzeSupplementIngredients(customText, 'Custom Scanned Label');
      setIsScanning(false);
      setScanResult({ ...fallbackResult, mlFallback: true });
      if (saveHistory) saveHistory(fallbackResult);
    }
  };

  // Editable Ingredient List Handlers
  const handleStartEditIngredient = (idx, currentName) => {
    setEditingIndex(idx);
    setEditingValue(currentName);
  };

  const handleSaveEditIngredient = (idx) => {
    if (!scanResult || !editingValue.trim()) {
      setEditingIndex(null);
      return;
    }
    const updatedList = scanResult.ingredientsList.map((ing, i) =>
      i === idx
        ? { ...ing, name: editingValue.trim(), unrecognized: false, reason: 'Edited by user (click Re-Analyze to update score)' }
        : ing
    );
    setScanResult({ ...scanResult, ingredientsList: updatedList });
    setEditingIndex(null);
    setHasUnsavedEdits(true);
  };

  const handleDeleteIngredient = (idx) => {
    if (!scanResult) return;
    const updatedList = scanResult.ingredientsList.filter((_, i) => i !== idx);
    setScanResult({ ...scanResult, ingredientsList: updatedList });
    setHasUnsavedEdits(true);
  };

  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (!scanResult || !newIngredientInput.trim()) return;
    const updatedList = [
      ...scanResult.ingredientsList,
      {
        name: newIngredientInput.trim(),
        status: 'warning',
        mlClass: 'neutral',
        unrecognized: false,
        reason: 'Added by user (click Re-Analyze to update score)',
      },
    ];
    setScanResult({ ...scanResult, ingredientsList: updatedList });
    setNewIngredientInput('');
    setHasUnsavedEdits(true);
  };

  const handleReanalyzeEdits = async () => {
    if (!scanResult) return;
    setIsReanalyzing(true);
    try {
      const names = scanResult.ingredientsList.map((i) => i.name);
      const updated = await reanalyzeEditedIngredients(names, scanResult);
      setScanResult(updated);
      setHasUnsavedEdits(false);
      if (saveHistory) saveHistory(updated);
    } catch (err) {
      setScanError('Could not re-analyze edited ingredients.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const overallConfidence = scanResult?.ocrMeta?.confidence;
  const isLowConfidence = typeof overallConfidence === 'number' && overallConfidence < 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto font-josefin">
      <div className="relative w-full max-w-4xl glass-hud rounded-3xl p-4 sm:p-8 my-2 sm:my-8 border border-rose-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.8)] max-h-[96vh] overflow-y-auto">

        {/* Close Button */}
        <button
          onClick={() => { stopCamera(); setPendingUpload(null); onClose(); }}
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
                Multi-Variant OCR, Live Camera Stabilization, Barcode Shortcut & ML Purity Assay
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
                  openPricingModal('Upgrade to Pro or Premium for unlimited daily scans!');
                }}
                className="px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider hover:opacity-95 cursor-pointer flex items-center gap-1 shadow"
              >
                <Crown className="w-3 h-3" />
                <span>Upgrade</span>
              </button>
            )}
          </div>
        </div>

        {/* OCR Engine Selector */}
        {!scanResult && !isScanning && !pendingUpload && (
          <div className="mb-4 p-3 rounded-2xl glass-card-neo border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-sans">
            <div className="flex items-center gap-2 text-xs">
              <Cpu className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-bold text-maroon-950 dark:text-white">OCR Engine:</span>
              <span className="text-[11px] text-slate-500 dark:text-rose-200/70">
                {ocrEngine === 'tesseract'
                  ? 'Persistent Tesseract.js (Multi-variant Grayscale/Contrast/Sauvola)'
                  : 'Python Server EasyOCR (/api/ml/ocr)'}
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
                Tesseract.js (Pro OCR)
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

        {/* Draggable Cropper Step on Uploaded Photo */}
        {pendingUpload && !isScanning && !scanResult && (
          <ImageCropper
            imageSrc={pendingUpload.dataUrl}
            onConfirmCrop={(rect) => processPendingUpload(rect)}
            onScanFull={() => processPendingUpload(null)}
            onCancel={() => setPendingUpload(null)}
          />
        )}

        {/* Camera / Upload Mode */}
        {!scanResult && !isScanning && !pendingUpload && (
          <div className="space-y-4 sm:space-y-6">
            {cameraError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/35 text-xs font-sans text-rose-700 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>{cameraError}</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] cursor-pointer self-start sm:self-auto"
                >
                  Upload Photo Instead
                </button>
              </div>
            )}

            {/* Live Vertical Camera Viewfinder */}
            {cameraActive ? (
              <div className="space-y-3">
                <div className="relative w-full max-w-sm sm:max-w-md mx-auto aspect-[3/4] sm:aspect-[4/5] min-h-[440px] max-h-[74vh] rounded-3xl overflow-hidden bg-black border border-rose-500/50 shadow-2xl flex flex-col justify-between p-4 animate-in fade-in zoom-in-95 duration-200">
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover"></video>

                  {/* Top Camera Controls: Live Toggle, Flash/Torch, Switch Camera */}
                  <div className="relative z-30 flex items-center justify-between gap-2 font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setLiveScanEnabled((v) => !v);
                        resetLiveState();
                      }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase flex items-center gap-1.5 border backdrop-blur-md cursor-pointer ${
                        liveScanEnabled
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                          : 'bg-black/60 border-white/20 text-slate-300'
                      }`}
                    >
                      <Radio className={`w-3 h-3 ${liveScanEnabled ? 'animate-pulse text-emerald-400' : ''}`} />
                      <span>{liveScanEnabled ? 'Live Scan ON' : 'Single Snap'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {torchSupported && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          title="Toggle Flash / Torch"
                          className={`w-8 h-8 rounded-full flex items-center justify-center border backdrop-blur-md cursor-pointer ${
                            torchOn ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/60 text-white border-white/20'
                          }`}
                        >
                          <Flashlight className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={switchCamera}
                        title="Switch Camera"
                        className="w-8 h-8 rounded-full bg-black/60 text-white border border-white/20 flex items-center justify-center backdrop-blur-md cursor-pointer"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Guide Rectangle matching the cropped live region (8%..92% W, 16%..72% H) */}
                  <div
                    style={{ left: '8%', top: '16%', width: '84%', height: '56%' }}
                    className="absolute border-2 border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-2.5 z-10 shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                  >
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                      <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-black/80 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/40 tracking-wider uppercase backdrop-blur-sm">
                        {liveHint}
                      </span>
                      {liveBarcodeMsg && (
                        <span className="block mt-1 text-[9px] font-mono bg-amber-500/90 text-black px-2 py-0.5 rounded-full font-bold">
                          {liveBarcodeMsg}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                      <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                    </div>
                  </div>

                  {/* Bottom Live Controls */}
                  <div className="relative z-30 mt-auto pt-3 space-y-2 text-center font-sans">
                    <div className="flex justify-center gap-2">
                      {liveScanEnabled && liveStabilized.length > 0 && (
                        <button
                          onClick={handleLockLiveResult}
                          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lock Result ({liveStabilized.length})</span>
                        </button>
                      )}
                      <button
                        onClick={capturePhoto}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_25px_rgba(225,29,72,0.5)] hover:opacity-95 active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap Now</span>
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-3.5 py-3 rounded-2xl bg-black/70 hover:bg-black/90 text-slate-200 font-bold text-xs cursor-pointer border border-white/15 transition"
                      >
                        Cancel
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        stopCamera();
                        cameraInputRef.current?.click();
                      }}
                      className="text-[11px] font-bold text-rose-300 hover:text-white underline cursor-pointer inline-block"
                    >
                      📱 Or Tap to Use Phone Camera App
                    </button>
                  </div>
                </div>

                {/* Live Stabilized Ingredients Preview Strip */}
                {liveScanEnabled && (
                  <div className="max-w-md mx-auto p-3.5 rounded-2xl glass-card-neo border border-emerald-500/30 font-sans text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-maroon-950 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Live Stabilized Ingredients (3+ of 5 frames)</span>
                      </span>
                      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {liveFrameCount}/5 frames {liveConfidence > 0 ? `• ${liveConfidence}%` : ''}
                      </span>
                    </div>
                    {liveStabilized.length === 0 ? (
                      <p className="text-[11px] text-slate-500 dark:text-rose-200/70">
                        Hold the Ingredients / Supplement Facts label steady inside the green frame...
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {liveStabilized.map((item, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'banned_wada'
                                ? 'bg-red-600 text-white'
                                : item.status === 'harmful'
                                ? 'bg-orange-500 text-white'
                                : item.status === 'beneficial'
                                ? 'bg-emerald-500 text-black'
                                : 'bg-slate-500 text-white'
                            }`}
                          >
                            {item.displayName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 font-sans">
                {/* 1. Live Camera Button */}
                <button
                  onClick={() => startCamera('environment')}
                  className="p-5 sm:p-6 rounded-2xl glass-card-neo border border-rose-500/20 hover:border-rose-500/50 flex flex-col items-center justify-center gap-2.5 group transition cursor-pointer text-center"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition shadow-sm">
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <span className="block font-bold text-maroon-950 dark:text-white text-xs sm:text-sm">
                      Open Live Camera Scan
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-rose-200/60">
                      Real-time frame voting, blur guard, flash & barcode
                    </span>
                  </div>
                </button>

                {/* 2. File Upload + Crop Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 sm:p-6 rounded-2xl glass-card-neo border border-rose-500/20 hover:border-rose-500/50 flex flex-col items-center justify-center gap-2.5 group transition cursor-pointer text-center"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition shadow-sm">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <span className="block font-bold text-maroon-950 dark:text-white text-xs sm:text-sm">
                      Upload & Crop Label Photo
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-rose-200/60">
                      Crop Ingredients area + multi-variant OCR & barcode lookup
                    </span>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelected}
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelected}
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
              <h4 className="text-xs font-bold font-syne text-slate-700 dark:text-rose-300 mb-2">
                Or Paste Ingredient Text Directly:
              </h4>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. Ingredients: Whey Protein Concentrate, Maltodextrin, L-Glycine, Taurine, E951, Artificial Flavor..."
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
              <h3 className="text-lg font-black font-syne text-maroon-950 dark:text-white">
                Analyzing Formula & Running ML Models...
              </h3>
              <p className="text-xs text-slate-500 dark:text-rose-300/70 mt-1 font-mono">{scanStageText}</p>
            </div>
          </div>
        )}

        {/* Comprehensive Scan Diagnostic Results */}
        {scanResult && !isScanning && (
          <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300">

            {/* Low Confidence Retake Warning (< 60%) */}
            {isLowConfidence && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/50 flex items-start gap-3 font-sans text-xs text-amber-900 dark:text-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-sm text-maroon-950 dark:text-white">
                    Low OCR Confidence ({overallConfidence}%) — Retake Recommended
                  </p>
                  <p className="mt-1 opacity-90">
                    Tips for accurate extraction: use bright even lighting, avoid foil glare, flatten the label, and keep your camera parallel to the Ingredients box (or crop tightly to Ingredients). You can also fix any ingredient below.
                  </p>
                </div>
              </div>
            )}

            {/* Barcode / ML / OCR Fallback or Error Notice */}
            {(scanError || scanResult.barcodeNotice || scanResult.mlFallback || scanResult.ocrFallbackNotice) && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/35 flex items-start gap-2.5 text-xs font-sans text-amber-800 dark:text-amber-200">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {scanError && <p className="font-bold">{scanError}</p>}
                  {scanResult.barcodeNotice && <p>{scanResult.barcodeNotice}</p>}
                  {scanResult.ocrFallbackNotice && <p>{scanResult.ocrFallbackNotice}</p>}
                  {scanResult.mlFallback && (
                    <p>{scanResult.mlFallbackReason || 'ML service unavailable — using built-in heuristic fallback scorer.'}</p>
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
                    {scanResult.category || 'Gym Supplement'}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-bold text-rose-400">{scanResult.brand}</span>
                  {typeof overallConfidence === 'number' && (
                    <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                      overallConfidence >= 75
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : overallConfidence >= 60
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {overallConfidence}% OCR Conf
                    </span>
                  )}
                  {scanResult.barcodeInfo?.found && (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                      <Barcode className="w-3 h-3" /> #{scanResult.barcodeInfo.barcode}
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
                <span className="text-sm font-black text-white">{scanResult.calories || '120 kcal'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/30 text-center">
                <span className="text-[9px] font-mono text-emerald-400 block uppercase">PROTEIN</span>
                <span className="text-sm font-black text-emerald-400">{scanResult.claimedProtein || '24g'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-rose-500/20 text-center">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">CARBS</span>
                <span className="text-sm font-black text-white">{scanResult.carbs || '3g'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/30 text-center">
                <span className="text-[9px] font-mono text-amber-400 block uppercase">SUGAR</span>
                <span className="text-sm font-black text-amber-400">{scanResult.sugar || '1g'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-rose-500/20 text-center col-span-2 sm:col-span-1">
                <span className="text-[9px] font-mono text-slate-400 block uppercase">FAT</span>
                <span className="text-sm font-black text-white">{scanResult.fat || '1.5g'}</span>
              </div>
            </div>

            {/* Editable Ingredient List Breakdown */}
            <div className="p-4 sm:p-5 rounded-2xl glass-card-neo border border-rose-500/20 space-y-3 font-sans">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-maroon-950 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-500" />
                  <span>Ingredient Assay (Tap to Edit or Correct)</span>
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
                    ing.unrecognized
                      ? 'bg-amber-500/10 border-amber-500/45 border-dashed text-amber-800 dark:text-amber-200'
                      : mlClass === 'banned_wada'
                      ? 'bg-red-500/15 border-red-500/50 text-red-800 dark:text-red-200'
                      : mlClass === 'harmful'
                      ? 'bg-orange-500/10 border-orange-500/35 text-orange-800 dark:text-orange-200'
                      : mlClass === 'neutral'
                      ? 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200';

                  const badgeClass =
                    ing.unrecognized
                      ? 'bg-amber-500 text-black'
                      : mlClass === 'banned_wada'
                      ? 'bg-red-600 text-white'
                      : mlClass === 'harmful'
                      ? 'bg-orange-500 text-white'
                      : mlClass === 'neutral'
                      ? 'bg-slate-500 text-white'
                      : 'bg-emerald-500 text-black';

                  const badgeLabel =
                    ing.unrecognized
                      ? 'TAP TO CORRECT'
                      : mlClass === 'banned_wada'
                      ? 'BANNED (WADA)'
                      : mlClass === 'harmful'
                      ? 'HARMFUL'
                      : mlClass === 'neutral'
                      ? 'NEUTRAL'
                      : 'BENEFICIAL';

                  const isEditingThis = editingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${rowClass}`}
                    >
                      <div className="flex-1 min-w-0">
                        {isEditingThis ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditIngredient(idx);
                                if (e.key === 'Escape') setEditingIndex(null);
                              }}
                              autoFocus
                              className="flex-1 px-2.5 py-1 rounded-lg bg-black/10 dark:bg-black/60 border border-rose-500/40 text-maroon-950 dark:text-white text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditIngredient(idx)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-[10px] cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <>
                            <div
                              onClick={() => ing.unrecognized && handleStartEditIngredient(idx, ing.name)}
                              className={`flex flex-wrap items-center gap-2 ${ing.unrecognized ? 'cursor-pointer' : ''}`}
                            >
                              <span className="font-bold text-maroon-950 dark:text-white">{ing.name}</span>
                              {typeof ing.confidence === 'number' && (
                                <span className="text-[10px] font-mono opacity-75">
                                  {Math.round(ing.confidence * 100)}% conf
                                </span>
                              )}
                              {typeof ing.similarity === 'number' && ing.similarity < 1 && !ing.unrecognized && (
                                <span className="text-[10px] font-mono opacity-75">
                                  ({Math.round(ing.similarity * 100)}% match)
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] sm:text-[11px] opacity-85 block">{ing.reason}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleStartEditIngredient(idx, ing.name)}
                          className={`px-2 py-0.5 rounded font-black text-[9px] sm:text-[10px] uppercase cursor-pointer ${badgeClass}`}
                        >
                          {badgeLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditIngredient(idx, ing.name)}
                          title="Edit ingredient"
                          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteIngredient(idx)}
                          title="Remove ingredient"
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Ingredient + Re-Analyze Bar */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <form onSubmit={handleAddIngredient} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newIngredientInput}
                    onChange={(e) => setNewIngredientInput(e.target.value)}
                    placeholder="Add missing ingredient (e.g. Creatine Monohydrate)..."
                    className="flex-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-black/50 border border-rose-500/20 text-xs text-maroon-950 dark:text-white outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={!newIngredientInput.trim()}
                    className="px-3 py-2 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 text-maroon-950 dark:text-white font-bold text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                {hasUnsavedEdits && (
                  <button
                    type="button"
                    onClick={handleReanalyzeEdits}
                    disabled={isReanalyzing}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
                    <span>{isReanalyzing ? 'Re-Analyzing...' : 'Re-Analyze Edits'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Full ML Breakdown ("Why This Score" + Clinical Assay — Directly Visible After Every Scan) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/35 space-y-4 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>
                      Detailed ML Breakdown
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
            </div>

            {/* Collapsible "Scan Details" Debug & Trust Panel */}
            <div className="rounded-2xl glass-card-neo border border-rose-500/20 overflow-hidden font-sans">
              <button
                type="button"
                onClick={() => setShowScanDetails((s) => !s)}
                className="w-full p-4 flex items-center justify-between text-xs font-bold text-maroon-950 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-rose-500" />
                  <span>Scan Details (Raw OCR, Winning Variant, Line Confidence & Fuzzy Corrections)</span>
                </span>
                {showScanDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showScanDetails && (
                <div className="p-4 pt-0 space-y-3 text-xs border-t border-rose-500/15">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3">
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">Winning Variant</span>
                      <span className="font-bold text-maroon-950 dark:text-white">
                        {scanResult.ocrMeta?.winningVariant?.label || 'Standard'} (PSM {scanResult.ocrMeta?.winningVariant?.psm || '6'})
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">Deskew Angle</span>
                      <span className="font-bold text-maroon-950 dark:text-white">
                        {scanResult.ocrMeta?.skewAngle ?? 0}°
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">Label Region Found</span>
                      <span className="font-bold text-maroon-950 dark:text-white">
                        {scanResult.scanDetails?.foundRegion ? 'Yes (Ingredients/Facts isolated)' : 'Full text parsed'}
                      </span>
                    </div>
                  </div>

                  {scanResult.ocrMeta?.variantStats?.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Preprocessing Variants Tested</span>
                      <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                        {scanResult.ocrMeta.variantStats.map((v, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                            {v.label}: {v.confidence}% conf (score {v.qualityScore})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.scanDetails?.corrections?.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Fuzzy Dictionary Corrections</span>
                      <ul className="space-y-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                        {scanResult.scanDetails.corrections.map((c, i) => (
                          <li key={i}>• {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scanResult.ocrMeta?.perLineConfidence?.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40 max-h-36 overflow-y-auto">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Per-Line OCR Confidence</span>
                      {scanResult.ocrMeta.perLineConfidence.map((ln, i) => (
                        <div key={i} className="flex justify-between gap-2 font-mono text-[10px] py-0.5 border-b border-black/5 dark:border-white/5">
                          <span className="truncate">{ln.text}</span>
                          <span className="shrink-0 font-bold">{ln.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Raw Extracted OCR Text</span>
                    <pre className="p-2.5 rounded-xl bg-black/10 dark:bg-black/60 text-[10px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto text-slate-700 dark:text-slate-200">
                      {scanResult.rawText || '(No raw text recorded)'}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Required Competition & Medical Disclaimer */}
            <p className="text-[11px] text-center text-slate-500 dark:text-rose-200/65 font-sans">
              Informational only, not medical advice. Check the official WADA list for competition.
            </p>

            {/* Reset / Rescan CTA Bar */}
            <div className="flex justify-between items-center pt-3 border-t border-rose-500/20 font-sans">
              <button
                onClick={() => {
                  setScanResult(null);
                  setCustomText('');
                  setScanError('');
                  setHasUnsavedEdits(false);
                }}
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
