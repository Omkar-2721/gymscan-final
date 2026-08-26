import React, { useState } from 'react';
import { User, X, Mail, Lock, Dumbbell } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Welcome to GymScan! Logged in as ${email || 'Demo Lifter'}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-md glass-hud rounded-3xl p-6 sm:p-8 my-8 border border-rose-500/30 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 p-[1.5px] mx-auto mb-3 shadow-[0_0_20px_rgba(225,29,72,0.4)]">
            <div className="w-full h-full bg-[#1A050A] rounded-[15px] flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-rose-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black font-syne text-maroon-950 dark:text-white">
            {isSignUp ? "Create Your Lifter Account" : "Welcome Back, Athlete"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-rose-200/70 mt-1">
            {isSignUp ? "Join 85,000+ lifters scanning for pure supplements" : "Access your saved scans & toxicity profile"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-rose-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="arnold@gymscan.ai"
                className="w-full bg-black/5 dark:bg-black/80 border border-rose-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-maroon-950 dark:text-white outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-rose-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/5 dark:bg-black/80 border border-rose-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-maroon-950 dark:text-white outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition shadow-lg mt-2 cursor-pointer"
          >
            {isSignUp ? "Start Free Account" : "Sign In to GymScan"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create Free Account"}
          </button>
        </div>

      </div>
    </div>
  );
}
