/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-tertiary': '#334155',
        'text-primary': '#f8fafc',
        'text-secondary': '#94a3b8',
        'accent': '#3b82f6',
        'accent-hover': '#2563eb',
        'border': '#334155',
      },
    },
  },
  plugins: [],
}
