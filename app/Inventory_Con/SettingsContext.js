"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    companyName: "Enguio Pharmacy",
    systemLanguage: "en",
    timezone: "Asia/Manila",
    dateFormat: "MM/DD/YYYY",
    currency: "PHP",
    emailNotifications: true,
    smsNotifications: false,
    lowStockAlerts: true,
    expiryAlerts: true,
    movementAlerts: true,
    sessionTimeout: 30,
    requirePasswordChange: false,
    twoFactorAuth: false,
    loginAttempts: 3,
    lowStockThreshold: 10,
    autoReorder: false,
    expiryWarningDays: 30, // Default 30 days warning
    barcodeScanning: true,
    theme: "light",
    compactMode: false,
    showImages: true,
    itemsPerPage: 20
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('enguio-settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsedSettings }));
        }
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Save settings to localStorage whenever settings change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('enguio-settings', JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving settings to localStorage:', error);
      }
    }
  }, [settings, isLoaded]);

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateSetting = (key, value) => {
    const oldValue = settings[key];
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Show notification for important setting changes
    if (key === 'expiryWarningDays' && oldValue !== value && isLoaded) {
      setTimeout(() => {
        toast.info(`⚙️ Expiry alert threshold updated to ${value} days. All inventory alerts will now use this new threshold.`);
      }, 100);
    }
    
    if (key === 'expiryAlerts' && isLoaded) {
      setTimeout(() => {
        toast.info(value ? '🔔 Expiry alerts enabled' : '🔕 Expiry alerts disabled');
      }, 100);
    }
    
    if (key === 'lowStockThreshold' && oldValue !== value && isLoaded) {
      setTimeout(() => {
        toast.info(`📊 Low stock threshold updated to ${value} units.`);
      }, 100);
    }
  };

  // Helper function to check if a product is expiring soon
  const isProductExpiringSoon = (expirationDate) => {
    if (!expirationDate || !settings.expiryAlerts) return false;
    
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= settings.expiryWarningDays && daysUntilExpiry > 0;
  };

  // Helper function to check if a product is expired
  const isProductExpired = (expirationDate) => {
    if (!expirationDate) return false;
    
    const today = new Date();
    const expiry = new Date(expirationDate);
    
    return expiry < today;
  };

  // Helper function to check if stock is low
  const isStockLow = (quantity) => {
    const qty = parseInt(quantity || 0);
    return qty <= settings.lowStockThreshold && qty > 0;
  };

  // Helper function to check if stock is out
  const isStockOut = (quantity) => {
    const qty = parseInt(quantity || 0);
    return qty === 0;
  };

  // Calculate expiry status with color coding
  const getExpiryStatus = (expirationDate) => {
    if (!expirationDate) return { status: 'no-expiry', color: 'gray', days: null };
    
    const today = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'red', days: Math.abs(daysUntilExpiry) };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'critical', color: 'red', days: daysUntilExpiry };
    } else if (daysUntilExpiry <= settings.expiryWarningDays) {
      return { status: 'warning', color: 'yellow', days: daysUntilExpiry };
    } else {
      return { status: 'good', color: 'green', days: daysUntilExpiry };
    }
  };

  const value = {
    settings,
    updateSettings,
    updateSetting,
    isLoaded,
    isProductExpiringSoon,
    isProductExpired,
    isStockLow,
    isStockOut,
    getExpiryStatus
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
