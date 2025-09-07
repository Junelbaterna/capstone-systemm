"use client";
import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useTheme } from './ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
      style={{
        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
        color: isDarkMode ? '#f8fafc' : '#0f172a',
        border: `2px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
        boxShadow: `0 10px 25px ${isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`
      }}
      title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} theme`}
    >
      {isDarkMode ? <FaSun className="w-5 h-5" /> : <FaMoon className="w-5 h-5" />}
    </button>
  );
  
};
    

export default ThemeToggle;
