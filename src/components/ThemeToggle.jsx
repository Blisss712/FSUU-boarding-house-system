import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Compact header button: one icon that cross-fades between sun and moon.
 * Used in the top bar on every screen size.
 */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className={`relative w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer ${className}`}
    >
      <Moon
        className={`absolute w-[17px] h-[17px] transition-all duration-300 ${
          isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
      />
      <Sun
        className={`absolute w-[18px] h-[18px] text-amber-400 transition-all duration-300 ${
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'
        }`}
      />
    </button>
  );
}

/**
 * Labelled switch used in the Profile settings card. Same state as the header
 * button, just a roomier control with a readable label for screen readers.
 */
export function ThemeSwitch() {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        isDark ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`theme-switch-thumb inline-block h-[18px] w-[18px] rounded-full transition-transform duration-200 ${
          isDark ? 'translate-x-[24px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
