import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import LiveMarqueeTicker from './components/LiveMarqueeTicker';
import StatsTestimonials from './components/StatsTestimonials';
import BentoFeatures from './components/BentoFeatures';
import ScannerTool from './components/ScannerTool';
import CompareModal from './components/CompareModal';
import HistoryModal from './components/HistoryModal';
import PricingModal from './components/PricingModal';
import PitchDeckModal from './components/PitchDeckModal';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import { Camera, Sparkles, Dumbbell, ShieldCheck, Zap } from 'lucide-react';
import { SAMPLE_PRODUCTS } from './data/sampleProducts';
import { AuthProvider, useAuth } from './context/AuthContext';

function BottomCTA({ onOpenScanner, onOpenPricing }) {
  const ctaRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );
    if (ctaRef.current) observer.observe(ctaRef.current);
    return () => {
      if (ctaRef.current) observer.unobserve(ctaRef.current);
    };
  }, []);

  return (
    <section ref={ctaRef} className="py-28 relative overflow-hidden border-t border-rose-500/20 text-center font-josefin">
      <div className="absolute inset-0 bg-gradient-to-b from-rose-950/10 via-maroon-900/10 to-transparent -z-10"></div>
      <div className={`max-w-5xl mx-auto px-4 relative z-10 space-y-8 transition-all duration-700 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}>
        <h2 className="text-[11vw] md:text-[7vw] font-black tracking-tighter leading-none text-maroon-950 dark:text-white opacity-95">
          START <br />
          <span className="text-gradient-maroon">
            GYM SCANNING.
          </span>
        </h2>
        <p className="text-slate-600 dark:text-rose-100/70 max-w-xl mx-auto text-sm sm:text-base font-sans font-medium">
          Join thousands of bodybuilders, powerlifters, and everyday lifters protecting their wallet and kidneys from adulterated supplements.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 items-center font-sans">
          <button
            onClick={onOpenScanner}
            className="w-full sm:w-auto rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white px-10 py-5 font-black text-base sm:text-lg hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(225,29,72,0.4)] cursor-pointer"
          >
            Scan Your Supplement Now (5 Free Scans)
          </button>
          <button
            onClick={onOpenPricing}
            className="w-full sm:w-auto rounded-full glass-card-neo text-slate-800 dark:text-white px-10 py-5 font-bold text-base sm:text-lg hover:border-rose-500/40 transition-colors duration-300 cursor-pointer"
          >
            View Pro Lifter Pricing
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

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const [scanHistory, setScanHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('gymscan_history');
      return saved ? JSON.parse(saved) : [SAMPLE_PRODUCTS[0], SAMPLE_PRODUCTS[1]];
    } catch (e) {
      return [SAMPLE_PRODUCTS[0], SAMPLE_PRODUCTS[1]];
    }
  });

  const handleSaveToHistory = (item) => {
    setScanHistory((prev) => {
      const updated = [item, ...prev.filter(x => x.name !== item.name)];
      try {
        localStorage.setItem('gymscan_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    try {
      localStorage.removeItem('gymscan_history');
    } catch (e) {}
  };

  const handleOpenScannerProtected = () => {
    if (!user) {
      requireAuth("Please sign in with your email to unlock your 5 Free Daily AI Supplement Scans!");
      return;
    }
    setIsScannerOpen(true);
  };

  const handleOpenCompareProtected = () => {
    if (!user) {
      requireAuth("Please sign in with your email to unlock your 5 Free Daily AI Supplement Scans!");
      return;
    }
    setIsCompareOpen(true);
  };

  return (
    <div className="min-h-screen transition-colors duration-300 font-sans relative overflow-x-hidden">
      
      {/* Floating Glass Island Navbar with Day/Night Switcher */}
      <Navbar
        onOpenScanner={handleOpenScannerProtected}
        onOpenCompare={handleOpenCompareProtected}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenPricing={() => openPricingModal()}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        scanHistoryCount={scanHistory.length}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Page Flow */}
      <main>
        {/* 1. Hero Section with 3D Revolving Whey Jar & Live Scanner Pod */}
        <HeroSection
          onOpenScanner={handleOpenScannerProtected}
          onOpenCompare={handleOpenCompareProtected}
          onOpenPitch={() => setIsPitchOpen(true)}
          currentLang={currentLang}
        />

        {/* 2. Live Dynamic Marquee Ticker */}
        <LiveMarqueeTicker />

        {/* 3. Stats & Verified Athlete Reviews with Real Animated Counters */}
        <StatsTestimonials />

        {/* 4. Bento Grid Superhuman Features with Scroll Stagger Reveal */}
        <BentoFeatures
          onOpenScanner={handleOpenScannerProtected}
        />

        {/* 5. Bold Bottom Call-to-Action with Scroll Reveal */}
        <BottomCTA
          onOpenScanner={handleOpenScannerProtected}
          onOpenPricing={() => openPricingModal()}
        />
      </main>

      {/* Footer */}
      <Footer
        onOpenPitch={() => setIsPitchOpen(true)}
        onOpenPricing={() => openPricingModal()}
        onOpenScanner={handleOpenScannerProtected}
      />

      {/* MODALS */}
      <ScannerTool
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveHistory={handleSaveToHistory}
        currentLang={currentLang}
      />

      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        currentLang={currentLang}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={scanHistory}
        onClear={handleClearHistory}
        currentLang={currentLang}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={closePricingModal}
        onStartScanning={handleOpenScannerProtected}
      />

      <PitchDeckModal
        isOpen={isPitchOpen}
        onClose={() => setIsPitchOpen(false)}
      />

      {/* Direct Email Auth Modal with Typo Protection & 5 Free Scans Celebration */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onStartScanning={() => setIsScannerOpen(true)}
      />

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
