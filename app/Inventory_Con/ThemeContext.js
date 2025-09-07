"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode for inventory

  useEffect(() => {
    // Check if user has a saved theme preference
    const savedTheme = localStorage.getItem('enguio-inventory-theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
    
    // Apply theme immediately
    applyInventoryTheme(true);
  }, []);

  const applyInventoryTheme = (darkMode) => {
    const root = document.documentElement;
    
    if (darkMode) {
      // Dark theme for inventory
      root.style.setProperty('--inventory-bg-primary', '#0f172a');
      root.style.setProperty('--inventory-bg-secondary', '#1e293b');
      root.style.setProperty('--inventory-bg-card', '#334155');
      root.style.setProperty('--inventory-bg-hover', '#475569');
      root.style.setProperty('--inventory-text-primary', '#f8fafc');
      root.style.setProperty('--inventory-text-secondary', '#cbd5e1');
      root.style.setProperty('--inventory-text-muted', '#94a3b8');
      root.style.setProperty('--inventory-border', '#475569');
      root.style.setProperty('--inventory-border-light', '#64748b');
      root.style.setProperty('--inventory-shadow', 'rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--inventory-accent', '#3b82f6');
      root.style.setProperty('--inventory-accent-hover', '#2563eb');
      root.style.setProperty('--inventory-success', '#10b981');
      root.style.setProperty('--inventory-warning', '#f59e0b');
      root.style.setProperty('--inventory-danger', '#ef4444');
      root.style.setProperty('--inventory-info', '#06b6d4');
      
      document.body.classList.add('inventory-dark-theme');
      document.body.classList.remove('inventory-light-theme');
    } else {
      // Light theme for inventory
      root.style.setProperty('--inventory-bg-primary', '#ffffff');
      root.style.setProperty('--inventory-bg-secondary', '#f8fafc');
      root.style.setProperty('--inventory-bg-card', '#ffffff');
      root.style.setProperty('--inventory-bg-hover', '#f1f5f9');
      root.style.setProperty('--inventory-text-primary', '#0f172a');
      root.style.setProperty('--inventory-text-secondary', '#475569');
      root.style.setProperty('--inventory-text-muted', '#64748b');
      root.style.setProperty('--inventory-border', '#e2e8f0');
      root.style.setProperty('--inventory-border-light', '#f1f5f9');
      root.style.setProperty('--inventory-shadow', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--inventory-accent', '#3b82f6');
      root.style.setProperty('--inventory-accent-hover', '#2563eb');
      root.style.setProperty('--inventory-success', '#10b981');
      root.style.setProperty('--inventory-warning', '#f59e0b');
      root.style.setProperty('--inventory-danger', '#ef4444');
      root.style.setProperty('--inventory-info', '#06b6d4');
      
      document.body.classList.remove('inventory-dark-theme');
      document.body.classList.add('inventory-light-theme');
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    applyInventoryTheme(newDarkMode);
    localStorage.setItem('enguio-inventory-theme', newDarkMode ? 'dark' : 'light');
  };

  const setTheme = (darkMode) => {
    setIsDarkMode(darkMode);
    applyInventoryTheme(darkMode);
    localStorage.setItem('enguio-inventory-theme', darkMode ? 'dark' : 'light');
  };

  useEffect(() => {
    applyInventoryTheme(isDarkMode);
  }, [isDarkMode]);

  const value = {
    isDarkMode,
    toggleTheme,
    setTheme,
    theme: {
      bg: {
        primary: 'var(--inventory-bg-primary)',
        secondary: 'var(--inventory-bg-secondary)',
        card: 'var(--inventory-bg-card)',
        hover: 'var(--inventory-bg-hover)',
      },
      text: {
        primary: 'var(--inventory-text-primary)',
        secondary: 'var(--inventory-text-secondary)',
        muted: 'var(--inventory-text-muted)',
      },
      border: {
        default: 'var(--inventory-border)',
        light: 'var(--inventory-border-light)',
      },
      shadow: 'var(--inventory-shadow)',
      colors: {
        accent: 'var(--inventory-accent)',
        accentHover: 'var(--inventory-accent-hover)',
        success: 'var(--inventory-success)',
        warning: 'var(--inventory-warning)',
        danger: 'var(--inventory-danger)',
        info: 'var(--inventory-info)',
      }
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
