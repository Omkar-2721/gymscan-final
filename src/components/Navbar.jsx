import React, { useState } from 'react';
import { Camera, GitCompare, History, CreditCard, Globe, Menu, X, User, Sun, Moon, LogOut } from 'lucide-react';
import { TRANSLATIONS } from '../data/translations';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ 
  onOpenScanner, 
  onOpenCompare, 
  onOpenHistory, 
  onOpenPricing, 
  onOpenAuth, 
  currentLang, 
  setCurrentLang, 
  scanHistoryCount,
  isDarkMode,
  onToggleTheme
}) {
  const {
    user,
    logout,
    currentPlanId,
    currentPlan,
    isPaidPlan,
    hasUnlimitedScans,
    dailyScansRemaining,
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'es', label: 'ES' }
  ];

  return (
    <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none font-sans">
      <header className="w-full max-w-6xl glass-island rounded-full px-4 sm:px-6 py-2 flex items-center justify-between pointer-events-auto transition-all duration-300 shadow-[0_15px_40px_rgba(0,0,0,0.4)]">
        
        {/* Brand Logo with User Uploaded Official GymScan Logo */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-white p-[1px] shadow-[0_0_20px_rgba(225,29,72,0.4)] group-hover:scale-105 transition-transform duration-300 overflow-hidden flex items-center justify-center border border-rose-500/30">
              <img 
                src="/logo.png" 
                alt="GymScan Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight font-syne leading-none text-maroon-950 dark:text-white">
                GYM<span className="text-rose-500">SCAN</span>
              </span>
              <span className="text-[9px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                SCAN • TRACK • TRANSFORM
              </span>
            </div>
          </a>
        </div>

        {/* Desktop Island Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-black/40 rounded-full px-3 py-1 border border-black/5 dark:border-white/5">
          <button 
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:text-rose-600 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-rose-500" />
            <span>{t.scanner}</span>
          </button>

          <button 
            onClick={onOpenCompare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:text-rose-600 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5 text-rose-500" />
            <span>{t.compareMode}</span>
          </button>

          <button 
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:text-rose-600 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/10 transition relative cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.history}</span>
            {scanHistoryCount > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] font-black bg-rose-600 text-white rounded-full">
                {scanHistoryCount}
              </span>
            )}
          </button>

          <button 
            onClick={onOpenPricing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:text-rose-600 dark:hover:text-rose-400 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t.pricing}</span>
            {isPaidPlan && (
              <span className="px-1.5 py-0.2 text-[8px] font-mono font-black bg-emerald-500 text-black rounded-full uppercase">
                {currentPlanId === 'premium_yearly' ? 'ELITE' : 'PRO'}
              </span>
            )}
          </button>
        </nav>

        {/* Right Section: Theme Switcher, Language Pills & Sign In */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Day / Dark Mode Toggle Switch */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Dark / Day Mode"
            title={isDarkMode ? "Switch to Day Mode" : "Switch to Dark Mode"}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 hover:scale-110 active:scale-95 transition-all border border-rose-500/30 cursor-pointer shadow-sm"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
            ) : (
              <Moon className="w-4 h-4 text-rose-600" />
            )}
          </button>

          {/* Language Switcher Pill */}
          <div className="hidden sm:flex items-center bg-black/5 dark:bg-black/40 rounded-full px-2.5 py-1 border border-black/5 dark:border-white/10 text-xs">
            <Globe className="w-3 h-3 text-rose-500 mr-1.5" />
            <select 
              value={currentLang} 
              onChange={(e) => setCurrentLang(e.target.value)}
              aria-label="Select Language"
              className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1"
            >
              {languages.map(l => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white font-sans text-xs">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* User Auth Pill or Glowing Sign In */}
          {user ? (
            <div className="relative group">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black uppercase">
                  {user.email.charAt(0)}
                </div>
                <span className="hidden sm:inline font-mono text-[11px] max-w-[100px] truncate">{user.email}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black">
                  {hasUnlimitedScans
                    ? currentPlanId === 'premium_yearly'
                      ? 'ELITE ∞'
                      : 'PRO ∞'
                    : `⚡ ${dailyScansRemaining}`}
                </span>
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-11 w-60 glass-island rounded-2xl p-3 border border-emerald-500/30 shadow-2xl space-y-2 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                  <div className="pb-2 border-b border-rose-500/15 dark:border-white/10">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block uppercase">
                      {currentPlan.name}
                    </span>
                    <span className="text-xs font-bold text-maroon-950 dark:text-white truncate block">{user.email}</span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                      {hasUnlimitedScans
                        ? '∞ Unlimited Daily Scans Active'
                        : `⚡ ${dailyScansRemaining} of 5 Free Scans Left Today`}
                    </span>
                  </div>

                  <button
                    onClick={() => { onOpenPricing(); setUserMenuOpen(false); }}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs transition cursor-pointer text-left flex items-center gap-2"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isPaidPlan ? 'Plan & Payment History' : 'Upgrade to Pro / Premium'}</span>
                  </button>

                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition cursor-pointer text-left flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={onOpenAuth}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 px-4 py-1.5 text-xs font-black text-white hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(225,29,72,0.35)] cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-white" />
              <span>{t.signIn}</span>
            </button>
          )}

          {/* Mobile Hamburger Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-rose-500 transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed top-20 inset-x-4 max-w-md mx-auto glass-island rounded-3xl p-5 space-y-2 border border-rose-500/20 shadow-2xl pointer-events-auto z-50 md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <button 
            onClick={() => { onOpenScanner(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-rose-500/10 font-bold text-sm text-left"
          >
            <Camera className="w-4 h-4 text-rose-500" />
            <span>{t.scanner}</span>
          </button>

          <button 
            onClick={() => { onOpenCompare(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-rose-500/10 font-bold text-sm text-left"
          >
            <GitCompare className="w-4 h-4 text-rose-500" />
            <span>{t.compareMode}</span>
          </button>

          <button 
            onClick={() => { onOpenHistory(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-rose-500/10 font-bold text-sm text-left"
          >
            <History className="w-4 h-4 text-amber-500" />
            <span>{t.history} ({scanHistoryCount})</span>
          </button>

          <button 
            onClick={() => { onOpenPricing(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-rose-500/10 font-bold text-sm text-left"
          >
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span>{t.pricing}</span>
          </button>
        </div>
      )}
    </div>
  );
}
