import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// #67 Пресеты акцентного цвета
export const ACCENT_PRESETS = [
  { id: 'violet', name: 'Фиолетовый', color: '#7c5cff' },
  { id: 'blurple', name: 'Blurple', color: '#5865f2' },
  { id: 'pink', name: 'Розовый', color: '#e94560' },
  { id: 'green', name: 'Зелёный', color: '#3ba55d' },
  { id: 'amber', name: 'Янтарный', color: '#faa61a' },
  { id: 'cyan', name: 'Бирюзовый', color: '#1abc9c' },
];

export const THEMES = [
  { id: 'dark', name: 'Тёмная' },
  { id: 'light', name: 'Светлая' },
  { id: 'amoled', name: 'AMOLED' },
];

export const FONT_SIZES = [
  { id: 'sm', name: 'Мелкий' },
  { id: 'md', name: 'Обычный' },
  { id: 'lg', name: 'Крупный' },
];

const DEFAULT_ACCENT = '#7c5cff';

// Осветляем hex для hover-состояния акцента
const lighten = (hex, amount = 0.18) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const mix = (c) => Math.round(parseInt(c, 16) + (255 - parseInt(c, 16)) * amount);
  return '#' + [m[1], m[2], m[3]].map((c) => mix(c).toString(16).padStart(2, '0')).join('');
};

const read = (key, fallback) => {
  const saved = localStorage.getItem(key);
  return saved !== null ? saved : fallback;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // Миграция со старого формата (scam_theme хранил true/false)
    const legacy = localStorage.getItem('scam_theme');
    const saved = localStorage.getItem('scam_theme_mode');
    if (saved) return saved;
    if (legacy !== null) {
      try {
        return JSON.parse(legacy) ? 'dark' : 'light';
      } catch (e) {
        return 'dark';
      }
    }
    return 'dark';
  });

  const [accent, setAccentState] = useState(() => read('scam_accent', DEFAULT_ACCENT));
  const [fontSize, setFontSizeState] = useState(() => read('scam_font', 'md'));

  useEffect(() => {
    localStorage.setItem('scam_theme_mode', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('scam_accent', accent);
    const root = document.documentElement;
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-hover', lighten(accent));
  }, [accent]);

  useEffect(() => {
    localStorage.setItem('scam_font', fontSize);
    document.body.setAttribute('data-font', fontSize);
  }, [fontSize]);

  const setTheme = (t) => setThemeState(t);
  const setAccent = (c) => setAccentState(c);
  const setFontSize = (f) => setFontSizeState(f);

  // Обратная совместимость с существующим переключателем в App.js
  const isDark = theme !== 'light';
  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  const resetAccent = () => setAccentState(DEFAULT_ACCENT);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, accent, setAccent, resetAccent, fontSize, setFontSize, isDark, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
