import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('gymscan_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('gymscan_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('gymscan_user');
      }
    } catch (e) {}
  }, [user]);

  // Strict email regex validation
  const validateEmail = (email) => {
    if (!email) return false;
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).trim().toLowerCase());
  };

  const loginWithEmail = (rawEmail) => {
    const cleanEmail = String(rawEmail).trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address (e.g. athlete@gmail.com)' };
    }

    // Check if user already exists in storage or create new with 5 free scans
    let freeScans = 5;
    let usedScans = 0;
    try {
      const storedData = localStorage.getItem('gymscan_user_' + cleanEmail);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        freeScans = parsed.freeScans !== undefined ? parsed.freeScans : 5;
        usedScans = parsed.usedScans || 0;
      }
    } catch (e) {}

    const newUser = {
      email: cleanEmail,
      freeScans: freeScans,
      usedScans: usedScans,
      signedInAt: new Date().toISOString()
    };

    setUser(newUser);
    try {
      localStorage.setItem('gymscan_user_' + cleanEmail, JSON.stringify(newUser));
      localStorage.setItem('gymscan_user', JSON.stringify(newUser));
    } catch (e) {}

    setIsAuthModalOpen(false);
    setShowCelebrationModal(true);

    try {
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E11D48', '#FDA4AF', '#10B981', '#F59E0B', '#3B82F6']
      });
    } catch (e) {}

    return { success: true, user: newUser };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('gymscan_user');
    } catch (e) {}
  };

  // Consume 1 scan from user quota
  const consumeScan = () => {
    if (!user) {
      requireAuth('Please sign in with your email to unlock your 5 Free AI Supplement Scans!');
      return false;
    }

    if (user.freeScans <= 0) {
      alert('⚠️ You have used all 5 free scans! Premium unlimited scans are coming soon.');
      return false;
    }

    const updatedUser = {
      ...user,
      freeScans: user.freeScans - 1,
      usedScans: (user.usedScans || 0) + 1
    };

    setUser(updatedUser);
    try {
      localStorage.setItem('gymscan_user_' + user.email, JSON.stringify(updatedUser));
      localStorage.setItem('gymscan_user', JSON.stringify(updatedUser));
    } catch (e) {}

    return true;
  };

  // Require auth interceptor
  const requireAuth = (customPrompt = 'Please sign in with your email to continue') => {
    if (user) return true;
    setAuthPromptMessage(customPrompt);
    setIsAuthModalOpen(true);
    return false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      freeScansRemaining: user ? user.freeScans : 0,
      validateEmail,
      loginWithEmail,
      logout,
      consumeScan,
      requireAuth,
      isAuthModalOpen,
      setIsAuthModalOpen,
      authPromptMessage,
      setAuthPromptMessage,
      showCelebrationModal,
      setShowCelebrationModal
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
