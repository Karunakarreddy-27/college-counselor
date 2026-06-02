/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa', // Light Teal
          100: '#ccfbf1',
          200: '#99f6e4',
          500: '#0d9488', // Main Teal
          600: '#0f766e',
          700: '#115e59',
          900: '#134e4a',
        },
        accent: {
          50: '#eff6ff', // Light Blue
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        slate: {
          850: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(20px)',
      }
    },
  },
  plugins: [],
}
