"use client";
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useSettings } from './SettingsContext';

const NotificationSystem = ({ products = [] }) => {
  const { settings, isProductExpiringSoon, isProductExpired, isStockLow, isStockOut } = useSettings();

  useEffect(() => {
    if (!products.length || !settings.expiryAlerts) return;

    // Check for expiring products
    const expiringProducts = products.filter(product => 
      isProductExpiringSoon(product.expiration) && !isProductExpired(product.expiration)
    );

    // Check for expired products
    const expiredProducts = products.filter(product => 
      isProductExpired(product.expiration)
    );

    // Check for low stock products
    const lowStockProducts = products.filter(product => 
      isStockLow(parseInt(product.quantity || 0)) && settings.lowStockAlerts
    );

    // Check for out of stock products
    const outOfStockProducts = products.filter(product => 
      isStockOut(parseInt(product.quantity || 0))
    );

    // Show notifications with a delay to prevent spam
    const showNotifications = () => {
      if (expiredProducts.length > 0) {
        toast.error(`🚨 ${expiredProducts.length} product(s) have EXPIRED! Check your inventory immediately.`, {
          autoClose: 8000,
          toastId: 'expired-products'
        });
      }

      if (expiringProducts.length > 0) {
        toast.warning(`⚠️ ${expiringProducts.length} product(s) expiring within ${settings.expiryWarningDays} days. Review inventory soon.`, {
          autoClose: 6000,
          toastId: 'expiring-products'
        });
      }

      if (outOfStockProducts.length > 0) {
        toast.error(`📦 ${outOfStockProducts.length} product(s) are OUT OF STOCK!`, {
          autoClose: 5000,
          toastId: 'out-of-stock'
        });
      }

      if (lowStockProducts.length > 0) {
        toast.warning(`📉 ${lowStockProducts.length} product(s) are running LOW (≤${settings.lowStockThreshold} units)`, {
          autoClose: 4000,
          toastId: 'low-stock'
        });
      }
    };

    // Delay notifications to prevent overwhelming the user on page load
    const notificationTimer = setTimeout(showNotifications, 2000);

    return () => clearTimeout(notificationTimer);
  }, [products, settings, isProductExpiringSoon, isProductExpired, isStockLow, isStockOut]);

  return null; // This component doesn't render anything
};

export default NotificationSystem;
