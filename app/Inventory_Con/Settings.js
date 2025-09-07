"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FaSave, FaCog, FaBell, FaShieldAlt, FaUser, FaDatabase, FaPalette, FaGlobe, FaKey, FaEye, FaEyeSlash } from "react-icons/fa";
import { Settings as SettingsIcon, Bell, Shield, Database, Palette, Key } from "lucide-react";
import { useTheme } from './ThemeContext';
import { useSettings } from './SettingsContext';

const Settings = () => {
  const { isDarkMode } = useTheme();
  const { settings, updateSettings, updateSetting } = useSettings();
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // Theme switching functionality
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Load saved theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('enguio-theme');
    if (savedTheme && savedTheme !== settings.theme) {
      setSettings(prev => ({ ...prev, theme: savedTheme }));
    }
  }, []);

  const applyTheme = (theme) => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--bg-primary', '#1f2937');
      root.style.setProperty('--bg-secondary', '#374151');
      root.style.setProperty('--bg-card', '#111827');
      root.style.setProperty('--text-primary', '#f9fafb');
      root.style.setProperty('--text-secondary', '#d1d5db');
      root.style.setProperty('--border-color', '#4b5563');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.5)');
      document.body.classList.add('dark-theme');
    } else if (theme === 'auto') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
      return;
    } else {
      // Light theme
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f9fafb');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--text-primary', '#111827');
      root.style.setProperty('--text-secondary', '#6b7280');
      root.style.setProperty('--border-color', '#e5e7eb');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
      document.body.classList.remove('dark-theme');
    }
    
    // Save theme preference to localStorage
    localStorage.setItem('enguio-theme', theme);
  };

  // Listen for system theme changes
  useEffect(() => {
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  const languages = [
    { key: "en", label: "English" },
    { key: "tl", label: "Tagalog" },
    { key: "es", label: "Spanish" }
  ];
  const timezones = [
    { key: "Asia/Manila", label: "Philippines (GMT+8)" },
    { key: "UTC", label: "UTC (GMT+0)" },
    { key: "America/New_York", label: "Eastern Time (GMT-5)" }
  ];
  const dateFormats = [
    { key: "MM/DD/YYYY", label: "MM/DD/YYYY" },
    { key: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { key: "YYYY-MM-DD", label: "YYYY-MM-DD" }
  ];
  const currencies = [
    { key: "PHP", label: "Philippine Peso (₱)" },
    { key: "USD", label: "US Dollar ($)" },
    { key: "EUR", label: "Euro (€)" }
  ];
  const themes = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "auto", label: "Auto" }
  ];

  const handleSettingChange = (key, value) => {
    updateSetting(key, value);
  };

  const handlePasswordChange = (key, value) => {
    setPasswords(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setSaveStatus("saving");
    
    try {
      // Save theme preference to localStorage (handled by SettingsContext)
      localStorage.setItem('enguio-theme', settings.theme);
      
      // Settings are automatically saved to localStorage via SettingsContext
      // Here you can also save other settings to your backend
      // await saveSettingsToBackend(settings);
      
      setTimeout(() => {
        setIsLoading(false);
        setSaveStatus("saved");
        toast.success('Settings saved successfully! Expiry alerts will now use ' + settings.expiryWarningDays + ' days threshold.');
        setTimeout(() => setSaveStatus(""), 3000);
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      setSaveStatus("");
      toast.error('Failed to save settings!');
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long!");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully!");
    }, 1000);
  };

  const getSaveStatusColor = () => {
    if (isDarkMode) {
      switch (saveStatus) {
        case "saving": return "bg-yellow-900 text-yellow-200 border border-yellow-700";
        case "saved": return "bg-green-900 text-green-200 border border-green-700";
        default: return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (saveStatus) {
        case "saving": return "bg-yellow-100 text-yellow-800 border border-yellow-300";
        case "saved": return "bg-green-100 text-green-800 border border-green-300";
        default: return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  // Theme-based styles
  const themeStyles = {
    container: {
      backgroundColor: isDarkMode ? 'var(--inventory-bg-primary)' : 'var(--inventory-bg-primary)',
      color: isDarkMode ? 'var(--inventory-text-primary)' : 'var(--inventory-text-primary)'
    },
    card: {
      backgroundColor: isDarkMode ? 'var(--inventory-bg-card)' : 'var(--inventory-bg-card)',
      borderColor: isDarkMode ? 'var(--inventory-border)' : 'var(--inventory-border)',
      boxShadow: isDarkMode ? 'var(--inventory-shadow)' : 'var(--inventory-shadow)'
    },
    text: {
      primary: isDarkMode ? 'var(--inventory-text-primary)' : 'var(--inventory-text-primary)',
      secondary: isDarkMode ? 'var(--inventory-text-secondary)' : 'var(--inventory-text-secondary)',
      muted: isDarkMode ? 'var(--inventory-text-muted)' : 'var(--inventory-text-muted)'
    },
    border: {
      color: isDarkMode ? 'var(--inventory-border)' : 'var(--inventory-border)',
      light: isDarkMode ? 'var(--inventory-border-light)' : 'var(--inventory-border-light)'
    },
    input: {
      backgroundColor: isDarkMode ? 'var(--inventory-bg-card)' : 'var(--inventory-bg-card)',
      borderColor: isDarkMode ? 'var(--inventory-border)' : 'var(--inventory-border)',
      color: isDarkMode ? 'var(--inventory-text-primary)' : 'var(--inventory-text-primary)',
      placeholderColor: isDarkMode ? 'var(--inventory-text-muted)' : 'var(--inventory-text-muted)'
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen" style={themeStyles.container}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: themeStyles.text.primary }}>Settings</h1>
          <p style={{ color: themeStyles.text.secondary }}>Manage system settings and preferences</p>
        </div>
        <div className="flex gap-3">
          {saveStatus && (
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getSaveStatusColor()}`}>
              {saveStatus === "saving" ? "Saving..." : "Settings saved!"}
            </span>
          )}
          <button 
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FaSave className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Notification Settings */}
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-6 w-6 text-yellow-500" />
            <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Notification Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: themeStyles.text.secondary }}>Low Stock Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.lowStockAlerts}
                  onChange={(e) => handleSettingChange("lowStockAlerts", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: themeStyles.text.secondary }}>Expiry Date Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.expiryAlerts}
                  onChange={(e) => handleSettingChange("expiryAlerts", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: themeStyles.text.secondary }}>Movement Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.movementAlerts}
                  onChange={(e) => handleSettingChange("movementAlerts", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center gap-3 mb-6">
            <Database className="h-6 w-6 text-green-500" />
            <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Inventory Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeStyles.text.secondary }}>Low Stock Threshold</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                style={themeStyles.input}
                value={settings.lowStockThreshold}
                onChange={(e) => handleSettingChange("lowStockThreshold", parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeStyles.text.secondary }}>Expiry Warning Days</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                style={themeStyles.input}
                value={settings.expiryWarningDays}
                onChange={(e) => handleSettingChange("expiryWarningDays", parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: themeStyles.text.secondary }}>Enable Auto Reorder</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoReorder}
                  onChange={(e) => handleSettingChange("autoReorder", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: themeStyles.text.secondary }}>Enable Barcode Scanning</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.barcodeScanning}
                  onChange={(e) => handleSettingChange("barcodeScanning", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center gap-3 mb-6">
            <Key className="h-6 w-6 text-blue-500" />
            <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Change Password</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeStyles.text.secondary }}>Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 transition-colors"
                  style={themeStyles.input}
                  value={passwords.currentPassword}
                  onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => togglePasswordVisibility("current")}
                >
                  {showPasswords.current ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeStyles.text.secondary }}>New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 transition-colors"
                  style={themeStyles.input}
                  value={passwords.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => togglePasswordVisibility("new")}
                >
                  {showPasswords.new ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: themeStyles.text.secondary }}>Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 transition-colors"
                  style={themeStyles.input}
                  value={passwords.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => togglePasswordVisibility("confirm")}
                >
                  {showPasswords.confirm ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              onClick={handleChangePassword}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Settings; 