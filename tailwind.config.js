/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          950: "#0D0305",
          900: "#1A050A",
          850: "#26080F",
          800: "#3D0A16",
          700: "#5C0F22",
          600: "#83142F",
          500: "#B91C1C",
          400: "#E11D48",
          300: "#F43F5E",
          200: "#FDA4AF",
          100: "#FFE4E6",
          50: "#FFF1F2"
        },
        ruby: {
          DEFAULT: "#E11D48",
          glow: "rgba(225, 29, 72, 0.4)",
          light: "#FB7185",
        },
        gold: {
          DEFAULT: "#F59E0B",
          champagne: "#FDE68A"
        }
      },
      fontFamily: {
        josefin: ['"Josefin Sans"', 'sans-serif'],
        sans: ['"Josefin Sans"', '"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'revolve-slow': 'revolve3D 12s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'orbit-ring': 'orbitRing 6s linear infinite',
        'orbit-ring-reverse': 'orbitRingRev 8s linear infinite',
        'scan-beam': 'scanBeam 2.4s ease-in-out infinite',
        'float-slow': 'floatDumbbell 4.5s ease-in-out infinite',
        'pulse-ruby': 'pulseRuby 2.5s infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        revolve3D: {
          '0%': { transform: 'rotateY(0deg) rotateX(12deg) rotateZ(-6deg)' },
          '50%': { transform: 'rotateY(180deg) rotateX(-12deg) rotateZ(6deg)' },
          '100%': { transform: 'rotateY(360deg) rotateX(12deg) rotateZ(-6deg)' },
        },
        orbitRing: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        orbitRingRev: {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        scanBeam: {
          '0%': { top: '5%', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { top: '92%', opacity: '0' },
        },
        floatDumbbell: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseRuby: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.08)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
