"use client";
import React, { useState } from "react";
import {
  FaTachometerAlt,
  FaBoxOpen,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaTruck,
  FaClipboardList,
  FaTags,
  FaChartLine,
  FaHistory,
  FaBoxes,
  FaWarehouse,
  FaPills,
  FaFileInvoiceDollar,
  FaArchive,
  FaTimes,
  FaStore,
} from "react-icons/fa";
import { useTheme } from "./ThemeContext";

const Sidebar = ({
  activeComponent,
  setActiveComponent,
  onLogout,
  isMobileOpen,
  onClose,
}) => {
  const [isInventoryDropdownOpen, setIsInventoryDropdownOpen] = useState(false);
  const { theme } = useTheme();

  // Navigation items with proper mapping
  const navigationItems = [
    { label: "Dashboard", icon: <FaTachometerAlt />, key: "Dashboard" },
    { label: "Warehouse", icon: <FaWarehouse />, key: "Warehouse" },
    { label: "Convenience Store", icon: <FaStore />, key: "ConvenienceStore" },
    { label: "Pharmacy Inventory", icon: <FaPills />, key: "PharmacyInventory" },
    { label: "Inventory Transfer", icon: <FaTruck />, key: "InventoryTransfer" },
    { label: "Create Purchase Order", icon: <FaFileInvoiceDollar />, key: "CreatePurchaseOrder" },
    { label: "Stock Adjustment", icon: <FaClipboardList />, key: "StockAdjustment" },
    { label: "Reports", icon: <FaChartLine />, key: "Reports" },
    { label: "Movement History", icon: <FaHistory />, key: "MovementHistory" },
    { label: "Archive", icon: <FaArchive />, key: "Archive" },
    { label: "Settings", icon: <FaCog />, key: "Settings" },
  ];

  const handleNavigation = (componentKey) => {
    setActiveComponent(componentKey);
    if (onClose) onClose();
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-64 h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-col ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      style={{ backgroundColor: theme.bg.card, borderRight: `1px solid ${theme.border.default}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:hidden" style={{ borderBottom: `1px solid ${theme.border.default}` }}>
        <div className="font-semibold" style={{ color: theme.text.primary }}>Menu</div>
        <button
          onClick={onClose}
          className="p-2 rounded"
          aria-label="Close sidebar"
          style={{ color: theme.text.primary }}
        >
          <FaTimes />
        </button>
      </div>

      {/* Profile Section */}
      <div className="p-6" style={{ borderBottom: `1px solid ${theme.border.default}` }}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div>
            <p className="font-semibold" style={{ color: theme.text.primary }}>Elmer Enguio</p>
            <p className="text-sm" style={{ color: theme.text.secondary }}>Inventory Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigation(item.key)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200"
              style={{
                backgroundColor: activeComponent === item.key ? theme.colors.accent + '20' : 'transparent',
                color: activeComponent === item.key ? theme.colors.accent : theme.text.primary,
                borderLeft: activeComponent === item.key ? `4px solid ${theme.colors.accent}` : 'none',
              }}
              onMouseEnter={(e) => {
                if (activeComponent !== item.key) {
                  e.target.style.backgroundColor = theme.bg.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (activeComponent !== item.key) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="text-lg" style={{ color: activeComponent === item.key ? theme.colors.accent : theme.text.secondary }}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="p-4" style={{ borderTop: `1px solid ${theme.border.default}` }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200"
          style={{ color: theme.colors.danger }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = theme.colors.danger + '20';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          <FaSignOutAlt className="text-lg" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
