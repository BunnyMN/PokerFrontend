/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Ensure all classes are included in production build
  safelist: [
    // Common utility classes
    { pattern: /^(bg|text|border)-(white|black|gray|cyan|purple|pink|lime|yellow|red|blue)/ },
    { pattern: /^(w|h)-(12|16|20|24|32|36|full|screen)/ },
    { pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl)/ },
    { pattern: /^(p|m|px|py|mx|my|pt|pb|pl|pr|mt|mb|ml|mr)-(0|1|2|3|4|5|6|8|10|12|16|20|24)/ },
    { pattern: /^(rounded|border|shadow|ring|opacity|scale|translate|rotate|animate)/ },
    { pattern: /^(flex|grid|block|inline|hidden|absolute|relative|fixed|sticky)/ },
    { pattern: /^(items|justify|content|self|place)-(start|center|end|between|around|evenly)/ },
    { pattern: /^(gap|space)-(0|1|2|3|4|5|6|8|10|12|16|20|24)/ },
    // Custom classes
    'glass', 'glass-lg', 'glass-glow',
    'text-glow-cyan', 'text-glow-magenta', 'text-glow-purple', 'text-glow-lime',
    'border-glow-cyan', 'border-glow-magenta', 'border-glow-purple',
    'shadow-neon-cyan', 'shadow-neon-magenta', 'shadow-neon-purple', 'shadow-neon-lime',
    'shadow-glow-cyan', 'shadow-glow-magenta',
    'animate-pulse-glow', 'animate-flicker', 'animate-float', 'animate-scanline', 'animate-glow-pulse',
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk color palette
        cyber: {
          bg: '#0a0015',
          surface: '#120025',
          elevated: '#1a0035',
          border: 'rgba(0, 246, 255, 0.2)',
          borderHover: 'rgba(0, 246, 255, 0.4)',
        },
        neon: {
          cyan: '#00f6ff',
          magenta: '#ff00aa',
          purple: '#9d00ff',
          lime: '#00ff9d',
        },
      },
      fontFamily: {
        heading: ['Orbitron', 'sans-serif'],
        body: ['Exo 2', 'Rajdhani', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 246, 255, 0.5), 0 0 20px rgba(0, 246, 255, 0.3), 0 0 30px rgba(0, 246, 255, 0.2)',
        'neon-magenta': '0 0 10px rgba(255, 0, 170, 0.5), 0 0 20px rgba(255, 0, 170, 0.3), 0 0 30px rgba(255, 0, 170, 0.2)',
        'neon-purple': '0 0 10px rgba(157, 0, 255, 0.5), 0 0 20px rgba(157, 0, 255, 0.3), 0 0 30px rgba(157, 0, 255, 0.2)',
        'neon-lime': '0 0 10px rgba(0, 255, 157, 0.5), 0 0 20px rgba(0, 255, 157, 0.3), 0 0 30px rgba(0, 255, 157, 0.2)',
        'glow-cyan': '0 0 20px rgba(0, 246, 255, 0.6), 0 0 40px rgba(0, 246, 255, 0.4), 0 0 60px rgba(0, 246, 255, 0.2)',
        'glow-magenta': '0 0 20px rgba(255, 0, 170, 0.6), 0 0 40px rgba(255, 0, 170, 0.4), 0 0 60px rgba(255, 0, 170, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'glass-glow': '0 8px 32px 0 rgba(0, 246, 255, 0.2), inset 0 0 0 1px rgba(0, 246, 255, 0.3)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'scanline': 'scanline 2s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.2)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '41.99%': { opacity: '1' },
          '42%': { opacity: '0' },
          '43%': { opacity: '1' },
          '45.99%': { opacity: '1' },
          '46%': { opacity: '0' },
          '47%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 246, 255, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 246, 255, 0.8), 0 0 30px rgba(0, 246, 255, 0.5)' },
        },
      },
      backdropBlur: {
        'glass': '10px',
        'glass-lg': '20px',
      },
    },
  },
  plugins: [],
}
