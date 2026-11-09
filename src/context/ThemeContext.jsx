import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Light / dark theme for the whole app.
 *
 * The choice is stored in localStorage and reflected as a `dark` class on
 * <html>, which is what `src/styles/dark-theme.css` keys its palette overrides
 * on. Until the visitor picks a side we follow the OS setting, so the app opens
 * in whichever mode the device is already in.
 */

const STORAGE_KEY = 'balay-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext({ theme: 'light', isDark: false, toggleTheme: () => {} });

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Private browsing / storage disabled: just follow the OS.
  }
  return null;
}

function systemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readStoredTheme() ?? systemTheme());
  // Only true while the visitor has never used the toggle on this device.
  const [followsSystem, setFollowsSystem] = useState(() => readStoredTheme() === null);

  // Keep <html> and the browser chrome (mobile address bar, form controls) in sync.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f1f5f9');
    }
  }, [theme]);

  // Follow the OS live, until the visitor explicitly chooses a mode.
  useEffect(() => {
    if (!followsSystem || !window.matchMedia) return undefined;

    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event) => setTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [followsSystem]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setFollowsSystem(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting is best-effort; the toggle still works for this session.
    }
  }, [theme]);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
