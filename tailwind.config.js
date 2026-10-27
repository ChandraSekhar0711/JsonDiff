/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      colors: {
        // Surfaces — consumed by every panel, card, header, and editor.
        'bg-app': 'var(--color-bg-app)',
        'bg-header': 'var(--color-bg-header)',
        'bg-panel': 'var(--color-bg-panel)',
        'bg-elevated': 'var(--color-bg-elevated)',
        'bg-editor': 'var(--color-bg-editor)',
        'bg-input': 'var(--color-bg-input)',
        'bg-hover': 'var(--color-bg-hover)',
        // Borders
        'br-default': 'var(--color-border-default)',
        'br-subtle': 'var(--color-border-subtle)',
        // Text
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        // Accent
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        // Semantic comparison results
        added: 'var(--color-added)',
        'added-bg': 'var(--color-added-bg)',
        removed: 'var(--color-removed)',
        'removed-bg': 'var(--color-removed-bg)',
        modified: 'var(--color-modified)',
        'modified-bg': 'var(--color-modified-bg)',
        'type-changed': 'var(--color-type-changed)',
        'type-changed-bg': 'var(--color-type-changed-bg)',
        info: 'var(--color-info)',
        'info-bg': 'var(--color-info-bg)',
      },
      // The bare `border` utility defaults to the near-white slate-200 in
      // Tailwind, which reads as a white line on the dark background — point
      // every border at the dark token instead.
      borderColor: {
        DEFAULT: 'var(--color-border-default)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
  plugins: [],
}