"use client";
import React, { useState } from 'react';
import { Tooltip } from '@heroui/tooltip';
import {
  FaTachometerAlt,
  FaBox,
  FaTruck,
  FaHistory,
  FaCog,
  FaUser,
  FaSignOutAlt,
  FaFileAlt,
  FaStore
} from "react-icons/fa";

const Sidebar = ({ onSelectFeature, selectedFeature, isSidebarOpen, setIsSidebarOpen, loginActivityBadge = 0, unreadLogsCount = 0, showBadge = false }) => {

  // Navigation items
  const navigationItems = [
    { label: "Dashboard", icon: <FaTachometerAlt />, key: "Dashboard" },
    { label: "Products", icon: <FaBox />, key: "products" },
    { label: "Supplier", icon: <FaTruck />, key: "Supplier" },
    { label: "Logs", icon: <FaFileAlt />, key: "Logs", badge: unreadLogsCount, showBadge: showBadge },
    { label: "Sales History", icon: <FaHistory />, key: "Sales History" },
    { label: "Store Settings", icon: <FaCog />, key: "Store Settings" },
    { label: "User", icon: <FaUser />, key: "User" },
  ];

  return (
    <div
      className={`fixed top-0 left-0 h-full transition-all duration-300 ease-in-out bg-white shadow-lg z-10 ${
        isSidebarOpen ? "w-64" : "w-18"
      }`}
      style={{ borderRight: '1px solid #e5e7eb' }}
    >
      {/* Burger Icon */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle Sidebar"
      >
        <img src='/assets/burger-bar.png' alt="Menu" className="w-6 h-6" />
      </button>

      {/* Logo Section */}
      {isSidebarOpen && (
        <div className="flex items-center justify-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img src='/assets/enguio_logo.png' alt="Enguio Logo" className="w-12 h-12" />
            <div>
              <h2 className="font-bold text-gray-800">ENGUIO</h2>
              <p className="text-sm text-gray-600">Admin Panel</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Section */}
      <div className={`flex-1 overflow-y-auto ${isSidebarOpen ? 'p-4 mt-4' : 'p-2 mt-16'}`}>
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <div key={item.key}>
              <Tooltip content={item.label} placement="right" className={`bg-black text-white rounded ${
                isSidebarOpen ? 'hidden' : ''
              }`}>
                <button
                  onClick={() => onSelectFeature(item.key)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 relative ${
                    selectedFeature === item.key
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`text-lg ${selectedFeature === item.key ? 'text-blue-600' : 'text-gray-500'}`}>
                    {item.icon}
                  </span>
                  {isSidebarOpen && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {/* Badge for Logs */}
                      {item.key === 'Logs' && (item.showBadge || item.badge > 0) && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {/* Badge for collapsed state */}
                  {!isSidebarOpen && item.key === 'Logs' && (item.showBadge || item.badge > 0) && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              </Tooltip>
            </div>
          ))}
        </nav>

        {/* Logout Section */}
        <div className={`${isSidebarOpen ? 'mt-8 pt-4' : 'mt-4'} border-t border-gray-200`}>
          <Tooltip content="Logout" placement="right" className={`bg-black text-white rounded ${
            isSidebarOpen ? 'hidden' : ''
          }`}>
            <button
              onClick={() => onSelectFeature('Logout')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-red-600 hover:bg-red-50 ${
                selectedFeature === 'Logout' ? 'bg-red-50' : ''
              }`}
            >
              <FaSignOutAlt className="text-lg" />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;