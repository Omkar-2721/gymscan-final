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
  FileDown,
  Share2,
  Star,
  GitCompare,
  ShieldCheck,
  Printer,
} from 'lucide-react';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';
import {
  analyzeSupplementIngredients,
  analyzeTextWithMLFallback,
  performLiveOCRAndAnalyze,
  reanalyzeEditedIngredients,
  suggestSaferAlternatives,
} from '../utils/analyzer';
import { analyzeWithMLPipeline, checkMLHealth } from '../utils/mlService';
import {
  extractAndMatchPipeline,
  scoreReviewedExtraction,
  PIPELINE_STAGES,
} from '../scan/pipeline';
import { BANNED_LIST_DISCLAIMER } from '../data/bannedSubstances';
import { downloadScanReportPDF, buildShareableReportUrl } from '../utils/pdfReport';
import ClinicalAuditReport from './ClinicalAuditReport';
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

export default function ScannerTool({
  isOpen,
  onClose,
  onSaveToHistory,
  onSaveHistory,
  mlHealth: propMlHealth = null,
  onRefreshMlHealth = null,
  initialResult = null,
  favoriteIds = [],
  onToggleFavorite = null,
  onSendToCompare = null,
}) {
  const {
    user,
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
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [localMlHealth, setLocalMlHealth] = useState({ online: false, checking: true, status: 'checking' });

  useEffect(() => {
    if (isOpen && initialResult) {
      setScanResult(initialResult);
      setIsScanning(false);
      setPendingUpload(null);
      setHasUnsavedEdits(false);
    }
  }, [isOpen, initialResult]);

  const mlStatus = propMlHealth || localMlHealth;
  const triggerMlHealthCheck = async () => {
    if (onRefreshMlHealth) {
      return onRefreshMlHealth();
    }
    setLocalMlHealth((prev) => ({ ...prev, checking: true }));
    const res = await checkMLHealth();
    setLocalMlHealth({ ...res, checking: false });
  };

  useEffect(() => {
    if (isOpen && !propMlHealth) {
      triggerMlHealthCheck();
    } else if (isOpen && onRefreshMlHealth) {
      onRefreshMlHealth();
    }
  }, [isOpen]);

  // Upload Cropper & Multi-Image Queue State (up to 4 photos per product)
  const [pendingUpload, setPendingUpload] = useState(null); // { dataUrl, fileNameHint }
  const [queuedPhotos, setQueuedPhotos] = useState([]); // [{ dataUrl, slot, fileNameHint }]
  const [barcodeInput, setBarcodeInput] = useState('');
  const [pipelineStage, setPipelineStage] = useState('Capturing');
  const [pendingExtraction, setPendingExtraction] = useState(null); // Stage 2 review object
  const [healthProfile, setHealthProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('gymscan_health_profile_v1');
      return saved ? JSON.parse(saved) : {
        drug_tested_athlete: false,
        vegan: false,
        under_18: false,
        kidney_conscious: false,
        diabetic: false,
        allergies: [],
      };
    } catch {
      return {
        drug_tested_athlete: false,
        vegan: false,
        under_18: false,
        kidney_conscious: false,
        diabetic: false,
        allergies: [],
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gymscan_health_profile_v1', JSON.stringify(healthProfile));
    } catch (_) {}
  }, [healthProfile]);

  const toggleProfileFlag = (key) => {
    setHealthProfile((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllergy = (allergen) => {
    setHealthProfile((prev) => {
      const list = Array.isArray(prev.allergies) ? prev.allergies : [];
      return {
        ...prev,
        allergies: list.includes(allergen)
          ? list.filter((a) => a !== allergen)
          : [...list, allergen],
      };
    });
  };

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
  const [nutritionBasis, setNutritionBasis] = useState('per_serving'); // 'per_serving' | 'per_100g'
  const [editMode, setEditMode] = useState(false);
  const [ingredientFilter, setIngredientFilter] = useState('all'); // all | safe | harmful | banned
  const [evidenceImageUrl, setEvidenceImageUrl] = useState(null);
  const [isClinicalPrintOpen, setIsClinicalPrintOpen] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const liveFramesRef = useRef([]);
  const liveOcrBusyRef = useRef(false);
  const liveLoopTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const modalCardRef = useRef(null);
  const appendPhotoModeRef = useRef(false);

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
    let photoDataUrl = null;
    if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/png');
      } catch (e) {}
    }

    if (!photoDataUrl) {
      setScanError('Camera video frame not ready yet — wait 1 second for preview or use Upload Photo.');
      return;
    }

    if (!consumeScan()) return;
    stopCamera();

    setQueuedPhotos([{ dataUrl: photoDataUrl, slot: 'Camera Snap', fileNameHint: 'Camera Scan' }]);
    await runExtractionStage({
      files: [photoDataUrl],
      manualProductName: 'Camera Scanned Label',
      evidenceUrl: photoDataUrl,
    });
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleFileSelected = async (e) => {
    const selectedFiles = Array.from(e.target.files || []).slice(0, 4);
    e.target.value = '';
    if (selectedFiles.length === 0) return;
    if (!requireAuth('Please sign in with your email to scan supplement labels!')) return;

    const appendMode = appendPhotoModeRef.current;
    appendPhotoModeRef.current = false;

    const slotNames = ['Front Label', 'Ingredients Panel', 'Nutrition Facts', 'Warnings / Stamp'];
    try {
      const loadedItems = await Promise.all(
        selectedFiles.map(async (file, idx) => ({
          dataUrl: await readFileAsDataUrl(file),
          slot: slotNames[idx] || `Photo ${idx + 1}`,
          fileNameHint: file.name.replace(/\.[^/.]+$/, '').replace(/[_\-+]/g, ' '),
        }))
      );

      if (appendMode && queuedPhotos.length > 0) {
        const combined = [...queuedPhotos, ...loadedItems].slice(0, 4).map((it, idx) => ({
          ...it,
          slot: slotNames[idx] || it.slot,
        }));
        setQueuedPhotos(combined);
        if (pendingExtraction) {
          if (!consumeScan()) return;
          await runExtractionStage({
            files: combined.map((q) => q.dataUrl),
            manualProductName: combined[0]?.fileNameHint || pendingExtraction.productName || '',
            evidenceUrl: combined[0]?.dataUrl,
          });
        }
        return;
      }

      if (!consumeScan()) return;
      setQueuedPhotos(loadedItems);
      await runExtractionStage({
        files: loadedItems.map((q) => q.dataUrl),
        manualProductName: loadedItems[0]?.fileNameHint || '',
        evidenceUrl: loadedItems[0]?.dataUrl,
      });
    } catch (err) {
      setScanError(err?.message || 'Failed to load uploaded image file.');
    }
  };

  const runExtractionStage = async ({
    files = [],
    cropRect = null,
    barcode = null,
    manualText = '',
    manualProductName = '',
    evidenceUrl = null,
  }) => {
    setIsScanning(true);
    setScanError('');
    setHasUnsavedEdits(false);
    setPendingExtraction(null);
    setScanResult(null);
    if (evidenceUrl) setEvidenceImageUrl(evidenceUrl);
    modalCardRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });

    try {
      const { extracted } = await extractAndMatchPipeline({
        files,
        cropRect,
        barcode,
        manualText,
        manualProductName,
        onStageChange: (stage, msg) => {
          setPipelineStage(stage);
          if (msg) setScanStageText(msg);
        },
      });
      setIsScanning(false);
      setPendingExtraction(extracted);
      modalCardRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[GymScan Extraction Error]', err);
      setIsScanning(false);
      setScanError(err?.message || 'Extraction failed — try cropping tightly to the Ingredients panel.');
    }
  };

  const handleAnalyzeQueuedPhotos = async (cropRect = null) => {
    if (queuedPhotos.length === 0) return;
    if (!consumeScan()) return;
    const urls = queuedPhotos.map((q) => q.dataUrl);
    const hint = queuedPhotos[0]?.fileNameHint || '';
    setPendingUpload(null);
    await runExtractionStage({
      files: urls,
      cropRect,
      manualProductName: hint,
      evidenceUrl: urls[0],
    });
  };

  const handleBarcodeLookupSubmit = async (e) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;
    if (!requireAuth('Please sign in with your email to scan barcodes!')) return;
    if (!consumeScan()) return;
    await runExtractionStage({ barcode: code });
  };

  const handleConfirmExtractionAnalysis = async () => {
    if (!pendingExtraction) return;
    setIsScanning(true);
    setScanError('');
    try {
      const result = await scoreReviewedExtraction({
        extracted: pendingExtraction,
        healthProfile,
        useMLService: true,
        onStageChange: (stage, msg) => {
          setPipelineStage(stage);
          if (msg) setScanStageText(msg);
        },
      });
      setPendingExtraction(null);
      setIsScanning(false);
      setScanResult(result);
      if (saveHistory) saveHistory(result);
    } catch (err) {
      setIsScanning(false);
      setScanError('Analysis error — please review ingredients and try again.');
    }
  };

  const processPendingUpload = async (cropRect = null) => {
    if (!pendingUpload) return;
    if (!consumeScan()) return;

    const { dataUrl, fileNameHint } = pendingUpload;
    setPendingUpload(null);
    await runExtractionStage({
      files: [dataUrl],
      cropRect,
      manualProductName: fileNameHint,
      evidenceUrl: dataUrl,
    });
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

    await runExtractionStage({
      manualText: customText,
      manualProductName: 'Pasted Supplement Label',
    });
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
  const isBlockedScore = Boolean(scanResult?.scoreBlocked || scanResult?.purityScore == null);
  const isLowConfidence = typeof overallConfidence === 'number' && overallConfidence < 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto font-josefin">
      <div
        ref={modalCardRef}
        className="relative w-full max-w-4xl glass-hud rounded-3xl p-4 sm:p-8 my-2 sm:my-8 border border-rose-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.8)] max-h-[96vh] overflow-y-auto"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
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

          <div className="flex flex-wrap items-center gap-2 font-sans self-start sm:self-auto">
            <span
              title={
                mlStatus?.online
                  ? 'Python ML Service + Built-In Purity Engine Live'
                  : 'Built-In AI OCR & Deterministic Purity Engine Live'
              }
              className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase border flex items-center gap-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 select-none"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{mlStatus?.online ? 'ML + AI Live' : 'AI Live'}</span>
            </span>
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

        {/* Global Error Banner (Always Visible Across All States) */}
        {scanError && !isScanning && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/45 text-xs font-sans text-red-700 dark:text-red-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="font-semibold">{scanError}</span>
            </div>
            <button
              type="button"
              onClick={() => setScanError('')}
              className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px] font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* OCR Engine Selector & Health Personalization Profile */}
        {!scanResult && !isScanning && !pendingUpload && !pendingExtraction && (
          <div className="mb-4 space-y-2.5 font-sans">
            <div className="p-3 rounded-2xl glass-card-neo border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs">
                <Cpu className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-bold text-maroon-950 dark:text-white">Extraction:</span>
                <span className="text-[11px] text-slate-500 dark:text-rose-200/70">
                  Gemini Vision Primary → Tesseract.js Fallback (1–4 Photos)
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
                  Auto (Vision + OCR)
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
                  EasyOCR Fallback
                </button>
              </div>
            </div>

            {/* Stage 4 Personalization Health Profile Strip */}
            <div className="p-3 rounded-2xl glass-card-neo border border-rose-500/15 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-rose-300">
                  Personal Health Profile (Tailors Risk Alerts):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'drug_tested_athlete', label: 'Tested Athlete (WADA)' },
                    { key: 'vegan', label: 'Vegan' },
                    { key: 'under_18', label: 'Under 18' },
                    { key: 'kidney_conscious', label: 'Kidney-Conscious' },
                    { key: 'diabetic', label: 'Diabetic' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleProfileFlag(item.key)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                        healthProfile[item.key]
                          ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                          : 'bg-black/5 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-white/10 hover:border-rose-500/40'
                      }`}
                    >
                      {healthProfile[item.key] ? '✓ ' : ''}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="font-bold text-slate-500 dark:text-slate-400 mr-1">Allergies:</span>
                {['Milk', 'Soy', 'Gluten', 'Nuts', 'Eggs'].map((al) => {
                  const active = (healthProfile.allergies || []).includes(al);
                  return (
                    <button
                      key={al}
                      type="button"
                      onClick={() => toggleAllergy(al)}
                      className={`px-2 py-0.5 rounded-full font-bold border transition cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-black/5 dark:bg-black/30 text-slate-500 dark:text-slate-300 border-white/10'
                      }`}
                    >
                      {active ? `No ${al}` : al}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Draggable Cropper Step on Uploaded Photo */}
        {pendingUpload && !isScanning && !scanResult && !pendingExtraction && (
          <ImageCropper
            imageSrc={pendingUpload.dataUrl}
            onConfirmCrop={(rect) => processPendingUpload(rect)}
            onScanFull={() => processPendingUpload(null)}
            onCancel={() => setPendingUpload(null)}
          />
        )}

        {/* Camera / Multi-Image / Barcode / Manual Mode */}
        {!scanResult && !isScanning && !pendingUpload && !pendingExtraction && (
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
                      Upload Label Photo(s)
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-rose-200/60">
                      Instant Vision/OCR audit (supports up to 4 angles)
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Stage 1 Multi-Image Queue (Up to 4 Photos of Same Product) */}
            {queuedPhotos.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/35 space-y-3 font-sans">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-maroon-950 dark:text-white">
                      Product Photo Queue ({queuedPhotos.length}/4 Angles)
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Add front, ingredients panel, nutrition table & warning stamp to merge all facts automatically.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {queuedPhotos.length < 4 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 text-xs font-bold text-maroon-950 dark:text-white cursor-pointer"
                      >
                        + Add Photo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setQueuedPhotos([])}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/15 text-red-500 text-xs font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {queuedPhotos.map((q, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-white/15 bg-black/60 aspect-square group">
                      <img src={q.dataUrl} alt={q.slot} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 right-1 text-center text-[9px] font-mono font-bold bg-black/80 text-white py-0.5 rounded">
                        {q.slot}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQueuedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white text-[10px] flex items-center justify-center hover:bg-red-600 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {queuedPhotos.length === 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingUpload({
                          dataUrl: queuedPhotos[0].dataUrl,
                          fileNameHint: queuedPhotos[0].fileNameHint,
                        });
                        setQueuedPhotos([]);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-white/20 text-maroon-950 dark:text-white font-bold text-xs cursor-pointer"
                    >
                      Crop Area Manually
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAnalyzeQueuedPhotos(null)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow"
                  >
                    Extract & Merge ({queuedPhotos.length} Photo{queuedPhotos.length > 1 ? 's' : ''}) →
                  </button>
                </div>
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

            {/* Barcode + Custom Paste Text Area */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <form onSubmit={handleBarcodeLookupSubmit} className="sm:col-span-5 p-4 rounded-2xl glass-card-neo border border-rose-500/20 flex flex-col justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold font-syne text-slate-700 dark:text-rose-300 flex items-center gap-1.5 mb-2">
                    <Barcode className="w-4 h-4 text-rose-500" />
                    <span>Enter Barcode (EAN/UPC)</span>
                  </h4>
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="e.g. 748927056587"
                    className="w-full bg-black/5 dark:bg-black/80 border border-rose-500/20 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-rose-100 outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!barcodeInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 text-maroon-950 dark:text-white font-black text-xs uppercase tracking-wider disabled:opacity-40 transition cursor-pointer"
                >
                  Lookup Barcode
                </button>
              </form>

              <div className="sm:col-span-7 p-4 rounded-2xl glass-card-neo border border-rose-500/20">
                <h4 className="text-xs font-bold font-syne text-slate-700 dark:text-rose-300 mb-2">
                  Or Paste Ingredient Text Directly:
                </h4>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. Ingredients: Whey Protein Concentrate, Maltodextrin, L-Glycine, Taurine, E951, Artificial Flavor..."
                  className="w-full h-16 bg-black/5 dark:bg-black/80 border border-rose-500/20 rounded-xl p-2.5 text-xs text-slate-800 dark:text-rose-100 outline-none focus:border-rose-500 resize-none font-mono"
                ></textarea>
                <button
                  onClick={handleCustomAnalyze}
                  disabled={!customText.trim()}
                  className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-40 transition cursor-pointer"
                >
                  Extract & Review Ingredients →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 6: 5-Step Progress Indicator State */}
        {isScanning && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 font-sans">
            <div className="relative w-16 h-16">
              <div className="w-full h-full rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin"></div>
              <Zap className="w-6 h-6 text-rose-500 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div className="w-full max-w-xl grid grid-cols-5 gap-1.5 px-2">
              {PIPELINE_STAGES.map((st, idx) => {
                const activeIdx = PIPELINE_STAGES.findIndex((p) => p.id === pipelineStage);
                const done = idx < activeIdx;
                const active = idx === activeIdx;
                return (
                  <div key={st.id} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-full h-1.5 rounded-full transition-all ${
                        done
                          ? 'bg-emerald-500'
                          : active
                          ? 'bg-rose-500 animate-pulse'
                          : 'bg-slate-200 dark:bg-white/10'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        done
                          ? 'text-emerald-500'
                          : active
                          ? 'text-rose-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div>
              <h3 className="text-lg font-black font-syne text-maroon-950 dark:text-white">
                {pipelineStage}...
              </h3>
              <p className="text-xs text-slate-500 dark:text-rose-300/70 mt-1 font-mono">{scanStageText}</p>
            </div>
          </div>
        )}

        {/* Stage 2 Editable Extraction Review Step (User edits before deterministic analysis) */}
        {pendingExtraction && !isScanning && !scanResult && (
          <div className="p-5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-rose-500/30 space-y-4 font-sans">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {evidenceImageUrl && (
                  <img
                    src={evidenceImageUrl}
                    alt="Scanned label"
                    className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0"
                  />
                )}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold block">
                    ✓ Extracted — Review Fields & Analyze
                  </span>
                  <h3 className="text-lg font-black text-maroon-950 dark:text-white">
                    Verify Extracted Label Data
                  </h3>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {queuedPhotos.length > 0 && queuedPhotos.length < 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      appendPhotoModeRef.current = true;
                      fileInputRef.current?.click();
                    }}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 text-maroon-950 dark:text-white cursor-pointer"
                  >
                    + Add Angle ({queuedPhotos.length}/4)
                  </button>
                )}
                {queuedPhotos.length >= 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingUpload({
                        dataUrl: queuedPhotos[0].dataUrl,
                        fileNameHint: queuedPhotos[0].fileNameHint,
                      });
                      setPendingExtraction(null);
                    }}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 text-maroon-950 dark:text-white cursor-pointer"
                  >
                    Crop Area
                  </button>
                )}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase ${
                  String(pendingExtraction.engineUsed || '').startsWith('gemini')
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                }`}>
                  Engine: {pendingExtraction.engineUsed || 'tesseract.js'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-200">
                  Confidence: {pendingExtraction.fieldConfidence?.overall ?? 0}%
                </span>
              </div>
            </div>

            {pendingExtraction.fallbackReason && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{pendingExtraction.fallbackReason}</span>
              </div>
            )}

            {pendingExtraction.isProductLabel === false && (
              <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-700 dark:text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="font-bold">
                  This doesn&apos;t look like a product label. Retake a clear photo of the Ingredients / Supplement Facts panel or add ingredients manually below.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Product Name</label>
                <input
                  type="text"
                  value={pendingExtraction.productName || ''}
                  onChange={(e) => setPendingExtraction((p) => ({ ...p, productName: e.target.value || null }))}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-black/60 border border-white/15 text-maroon-950 dark:text-white outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Brand</label>
                <input
                  type="text"
                  value={pendingExtraction.brand || ''}
                  onChange={(e) => setPendingExtraction((p) => ({ ...p, brand: e.target.value || null }))}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-black/60 border border-white/15 text-maroon-950 dark:text-white outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Category</label>
                <input
                  type="text"
                  value={pendingExtraction.category || ''}
                  onChange={(e) => setPendingExtraction((p) => ({ ...p, category: e.target.value || null }))}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-black/60 border border-white/15 text-maroon-950 dark:text-white outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Serving Size</label>
                <input
                  type="text"
                  value={pendingExtraction.servingSize || ''}
                  placeholder="Unknown (e.g. 32g)"
                  onChange={(e) => setPendingExtraction((p) => ({ ...p, servingSize: e.target.value || null }))}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-black/60 border border-white/15 text-maroon-950 dark:text-white outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pendingExtraction.protein_g ?? ''}
                  placeholder="Unknown"
                  onChange={(e) => setPendingExtraction((p) => ({ ...p, protein_g: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-black/60 border border-white/15 text-maroon-950 dark:text-white outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Sugar (g) / Caffeine (mg)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={pendingExtraction.sugar_g ?? ''}
                    placeholder="Sugar g"
                    onChange={(e) => setPendingExtraction((p) => ({ ...p, sugar_g: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                    className="w-1/2 px-2.5 py-2 rounded-xl bg-black/5 dark:bg-black/60 border border-white/15 text-maroon-950 dark:text-white outline-none focus:border-rose-500"
                  />
                  <input
                    type="number"
                    value={pendingExtraction.caffeine_mg ?? ''}
                    placeholder="Caff mg"
                    onChange={(e) => setPendingExtraction((p) => ({ ...p, caffeine_mg: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                    className="w-1/2 px-2.5 py-2 rounded-xl bg-black/5 dark:bg-black/60 border border-white/15 text-maroon-950 dark:text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                Extracted Ingredients (Comma-separated — Edit freely before analysis)
              </label>
              <textarea
                rows={4}
                value={(pendingExtraction.ingredients || []).join(', ')}
                onChange={(e) =>
                  setPendingExtraction((p) => ({
                    ...p,
                    ingredients: e.target.value
                      .split(/[,;\n]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                className="w-full p-3 rounded-xl bg-black/5 dark:bg-black/70 border border-white/15 font-mono text-xs text-maroon-950 dark:text-emerald-200 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setPendingExtraction(null);
                  setQueuedPhotos([]);
                }}
                className="px-4 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-xs font-bold text-maroon-950 dark:text-white cursor-pointer"
              >
                Back / Retake
              </button>
              <button
                type="button"
                onClick={handleConfirmExtractionAnalysis}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
              >
                Confirm & Show Results →
              </button>
            </div>
          </div>
        )}

        {/* Clean, Clear Scan Diagnostic Results (Video-Inspired Flow) */}
        {scanResult && !isScanning && (() => {
          const score = scanResult.purityScore;
          const isBanned = (scanResult.bannedSubstancesDetected?.length || 0) > 0 || Boolean(scanResult.flags?.bannedSubstances);
          const hasContam = (scanResult.contaminationRisksDetected?.length || 0) > 0;
          const tierLabel = isBlockedScore
            ? 'Unreadable — Retake Photo'
            : isBanned
            ? 'BANNED / UNSAFE'
            : score >= 75
            ? 'Nutritionally Favorable'
            : score >= 50
            ? 'Moderate Quality'
            : 'High Concern';

          const ringClass = isBlockedScore
            ? 'border-amber-400 text-amber-400'
            : isBanned || score < 50
            ? 'border-red-500 text-red-400'
            : score >= 75
            ? 'border-emerald-400 text-emerald-400'
            : 'border-amber-400 text-amber-400';

          const tierBadgeClass = isBlockedScore
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : isBanned
            ? 'bg-red-600/25 text-red-300 border-red-500/50'
            : score >= 75
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : score >= 50
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-orange-500/20 text-orange-300 border-orange-500/40';

          // Compute Per Serving vs Per 100g Nutrition Values cleanly
          const numOrNull = (val) => {
            if (typeof val === 'number' && !Number.isNaN(val)) return val;
            const m = String(val ?? '').match(/(\d+(?:\.\d+)?)/);
            return m ? parseFloat(m[1]) : null;
          };
          const macros = scanResult.scanDetails?.macrosExtracted || {};
          const servG = macros.servingSizeG ?? numOrNull(scanResult.servingSize) ?? 32;
          const factor100 = servG > 0 ? 100 / servG : 1;
          const calVal = macros.calories ?? numOrNull(scanResult.calories);
          const protVal = macros.proteinG ?? numOrNull(scanResult.claimedProtein);
          const carbVal = macros.carbsG ?? numOrNull(scanResult.carbs);
          const sugVal = macros.sugarG ?? numOrNull(scanResult.sugar);
          const fatVal = macros.fatG ?? numOrNull(scanResult.fat);

          const fmtMacro = (val, unit = 'g') => {
            if (val == null) return 'Unknown';
            const scaled = nutritionBasis === 'per_100g' ? val * factor100 : val;
            return `${scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10}${unit}`;
          };

          const dvPct = (val, dailyRef) => {
            if (val == null || !dailyRef) return '—';
            const scaled = nutritionBasis === 'per_100g' ? val * factor100 : val;
            return `${Math.round((scaled / dailyRef) * 100)}%`;
          };

          const filteredIngs = (scanResult.ingredientsList || []).filter((ing) => {
            const cls = ing.mlClass || ing.status || 'neutral';
            if (ingredientFilter === 'safe') return !ing.unrecognized && (cls === 'beneficial' || cls === 'safe');
            if (ingredientFilter === 'harmful') return cls === 'harmful' || cls === 'contamination_risk' || cls === 'danger';
            if (ingredientFilter === 'banned') return cls === 'banned_wada';
            return true;
          });

          const isSavedFav = favoriteIds.includes(scanResult.id || scanResult.name);
          const alts =
            scanResult.saferAlternatives?.length > 0
              ? scanResult.saferAlternatives
              : suggestSaferAlternatives(
                  scanResult.category,
                  scanResult.purityScore,
                  Boolean(scanResult.flags?.bannedSubstances),
                  Boolean(scanResult.flags?.aminoSpiking)
                );

          return (
            <div className="space-y-4 font-sans">
              {/* 1. Clean Top Estimation & Basis Bar */}
              <div className="p-3 rounded-2xl bg-black/5 dark:bg-zinc-900/90 border border-rose-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    INGREDIENTS PANEL:{' '}
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">
                      {scanResult.scanDetails?.foundRegion ? 'Extracted' : 'Parsed'}
                    </span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    NUTRITION:{' '}
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      calVal != null || protVal != null
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {calVal != null || protVal != null ? 'Extracted' : 'Missing / Risk'}
                    </span>
                  </span>
                  {typeof overallConfidence === 'number' && (
                    <span className="text-slate-500 dark:text-slate-400 font-mono font-bold">
                      CONFIDENCE: <span className={overallConfidence >= 70 ? 'text-emerald-400' : overallConfidence >= 50 ? 'text-amber-400' : 'text-red-400'}>{overallConfidence}%</span>
                    </span>
                  )}
                </div>

                {/* Per Serving vs Per 100g Toggle */}
                <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-black/10 dark:bg-black/60 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setNutritionBasis('per_serving')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition ${
                      nutritionBasis === 'per_serving'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-500 dark:text-slate-300'
                    }`}
                  >
                    per_serving
                  </button>
                  <button
                    type="button"
                    onClick={() => setNutritionBasis('per_100g')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition ${
                      nutritionBasis === 'per_100g'
                        ? 'bg-emerald-500 text-black font-black'
                        : 'text-slate-500 dark:text-slate-300'
                    }`}
                  >
                    per_100g
                  </button>
                </div>
              </div>

              {/* 2. Critical Alerts (Only shown when Banned, Contamination Risk, Unreadable < 50%, or Error) */}
              {isBanned && (
                <div className="p-4 rounded-2xl bg-red-600/20 border-2 border-red-500 text-red-950 dark:text-red-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                      BANNED SUBSTANCE DETECTED — ATHLETE DOPING & SAFETY ALERT (CAPPED AT ≤ 20)
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {scanResult.bannedSubstancesDetected.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs">
                        <span className="font-black text-white bg-red-600 px-2 py-0.5 rounded text-[10px] uppercase mr-2">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-red-300">{item.category}</span>
                        <p className="text-[11px] mt-1 text-red-100">{item.whyProblem}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasContam && (
                <div className="p-3.5 rounded-2xl bg-yellow-500/15 border border-yellow-500/60 text-yellow-950 dark:text-yellow-100 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-yellow-700 dark:text-yellow-300">
                      Contamination Risk / Regulatory Warning
                    </span>
                  </div>
                  {scanResult.contaminationRisksDetected.map((item, idx) => (
                    <p key={idx} className="text-xs">
                      <span className="font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded text-[10px] mr-1.5">{item.name}</span>
                      {item.whyProblem}
                    </p>
                  ))}
                </div>
              )}

              {(isLowConfidence || isBlockedScore) && (
                <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/50 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-sm text-maroon-950 dark:text-white">
                      {isBlockedScore ? (scanResult.verdict || 'Not enough readable data - retake photo') : `Moderate/Low Confidence (${overallConfidence}%)`}
                    </p>
                    <p className="mt-1 opacity-90">
                      {scanResult.isProductLabel === false
                        ? "This doesn't look like a product label. Retake a clear photo of the Ingredients / Supplement Facts panel."
                        : `Readable confidence is ${overallConfidence ?? 0}%. For best accuracy, crop closely to the Ingredients box or click Suggest Corrections below.`}
                    </p>
                  </div>
                </div>
              )}

              {(scanError || scanResult.barcodeNotice || scanResult.ocrFallbackNotice) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <Info className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{scanError || scanResult.barcodeNotice || scanResult.ocrFallbackNotice}</span>
                </div>
              )}

              {/* 3. Main Score Header Card (Clean Video Layout: Circular Score Ring + Meta + Export PDF + Evidence) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Circular Purity Score Ring */}
                    <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shrink-0 bg-black/5 dark:bg-black/60 ${ringClass}`}>
                      <span className="text-2xl font-black font-mono leading-none">
                        {isBlockedScore ? 'N/A' : score}
                      </span>
                      <span className="text-[10px] font-mono opacity-75">
                        {isBlockedScore ? 'RETAKE' : '/100'}
                      </span>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-500 block">
                        {scanResult.brand || 'GYMSCAN'} • {scanResult.category}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-maroon-950 dark:text-white leading-tight">
                        {scanResult.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tierBadgeClass}`}>
                          {tierLabel}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                          {scanResult.ocrEngineUsed || 'tesseract.js'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsClinicalPrintOpen(true)}
                          className="px-2.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-emerald-500/20 text-maroon-950 dark:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Printer className="w-3 h-3 text-emerald-500" />
                          <span>Export PDF Report</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Evidence Thumbnail */}
                  {evidenceImageUrl && (
                    <div className="w-16 h-20 rounded-xl overflow-hidden border border-white/15 bg-black/60 shrink-0 hidden sm:flex flex-col items-center justify-center">
                      <img src={evidenceImageUrl} alt="Label Evidence" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Single-line Engine Verdict Strip */}
                <div className="p-3 rounded-xl bg-black/5 dark:bg-black/50 border border-black/5 dark:border-white/10 text-xs flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${isBanned || (score != null && score < 50) ? 'text-red-500' : 'text-emerald-500'}`} />
                  <span className="font-semibold text-maroon-950 dark:text-slate-100">{scanResult.verdict}</span>
                </div>
              </div>

              {/* 4. Clean Action Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(scanResult)}
                    className={`px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                      isSavedFav
                        ? 'bg-amber-400/20 border-amber-400 text-amber-500'
                        : 'bg-black/5 dark:bg-zinc-900 border-white/10 text-maroon-950 dark:text-white hover:border-amber-400'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isSavedFav ? 'fill-amber-400' : ''}`} />
                    <span>{isSavedFav ? 'Saved' : 'Save'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setEditMode((v) => !v)}
                  className={`px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                    editMode
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-black/5 dark:bg-zinc-900 border-white/10 text-maroon-950 dark:text-white hover:border-rose-500/40'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{editMode ? 'Done Editing' : 'Suggest Corrections'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url = buildShareableReportUrl(scanResult);
                    navigator.clipboard?.writeText(url).catch(() => {});
                    setCopiedShareLink(true);
                    setTimeout(() => setCopiedShareLink(false), 2500);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-black/5 dark:bg-zinc-900 border border-white/10 hover:border-rose-500/40 text-maroon-950 dark:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedShareLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-rose-500" />}
                  <span>{copiedShareLink ? 'Link Copied' : 'Share Breakdown'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadScanReportPDF(scanResult)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download .PDF</span>
                </button>

                {onSendToCompare && (
                  <button
                    type="button"
                    onClick={() => onSendToCompare(scanResult)}
                    className="px-3.5 py-2 rounded-xl bg-black/5 dark:bg-zinc-900 border border-white/10 hover:border-rose-500/40 text-maroon-950 dark:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-rose-500" />
                    <span>Compare</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setScanResult(null);
                    setPendingExtraction(null);
                    setQueuedPhotos([]);
                    setCustomText('');
                    setBarcodeInput('');
                    setScanError('');
                    setHasUnsavedEdits(false);
                    setEditMode(false);
                    setEvidenceImageUrl(null);
                  }}
                  className="ml-auto px-3.5 py-2 rounded-xl bg-black/5 dark:bg-zinc-900 border border-white/10 hover:border-rose-500/40 text-maroon-950 dark:text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Another</span>
                </button>
              </div>

              {/* 5. Clean Label-Declared Ingredients Breakdown Table */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Label-Declared Facts
                    </span>
                    <h4 className="text-sm font-black text-maroon-950 dark:text-white flex items-center gap-2">
                      <span>Extracted Ingredients ({scanResult.ingredientsList?.length || 0} Items)</span>
                    </h4>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono font-bold">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'safe', label: 'Safe' },
                      { id: 'harmful', label: 'Harmful / Caution' },
                      { id: 'banned', label: 'Banned' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setIngredientFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                          ingredientFilter === f.id
                            ? 'bg-rose-600 text-white'
                            : 'bg-black/5 dark:bg-black/50 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                  {filteredIngs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      {editMode || (scanResult.ingredientsList?.length || 0) === 0
                        ? 'No ingredients match this filter (or none extracted). Use Add below to enter manually.'
                        : 'No ingredients in this filter.'}
                    </div>
                  ) : (
                    filteredIngs.map((ing, idx) => {
                      const cls = ing.mlClass || (ing.status === 'danger' ? 'harmful' : ing.status === 'warning' ? 'neutral' : 'beneficial');
                      const badgeCls = ing.unrecognized
                        ? 'bg-amber-500 text-black'
                        : cls === 'banned_wada'
                        ? 'bg-red-600 text-white'
                        : cls === 'contamination_risk'
                        ? 'bg-yellow-400 text-black'
                        : cls === 'harmful'
                        ? 'bg-orange-500 text-white'
                        : cls === 'neutral'
                        ? 'bg-slate-600 text-white'
                        : 'bg-emerald-500 text-black';
                      const badgeText = ing.unrecognized
                        ? 'UNRECOGNIZED'
                        : ing.badge
                        ? ing.badge
                        : cls === 'banned_wada'
                        ? 'BANNED'
                        : cls === 'contamination_risk'
                        ? 'CAUTION'
                        : cls === 'harmful'
                        ? 'AVOID'
                        : cls === 'neutral'
                        ? 'CAUTION'
                        : 'SAFE';

                      const origIdx = scanResult.ingredientsList.indexOf(ing);
                      const isEditingThis = editingIndex === origIdx;

                      return (
                        <div
                          key={origIdx >= 0 ? origIdx : idx}
                          className="p-3 bg-white dark:bg-black/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0 sm:w-5/12">
                            <span className="w-6 h-6 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-300">
                              {idx + 1}
                            </span>
                            {isEditingThis ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditIngredient(origIdx);
                                    if (e.key === 'Escape') setEditingIndex(null);
                                  }}
                                  autoFocus
                                  className="flex-1 px-2 py-1 rounded bg-black/10 dark:bg-black/60 border border-rose-500/40 text-xs outline-none text-maroon-950 dark:text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditIngredient(origIdx)}
                                  className="px-2 py-1 rounded bg-emerald-500 text-black font-bold text-[10px] cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <span
                                onClick={() => ing.unrecognized && handleStartEditIngredient(origIdx, ing.name)}
                                className={`font-bold text-maroon-950 dark:text-white truncate ${ing.unrecognized ? 'cursor-pointer underline decoration-amber-400' : ''}`}
                              >
                                {ing.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 flex-1 justify-between">
                            <span
                              onClick={() => ing.unrecognized && handleStartEditIngredient(origIdx, ing.name)}
                              className={`px-2 py-0.5 rounded font-mono font-black text-[9px] uppercase shrink-0 ${badgeCls} ${ing.unrecognized ? 'cursor-pointer' : ''}`}
                            >
                              {badgeText}
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 flex-1">
                              {ing.reason}
                            </span>

                            {(editMode || ing.unrecognized) && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditIngredient(origIdx, ing.name)}
                                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                                  title="Correct Ingredient"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteIngredient(origIdx)}
                                  className="p-1 rounded hover:bg-rose-500/20 text-rose-500 cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add / Re-Analyze Controls (Visible in Edit Mode or whenever edits were made) */}
                {(editMode || hasUnsavedEdits) && (
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <form onSubmit={handleAddIngredient} className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={newIngredientInput}
                        onChange={(e) => setNewIngredientInput(e.target.value)}
                        placeholder="Add ingredient (e.g. Whey Protein Isolate, Creatine)..."
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
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
                        <span>{isReanalyzing ? 'Updating...' : 'Re-Analyze Score'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Authentic High-Contrast NUTRITION FACTS Box + Why This Score Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Traditional NUTRITION FACTS Label Box */}
                <div className="lg:col-span-5 p-4 rounded-2xl bg-black text-white border-2 border-white/20 font-sans">
                  <div className="border-b-4 border-white pb-2 mb-2">
                    <h4 className="text-xl font-black tracking-tight uppercase">NUTRITION FACTS</h4>
                    <p className="text-[10px] text-slate-400">
                      Basis: {nutritionBasis === 'per_100g' ? 'Per 100g standardized' : scanResult.servingSize || 'Per serving'}
                    </p>
                  </div>
                  <div className="flex items-end justify-between border-b-2 border-white/70 pb-2 mb-2">
                    <span className="text-sm font-black">Calories</span>
                    <span className="text-2xl font-black font-mono">
                      {fmtMacro(calVal, '')}
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[9px] font-mono text-slate-400 border-b border-white/20 uppercase">
                        <th className="py-1 text-left">Nutrient</th>
                        <th className="py-1 text-right">{nutritionBasis === 'per_100g' ? 'Per 100g' : 'Serving'}</th>
                        <th className="py-1 text-right">% DV*</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      <tr>
                        <td className="py-1.5 font-bold">Total Fat</td>
                        <td className="py-1.5 text-right font-mono">{fmtMacro(fatVal)}</td>
                        <td className="py-1.5 text-right font-mono text-slate-300">{dvPct(fatVal, 78)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold">Total Carbohydrate</td>
                        <td className="py-1.5 text-right font-mono">{fmtMacro(carbVal)}</td>
                        <td className="py-1.5 text-right font-mono text-slate-300">{dvPct(carbVal, 275)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pl-3 text-slate-300">Total Sugars</td>
                        <td className="py-1.5 text-right font-mono text-amber-300">{fmtMacro(sugVal)}</td>
                        <td className="py-1.5 text-right font-mono text-slate-300">{dvPct(sugVal, 50)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-black text-emerald-400">Protein</td>
                        <td className="py-1.5 text-right font-mono font-black text-emerald-400">{fmtMacro(protVal)}</td>
                        <td className="py-1.5 text-right font-mono text-emerald-300">{dvPct(protVal, 50)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[9px] text-slate-500 mt-2">
                    * % Daily Values based on a 2,000 calorie reference diet.
                  </p>
                </div>

                {/* Right: Why This Score + Amino-Spiking Card */}
                <div className="lg:col-span-7 space-y-3">
                  {/* Why This Score */}
                  <div className="p-4 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-maroon-950 dark:text-white flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-emerald-500" />
                        <span>Why This Score ({scanResult.mlPowered ? scanResult.mlScore?.model_used || 'ML' : 'Conservative Rules'})</span>
                      </h4>
                    </div>
                    {scanResult.whyThisScore?.length > 0 ? (
                      <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                        {scanResult.whyThisScore.map((item, i) => {
                          const imp = Number(item.impact || 0);
                          return (
                            <div key={i} className="py-1.5 flex items-center justify-between gap-2">
                              <span className="text-slate-700 dark:text-slate-200">{item.label}</span>
                              {imp !== 0 && (
                                <span className={`font-mono font-black shrink-0 ${imp > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {imp > 0 ? `+${imp}` : imp} pts
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Evaluated cleanly with no major penalties detected.
                      </p>
                    )}
                  </div>

                  {/* Compact Amino-Spiking Status */}
                  <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                    scanResult.flags?.aminoSpiking
                      ? 'bg-orange-500/10 border-orange-500/45 text-orange-800 dark:text-orange-200'
                      : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-800 dark:text-emerald-200'
                  }`}>
                    {scanResult.flags?.aminoSpiking ? (
                      <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-black uppercase text-[11px] block">
                        Amino-Spiking Audit: {scanResult.mlSpiking?.spiking_risk || (scanResult.flags?.aminoSpiking ? 'HIGH RISK' : 'LOW RISK')}
                      </span>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        {scanResult.mlSpiking?.explanation ||
                          (scanResult.flags?.aminoSpiking
                            ? 'Free non-protein amino acids detected that may artificially inflate protein nitrogen claims.'
                            : 'No suspicious non-protein amino nitrogen spiking agents detected.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6B. Personalization Alerts, Combination Warnings & Marketing Claim Verification */}
              {(scanResult.personalizationAlerts?.length > 0 ||
                scanResult.combinationAlerts?.length > 0 ||
                scanResult.claimChecks?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scanResult.personalizationAlerts?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/35 space-y-2 text-xs">
                      <h4 className="font-black uppercase tracking-wider text-red-500 text-[11px]">
                        Personal Health Profile Alerts
                      </h4>
                      {scanResult.personalizationAlerts.map((pa, i) => (
                        <div key={i} className="p-2 rounded-xl bg-black/5 dark:bg-black/40">
                          <span className="font-bold text-maroon-950 dark:text-white block">{pa.title}</span>
                          <span className="text-[11px] opacity-85">{pa.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {scanResult.combinationAlerts?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/35 space-y-2 text-xs">
                      <h4 className="font-black uppercase tracking-wider text-orange-500 text-[11px]">
                        Combination & Stacking Warnings
                      </h4>
                      {scanResult.combinationAlerts.map((ca, i) => (
                        <div key={i} className="p-2 rounded-xl bg-black/5 dark:bg-black/40">
                          <span className="font-bold text-maroon-950 dark:text-white block">{ca.title}</span>
                          <span className="text-[11px] opacity-85">{ca.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {scanResult.claimChecks?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 space-y-2 text-xs md:col-span-2">
                      <h4 className="font-black uppercase tracking-wider text-maroon-950 dark:text-white text-[11px]">
                        Front-of-Pack Marketing Claim Verification
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {scanResult.claimChecks.map((cc, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40 flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-maroon-950 dark:text-white">{cc.claim}</span>
                              <span className={`px-2 py-0.5 rounded font-mono font-black text-[9px] uppercase ${
                                cc.verdict === 'VERIFIED'
                                  ? 'bg-emerald-500 text-black'
                                  : cc.verdict === 'MISLEADING'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-amber-500 text-black'
                              }`}>
                                {cc.verdict}
                              </span>
                            </div>
                            <span className="text-[11px] opacity-85">{cc.explanation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 7. Smart Swap Cleaner Alternatives (products.json marked sampleData: true) */}
              {!isBlockedScore && (scanResult.smartSwaps?.items?.length > 0 || alts?.length > 0) && (() => {
                const swapList = scanResult.smartSwaps?.items?.length > 0 ? scanResult.smartSwaps.items : alts;
                return (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/35 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-maroon-950 dark:text-white">
                          Smart Swap: Cleaner Alternatives
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono text-[9px] font-bold">
                        Sample Catalog Reference
                      </span>
                    </div>
                    {scanResult.smartSwaps?.reason && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">{scanResult.smartSwaps.reason}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {swapList.map((alt) => (
                        <div key={alt.id} className="p-3 rounded-xl bg-black/5 dark:bg-black/50 border border-emerald-500/25 flex flex-col justify-between gap-2 text-xs">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase truncate">{alt.brand}</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black font-mono font-black text-[10px]">
                                {alt.purityScore}/100
                              </span>
                            </div>
                            <span className="font-black text-maroon-950 dark:text-white block mt-0.5">{alt.name}</span>
                            <p className="text-[11px] opacity-85 mt-1">{alt.whyCleaner || alt.whyBetter}</p>
                          </div>
                          {alt.storeSearchUrl ? (
                            <a
                              href={alt.storeSearchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-600 dark:text-emerald-300 font-bold text-[10px] uppercase text-center block"
                            >
                              Find Verified Store →
                            </a>
                          ) : alt.catalogProduct ? (
                            <button
                              type="button"
                              onClick={() => setScanResult(alt.catalogProduct)}
                              className="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-600 dark:text-emerald-300 font-bold text-[10px] uppercase cursor-pointer"
                            >
                              Inspect Clean Audit
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 8. Collapsible Debug & Extraction Inspection Panel */}
              <div className="rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowScanDetails((s) => !s)}
                  className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-maroon-950 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-rose-500" />
                    <span>Debug Panel (Engine Used, Field Confidence, Triggered Rules & Raw JSON)</span>
                  </span>
                  {showScanDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showScanDetails && (
                  <div className="p-4 pt-0 space-y-3 text-xs border-t border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3">
                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Extraction Engine</span>
                        <span className="font-bold text-maroon-950 dark:text-white">
                          {scanResult.debugInfo?.engineUsed || scanResult.ocrEngineUsed || 'tesseract.js'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Rules Triggered</span>
                        <span className="font-bold font-mono text-[11px] text-maroon-950 dark:text-white">
                          {scanResult.debugInfo?.rulesTriggered?.join(', ') || 'BASE_DETERMINISTIC'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Field Confidence</span>
                        <span className="font-bold font-mono text-[11px] text-maroon-950 dark:text-white">
                          {scanResult.debugInfo?.fieldConfidence
                            ? `Ing ${scanResult.debugInfo.fieldConfidence.ingredients ?? '-'}% • Nut ${scanResult.debugInfo.fieldConfidence.nutrition ?? '-'}%`
                            : `${overallConfidence ?? '-'}%`}
                        </span>
                      </div>
                    </div>

                    {scanResult.scanDetails?.corrections?.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-black/5 dark:bg-black/40">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Fuzzy Corrections</span>
                        <ul className="space-y-0.5 font-mono text-[11px] text-emerald-500">
                          {scanResult.scanDetails.corrections.map((c, i) => <li key={i}>• {c}</li>)}
                        </ul>
                      </div>
                    )}

                    {scanResult.debugInfo?.rawExtractionJson && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Raw Extraction JSON</span>
                        <pre className="p-2.5 rounded-xl bg-black/10 dark:bg-black/60 text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto text-slate-700 dark:text-slate-200">
                          {JSON.stringify(scanResult.debugInfo.rawExtractionJson, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Raw Extracted Text</span>
                      <pre className="p-2.5 rounded-xl bg-black/10 dark:bg-black/60 text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto text-slate-700 dark:text-slate-200">
                        {scanResult.rawText || '(No raw text recorded)'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Disclaimer & Footer Done */}
              <p className="text-[11px] text-center text-slate-500 dark:text-rose-200/75 font-semibold pt-1">
                {scanResult.disclaimer || BANNED_LIST_DISCLAIMER}
              </p>

              <ClinicalAuditReport
                isOpen={isClinicalPrintOpen}
                onClose={() => setIsClinicalPrintOpen(false)}
                scanResult={scanResult}
                userEmail={user?.email || null}
              />
            </div>
          );
        })()}

      </div>
    </div>
  );
}
