import React, { useState } from 'react';
import { User, X, Mail, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Zap, Trophy, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, onStartScanning }) {
  const { 
    user, 
    loginWithEmail, 
    validateEmail, 
    authPromptMessage, 
    setAuthPromptMessage,
    showCelebrationModal,
    setShowCelebrationModal 
  } = useAuth();

  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isTouched, setIsTouched] = useState(false);

  if (!isOpen && !showCelebrationModal) return null;

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (isTouched) {
      const cleanVal = String(val).trim().toLowerCase();
      const parts = cleanVal.split('@');
      if (parts.length === 2 && ['gmial.com', 'gmai.com', 'gamil.com', 'gmaill.com', 'gmali.com', 'gmaol.com', 'gmeil.com'].includes(parts[1])) {
        setErrorMsg("Typo detected: Did you mean '@gmail.com'?");
        return;
      }
      if (!validateEmail(val)) {
        setErrorMsg("Please enter a valid email format (e.g., athlete@gmail.com)");
      } else {
        setErrorMsg("");
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsTouched(true);

    if (!validateEmail(email)) {
      setErrorMsg("Please enter a valid email address (e.g. athlete@gmail.com)");
      return;
    }

    const res = loginWithEmail(email);
    if (!res.success) {
      setErrorMsg(res.error);
      return;
    }

    setErrorMsg("");
    setAuthPromptMessage(null);
    // showCelebrationModal is activated inside loginWithEmail
  };

  const handleCloseAll = () => {
    setAuthPromptMessage(null);
    setShowCelebrationModal(false);
    onClose();
  };

  const handleStartScanning = () => {
    setShowCelebrationModal(false);
    onClose();
    if (onStartScanning) onStartScanning();
  };

  // 1. CELEBRATION SCREEN: "Woohoo! you got 5 scans free!!!"
  if (showCelebrationModal && user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl overflow-y-auto font-josefin animate-in fade-in zoom-in-95 duration-300">
        <div className="relative w-full max-w-lg glass-hud rounded-3xl p-6 sm:p-8 my-6 border border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.35)] text-center space-y-5">
          
          <button 
            onClick={handleCloseAll}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Animated Trophy */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 via-amber-500 to-rose-500 p-1 mx-auto shadow-[0_0_35px_rgba(16,185,129,0.5)] animate-bounce">
            <div className="w-full h-full rounded-[22px] bg-[#120306] flex items-center justify-center text-3xl">
              🎉
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono font-black text-emerald-400 uppercase tracking-widest block mb-1">
              EXCLUSIVE ATHLETE ACCESS ACTIVATED
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Woohoo! you got <br />
              <span className="text-emerald-400 font-extrabold">5 scans FREE!!!</span>
            </h2>
            <p className="text-xs text-rose-200/80 mt-2 font-sans max-w-sm mx-auto">
              Signed in as <span className="text-white font-bold font-mono">{user.email}</span>. You can now scan any gym supplement or compare products.
            </p>
          </div>

          {/* Perks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-left font-sans text-xs">
            <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> 5 Free Scans
              </div>
              <p className="text-[10px] text-slate-400">Instant AI molecular audit</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
                <Zap className="w-3.5 h-3.5" /> Spike Check
              </div>
              <p className="text-[10px] text-slate-400">Detect fake nitrogen fillers</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                <Trophy className="w-3.5 h-3.5" /> Compare Mode
              </div>
              <p className="text-[10px] text-slate-400">Side-by-side assay</p>
            </div>
          </div>

          {/* Start Scanning CTA */}
          <div className="pt-2">
            <button
              onClick={handleStartScanning}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-black font-black text-sm uppercase tracking-wider hover:opacity-95 active:scale-95 transition shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Scanning (5 Free Scans Available)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 2. DIRECT SIGN IN AS EMAIL FORM
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl overflow-y-auto font-josefin animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-hud rounded-3xl p-6 sm:p-8 my-8 border border-rose-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.8)]">
        
        {/* Close Button */}
        <button 
          onClick={handleCloseAll}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-white p-[2px] mx-auto mb-3 shadow-[0_0_25px_rgba(225,29,72,0.4)] overflow-hidden flex items-center justify-center border border-rose-500/40">
            <img src="/logo.png" alt="GymScan Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-maroon-950 dark:text-white tracking-tight">
            Sign In with <span className="text-rose-500">Email</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-rose-200/80 mt-1 font-sans">
            Enter your email to unlock <span className="text-emerald-400 font-bold">5 FREE AI supplement scans</span> instantly.
          </p>
        </div>

        {/* Dynamic Auth Prompt Alert (e.g. if user tried to scan without logging in) */}
        {authPromptMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-sans flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{authPromptMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-rose-300">
                Your Email Address
              </label>
              {email && validateEmail(email) && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Valid Email
                </span>
              )}
            </div>

            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                onBlur={() => setIsTouched(true)}
                placeholder="athlete@domain.com"
                className={`w-full bg-black/5 dark:bg-black/60 border rounded-2xl pl-10 pr-4 py-3 text-xs text-maroon-950 dark:text-white outline-none transition font-sans ${
                  errorMsg 
                    ? 'border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.2)]' 
                    : email && validateEmail(email)
                    ? 'border-emerald-500/60'
                    : 'border-rose-500/20 focus:border-rose-500'
                }`}
              />
            </div>

            {/* Error Message for False/Invalid Email */}
            {errorMsg && (
              <p className="text-[11px] text-rose-400 font-bold mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Quick Perks Notice */}
          <div className="p-3 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/15 text-[11px] text-slate-500 dark:text-rose-200/70 space-y-1">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" /> No password required
            </div>
            <p>We'll link your scans and saved supplements directly to your email.</p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition shadow-[0_0_25px_rgba(225,29,72,0.4)] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Sign In & Claim 5 Free Scans</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-rose-500/15 text-center">
          <p className="text-[11px] text-slate-500 dark:text-rose-300/60 font-sans">
            🔒 100% Free • Safe & Anonymous Laboratory Screening
          </p>
        </div>

      </div>
    </div>
  );
}
