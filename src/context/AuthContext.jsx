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

  // Strict email regex and domain typo validation
  const validateEmail = (email) => {
    if (!email) return false;
    const clean = String(email).trim().toLowerCase();
    
    // Strict RFC regex with valid TLD of at least 2 chars
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!re.test(clean)) return false;

    // Check user and domain length
    const parts = clean.split('@');
    if (parts.length !== 2) return false;
    const [userPart, domainPart] = parts;
    if (userPart.length < 2 || domainPart.length < 4) return false;

    // Blacklist common domain typos
    const typoDomains = [
      'gmial.com', 'gmai.com', 'gamil.com', 'gmaill.com', 'gmail.co', 'gmaik.com', 'gmali.com', 'gmaol.com', 'gmeil.com',
      'yaho.com', 'yahooo.com', 'ymail.co', 'yahou.com',
      'hotmial.com', 'hotmai.com', 'hotmali.com',
      'outlok.com', 'outloo.com', 'outlock.com'
    ];

    if (typoDomains.includes(domainPart)) {
      return false;
    }

    // Must have a valid dot in domain with standard TLD
    const domainParts = domainPart.split('.');
    if (domainParts.length < 2) return false;
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2 || tld.length > 10) return false;

    return true;
  };

  const loginWithEmail = (rawEmail) => {
    const cleanEmail = String(rawEmail).trim().toLowerCase();
    
    // Detailed error feedback for domain typos
    const parts = cleanEmail.split('@');
    if (parts.length === 2) {
      const domain = parts[1];
      if (['gmial.com', 'gmai.com', 'gamil.com', 'gmaill.com', 'gmali.com', 'gmaol.com', 'gmeil.com'].includes(domain)) {
        return { success: false, error: "Typo detected: Did you mean '@gmail.com'? Please enter your correct email." };
      }
      if (['yaho.com', 'yahooo.com', 'yahou.com'].includes(domain)) {
        return { success: false, error: "Typo detected: Did you mean '@yahoo.com'? Please enter your correct email." };
      }
      if (['hotmial.com', 'hotmai.com'].includes(domain)) {
        return { success: false, error: "Typo detected: Did you mean '@hotmail.com'? Please enter your correct email." };
      }
      if (['outlok.com', 'outloo.com'].includes(domain)) {
        return { success: false, error: "Typo detected: Did you mean '@outlook.com'? Please enter your correct email." };
      }
    }

    if (!validateEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid active email address (e.g. athlete@gmail.com)' };
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
