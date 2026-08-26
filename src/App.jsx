import React, { useState, useEffect } from 'react';
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

export default function App() {
  const [currentLang, setCurrentLang] = useState('en');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isPitchOpen, setIsPitchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

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

  return (
    <div className="min-h-screen transition-colors duration-300 font-sans relative overflow-x-hidden">
      
      {/* Floating Glass Island Navbar with Day/Night Switcher */}
      <Navbar
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenCompare={() => setIsCompareOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
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
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenPitch={() => setIsPitchOpen(true)}
          currentLang={currentLang}
        />

        {/* 2. Live Dynamic Marquee Ticker */}
        <LiveMarqueeTicker />

        {/* 3. Stats & Verified Athlete Reviews */}
        <StatsTestimonials />

        {/* 4. Bento Grid Superhuman Features */}
        <BentoFeatures
          onOpenScanner={() => setIsScannerOpen(true)}
        />

        {/* 5. Bold Bottom Call-to-Action */}
        <section className="py-28 relative overflow-hidden border-t border-rose-500/20 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-rose-950/10 via-maroon-900/10 to-transparent -z-10"></div>
          <div className="max-w-5xl mx-auto px-4 relative z-10 space-y-8">
            <h2 className="text-[11vw] md:text-[7vw] font-black font-syne tracking-tighter leading-none text-maroon-950 dark:text-white opacity-95">
              START <br />
              <span className="text-gradient-maroon">
                GYM SCANNING.
              </span>
            </h2>
            <p className="text-slate-600 dark:text-rose-100/70 max-w-xl mx-auto text-sm sm:text-base">
              Join thousands of bodybuilders, powerlifters, and everyday lifters protecting their wallet and kidneys from adulterated supplements.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full sm:w-auto rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white px-10 py-5 font-black text-lg hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(225,29,72,0.4)] cursor-pointer"
              >
                Scan Your Supplement Now
              </button>
              <button
                onClick={() => setIsPricingOpen(true)}
                className="w-full sm:w-auto rounded-full glass-card-neo text-slate-800 dark:text-white px-10 py-5 font-bold text-lg hover:border-rose-500/40 transition-colors duration-300 cursor-pointer"
              >
                View Pro Lifter Pricing
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        onOpenPitch={() => setIsPitchOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Interactive Modals */}
      <ScannerTool
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveToHistory={handleSaveToHistory}
      />

      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={scanHistory}
        onClearHistory={handleClearHistory}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
      />

      <PitchDeckModal
        isOpen={isPitchOpen}
        onClose={() => setIsPitchOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

    </div>
  );
}
