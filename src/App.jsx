import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import LiveMarqueeTicker from './components/LiveMarqueeTicker';
import StatsTestimonials from './components/StatsTestimonials';
import BentoFeatures from './components/BentoFeatures';
import Footer from './components/Footer';
import { SAMPLE_PRODUCTS } from './data/sampleProducts';
import { AuthProvider, useAuth } from './context/AuthContext';
import { checkMLHealth } from './utils/mlService';
import { readSharedReportFromUrl } from './utils/pdfReport';

// Lazy-load heavy modals (tesseract OCR, zxing barcode, catalog, compare, PDF, pricing)
// so the landing page loads instantly with minimal initial JS.
const ScannerTool = lazy(() => import('./components/ScannerTool'));
const CompareModal = lazy(() => import('./components/CompareModal'));
const HistoryModal = lazy(() => import('./components/HistoryModal'));
const PricingModal = lazy(() => import('./components/PricingModal'));
const PitchDeckModal = lazy(() => import('./components/PitchDeckModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const DatabaseModal = lazy(() => import('./components/DatabaseModal'));
const EducationModal = lazy(() => import('./components/EducationModal'));

function BottomCTA({ onOpenScanner, onOpenPricing }) {
  const ctaRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );
    if (ctaRef.current) observer.observe(ctaRef.current);
    return () => {
      if (ctaRef.current) observer.unobserve(ctaRef.current);
    };
  }, []);

  return (
    <section ref={ctaRef} className="py-20 sm:py-24 relative overflow-hidden border-t border-rose-500/20 text-center font-josefin">
      <div className={`max-w-4xl mx-auto px-4 relative z-10 space-y-6 transition-all duration-500 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-maroon-950 dark:text-white">
          Stop Guessing. <span className="text-gradient-maroon">Audit Every Scoop.</span>
        </h2>
        <p className="text-slate-600 dark:text-rose-100/75 max-w-xl mx-auto text-sm sm:text-base font-sans">
          Verify true protein purity, detect amino spiking, and screen for WADA-prohibited substances in seconds.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 items-center font-sans">
          <button
            onClick={onOpenScanner}
            className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white px-8 py-4 font-black text-sm sm:text-base hover:opacity-95 transition shadow-lg cursor-pointer"
          >
            Scan Supplement Now (5 Free Daily)
          </button>
          <button
            onClick={onOpenPricing}
            className="w-full sm:w-auto rounded-2xl glass-card-neo text-slate-800 dark:text-white px-8 py-4 font-bold text-sm sm:text-base hover:border-rose-500/40 transition cursor-pointer"
          >
            View Plans & Pricing
          </button>
        </div>
      </div>
    </section>
  );
}

function AppContent() {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    showCelebrationModal,
    requireAuth,
    user,
    isPricingOpen,
    openPricingModal,
    closePricingModal,
  } = useAuth();
  const [currentLang, setCurrentLang] = useState('en');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPitchOpen, setIsPitchOpen] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [isEducationOpen, setIsEducationOpen] = useState(false);
  const [inspectedScan, setInspectedScan] = useState(null);
  const [comparePreloadA, setComparePreloadA] = useState(null);
  const [mlHealth, setMlHealth] = useState({ online: false, modelsLoaded: false, checking: true, status: 'checking' });

  const refreshMlHealth = async () => {
    setMlHealth((prev) => ({ ...prev, checking: true }));
    const res = await checkMLHealth();
    setMlHealth({ ...res, checking: false });
    return res;
  };

  useEffect(() => {
    let cancelled = false;
    let retries = 0;

    const probe = async () => {
      const res = await checkMLHealth();
      if (cancelled) return;
      setMlHealth({ ...res, checking: false });
      // While FastAPI boots alongside Vite in dev:all, retry smoothly a few times
      if (!res.online && retries < 6) {
        retries += 1;
        setTimeout(probe, 2500);
      }
    };

    probe();
    const shared = readSharedReportFromUrl();
    if (shared) {
      setInspectedScan(shared);
      setIsScannerOpen(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Dark / Day Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('gymscan_theme');
      return savedTheme ? savedTheme === 'dark' : true;
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('gymscan_theme', isDarkMode ? 'dark' : 'light');
    } catch (e) {}
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const historyKey = user?.email ? `gymscan_history_${user.email}` : 'gymscan_history_guest';
  const favoritesKey = user?.email ? `gymscan_favorites_${user.email}` : 'gymscan_favorites_guest';

  const [scanHistory, setScanHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(historyKey) || localStorage.getItem('gymscan_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(favoritesKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      const savedHist = localStorage.getItem(historyKey);
      setScanHistory(savedHist ? JSON.parse(savedHist) : []);
      const savedFav = localStorage.getItem(favoritesKey);
      setFavorites(savedFav ? JSON.parse(savedFav) : []);
    } catch (e) {
      setScanHistory([]);
      setFavorites([]);
    }
  }, [historyKey, favoritesKey]);

  const handleSaveToHistory = (item) => {
    if (!item || item.isSharedSnapshot) return;
    setScanHistory((prev) => {
      const updated = [item, ...prev.filter((x) => x.name !== item.name)].slice(0, 50);
      try {
        localStorage.setItem(historyKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    try {
      localStorage.removeItem(historyKey);
    } catch (e) {}
  };

  const handleToggleFavorite = (item) => {
    if (!item) return;
    const itemId = item.id || item.name;
    setFavorites((prev) => {
      const exists = prev.some((f) => (f.id || f.name) === itemId);
      const updated = exists
        ? prev.filter((f) => (f.id || f.name) !== itemId)
        : [{ ...item, savedAt: new Date().toISOString() }, ...prev];
      try {
        localStorage.setItem(favoritesKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleInspectResult = (item) => {
    setIsDatabaseOpen(false);
    setIsHistoryOpen(false);
    setInspectedScan(item);
    setIsScannerOpen(true);
  };

  const handleSendToCompare = (item) => {
    setIsScannerOpen(false);
    setIsDatabaseOpen(false);
    setIsHistoryOpen(false);
    setComparePreloadA(item);
    if (!user) {
      requireAuth('Please sign in with your email to compare supplements!');
      return;
    }
    setIsCompareOpen(true);
  };

  const handleOpenScannerProtected = () => {
    if (!user) {
      requireAuth('Please sign in with your email to unlock your 5 Free Daily AI Supplement Scans!');
      return;
    }
    setIsScannerOpen(true);
  };

  const handleOpenCompareProtected = () => {
    if (!user) {
      requireAuth('Please sign in with your email to unlock your 5 Free Daily AI Supplement Scans!');
      return;
    }
    setIsCompareOpen(true);
  };

  return (
    <div className="min-h-screen transition-colors duration-300 font-sans relative overflow-x-hidden">
      <Navbar
        onOpenScanner={handleOpenScannerProtected}
        onOpenDatabase={() => setIsDatabaseOpen(true)}
        onOpenCompare={handleOpenCompareProtected}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenEducation={() => setIsEducationOpen(true)}
        onOpenPricing={() => openPricingModal()}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        scanHistoryCount={scanHistory.length}
        favoritesCount={favorites.length}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        mlHealth={mlHealth}
        onRefreshMlHealth={refreshMlHealth}
      />

      <main>
        <HeroSection
          onOpenScanner={handleOpenScannerProtected}
          onOpenDatabase={() => setIsDatabaseOpen(true)}
          onOpenCompare={handleOpenCompareProtected}
          onOpenPitch={() => setIsPitchOpen(true)}
          currentLang={currentLang}
        />
        <LiveMarqueeTicker />
        <StatsTestimonials />
        <BentoFeatures onOpenScanner={handleOpenScannerProtected} />
        <BottomCTA
          onOpenScanner={handleOpenScannerProtected}
          onOpenPricing={() => openPricingModal()}
        />
      </main>

      <Footer
        onOpenPitch={() => setIsPitchOpen(true)}
        onOpenPricing={() => openPricingModal()}
        onOpenScanner={handleOpenScannerProtected}
        onOpenDatabase={() => setIsDatabaseOpen(true)}
        onOpenEducation={() => setIsEducationOpen(true)}
      />

      <Suspense fallback={null}>
        {isScannerOpen && (
          <ScannerTool
            isOpen={isScannerOpen}
            onClose={() => {
              setIsScannerOpen(false);
              setInspectedScan(null);
            }}
            onSaveHistory={handleSaveToHistory}
            currentLang={currentLang}
            mlHealth={mlHealth}
            onRefreshMlHealth={refreshMlHealth}
            initialResult={inspectedScan}
            favoriteIds={favorites.map((f) => f.id || f.name)}
            onToggleFavorite={handleToggleFavorite}
            onSendToCompare={handleSendToCompare}
          />
        )}

        {isCompareOpen && (
          <CompareModal
            isOpen={isCompareOpen}
            onClose={() => setIsCompareOpen(false)}
            currentLang={currentLang}
            initialProdA={comparePreloadA}
            scanHistory={scanHistory}
          />
        )}

        {isDatabaseOpen && (
          <DatabaseModal
            isOpen={isDatabaseOpen}
            onClose={() => setIsDatabaseOpen(false)}
            onInspectProduct={handleInspectResult}
            onSendToCompare={handleSendToCompare}
            favoriteIds={favorites.map((f) => f.id || f.name)}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {isEducationOpen && (
          <EducationModal
            isOpen={isEducationOpen}
            onClose={() => setIsEducationOpen(false)}
            onOpenScanner={handleOpenScannerProtected}
          />
        )}

        {isHistoryOpen && (
          <HistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            history={scanHistory}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onClearHistory={handleClearHistory}
            onClear={handleClearHistory}
            onInspectScan={handleInspectResult}
            onSendToCompare={handleSendToCompare}
            userEmail={user?.email || null}
            currentLang={currentLang}
          />
        )}

        {isPricingOpen && (
          <PricingModal
            isOpen={isPricingOpen}
            onClose={closePricingModal}
            onStartScanning={handleOpenScannerProtected}
          />
        )}

        {isPitchOpen && (
          <PitchDeckModal
            isOpen={isPitchOpen}
            onClose={() => setIsPitchOpen(false)}
          />
        )}

        {(isAuthModalOpen || showCelebrationModal) && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onStartScanning={() => setIsScannerOpen(true)}
          />
        )}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
