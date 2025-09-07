"use client";
import React, { useState } from 'react';
import { Tooltip } from '@heroui/tooltip'; // Corrected import

const Sidebar = ({ onSelectFeature, selectedFeature,isSidebarOpen,setIsSidebarOpen, loginActivityBadge = 0, unreadLogsCount = 0, showBadge = false }) => {
  // Start collapsed by default

  return (
    <div
      className={`fixed top-0 left-0 h-full transition-all duration-300 ease-in-out bg-gray-100 text-black p-4 z-10 ${
        isSidebarOpen ? "w-64" : "w-18"
      }`}
    >
      {/* Burger Icon - Always on top */}
      <button
  onClick={() => {
  
    setIsSidebarOpen(!isSidebarOpen);
    // Log the new state
  }}
  className="absolute top-3 right-3 p-2 ml-0"
  aria-label="Toggle Sidebar"
>
  
<img src='/assets/burger-bar.png' alt="Dashboard" className="w-7 h-7" />
      </button>

      {/* Logo Section - Only shown when sidebar is open */}
      {isSidebarOpen && (
        <div className="flex items-center gap-2 mb-6 mt-3  hover:cursor-pointer">
          <img src='/assets/enguio_logo.png' alt="Dashboard" className="w-20 h-20" />
        </div>
      )}

      {/* Navigation Section */}
      <div className="space-y-1 mt-10 overflow-y-auto">
        <ul className="space-y-1">
          {/* Dashboard */}
          <li>
            <Tooltip content="Dashboard" placement="right" className={`bg-black text-white w-20 rounded ${
              isSidebarOpen ? 'hidden' : ''
            }`}>
              <button
                onClick={() => onSelectFeature('Dashboard')}
                className={`block px-1 py-2 rounded hover:bg-green-300 w-full text-left text-lg flex items-center gap-3 ${
                  selectedFeature === 'Dashboard' ? 'bg-green-500' : ''
                }`}
              >
                <img src='/assets/dashboard (1).png' alt="Dashboard" className="w-7 h-7" />
                <span className={`${!isSidebarOpen ? 'hidden' : 'inline'}`}>Dashboard</span>
              </button>
            </Tooltip>
          </li>

          {/* Products */}
          <li>
            <Tooltip content="Products" placement="right" className={`bg-black text-white w-17 rounded
              ${isSidebarOpen ? 'hidden' : ''}`}>
              <button
                onClick={() => onSelectFeature('products')}
                className={`block px-1 py-2 rounded hover:bg-green-300 w-full text-left text-lg flex items-center gap-3 ${
                  selectedFeature === 'products' ? 'bg-green-500' : ''
                }`}
              >
                <img src='/assets/box (1).png' alt="Products" className="w-7 h-7" />
                <span className={`${!isSidebarOpen ? 'hidden' : 'inline'}`}>Products</span>
              </button>
            </Tooltip>
          </li>

          {/* Vendor */}
          <li>
            <Tooltip content="Supplier" placement="right" className={`bg-black text-white w-14 rounded
              ${isSidebarOpen ? 'hidden':''}`}>
              <button
                onClick={() => onSelectFeature('Supplier')}
                className={`block px-1 py-2 rounded hover:bg-green-300 w-full text-left text-lg flex items-center gap-3 ${
                  selectedFeature === 'Supplier' ? 'bg-green-500' : ''
                }`}
              >
                <img src='/assets/parcel.png' alt="Supplier" className="w-7 h-7" />
                <span className={`${!isSidebarOpen ? 'hidden' : 'inline'}`}>Supplier</span>
              </button>
            </Tooltip>
          </li>

          {/* Category */}
         

          {/* Brand */}
          <li>
            <Tooltip content="Logs" placement="right" className={`bg-black text-white w-20 rounded
              ${isSidebarOpen?'hidden':''}`}>
              <button
                onClick={() => onSelectFeature('Logs')}
                className={`block px-1 py-2 rounded hover:bg-green-300 w-full text-left text-lg flex items-center gap-3 relative ${
                  selectedFeature === 'Logs' ? 'bg-green-500' : ''
                }`}
              >
                <img src='/assets/log.png' alt="Logs" className="w-7 h-7" />
                <span className={`${!isSidebarOpen ? 'hidden' : 'inline'}`}>Logs</span>
                
                {/* Unread logs badge - only show after navigation to Logs */}
                {(showBadge || unreadLogsCount > 0) && (
                  <span className="absolute top-0 right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadLogsCount > 99 ? '99+' : unreadLogsCount}
                  </span>
                )}
              </button>
            </Tooltip>
          </li>

          {/* Shortcuts to Inventory and POS */}
          <li>
            <Tooltip content="Inventory" placement="right" className={`bg-black text-white w-22 rounded ${isSidebarOpen ? 'hidden' : ''}`}>
              <a href="/Inventory_Con" className={`block px-1 py-2 rounded hover:bg-green-300 w-full text-left text-lg flex items-center gap-3`}>
                <img src='/assets/warehouse.png' alt="Inventory" className="w-7 h-7" />
                <span className={`${!isSidebarOpen ? 'hidden' : 'inline'}`}>Inventory</span>
              </a>
            </Tooltip>
          </li>

          {/* Login Activity removed - activity logs consolidated under Logs */}

          {/* Sales History */}
          <li>
            <Tooltip content="Sales History" placement="right" className={`bg-black text-white w-25 rounded
              ${isSidebarOpen?'hidden':''}`}>
              <button
                onClick={() => onSelectFeature('Sales History')}
                className={`block px-1 py-2 rounded hover:bg-green-300 w-full text-left text-lg flex items-center gap-3 ${
                  selectedFeature === 'Sales History' ? 'bg-green-500' : ''
                }`}
              >
                <img src='/assets/restore.png' alt="Sales History" className="w-7 h-7" />
                <span className={`${!isSidebarOpen ? 'hidden' : 'inline'}`}>Sales History</span>
              </button>
            </Tooltip>
          </li>

          {/* Store Settings */}
          <li>
            <Tooltip content="Store Settings" placement="right" className={`bg-black text-white w-27 rounded
              ${isSidebarOpen?'hidden':''}`}>
              <button
                onClick={() => onSelectFeature('Store Settings')}
                className={`block px-1 py-2 rounded hover:bg-green-300 w-full text-left text-lg flex items-center gap-3 ${
                  selectedFeature === 'Store Settings' ? 'bg-green-500' : ''
                }`}
              >
                <img src='/assets/setting.png' alt="Store Settings" className="w-7 h-7" />
                <span className={`${!isSidebarOpen ? 'hidden' : 'inline'}`}>Store Settings</span>
              </button>
            </Tooltip>
          </li>

          {/* User */}
          <li>
            <Tooltip content="User" placement="right" className={`bg-black text-white w-20 rounded
              ${isSidebarOpen?'hidden':''}`}>
              <button
                onClick={() => onSelectFeature('User')}
                className={`block px-1 py-2 rounded hover:bg-green-300 w-full text-left text-lg flex items-center gap-3 ${
                  selectedFeature === 'User' ? 'bg-green-500' : ''
                }`}
              >
                <img src='/assets/profile-user.png' alt="User" className="w-7 h-7" />
                <span className={`${!isSidebarOpen ? 'hidden' : 'inline'}`}>User</span>
              </button>
            </Tooltip>
          </li>

          {/* Logout */}
          <li>
            <Tooltip content="Logout" placement="right" className={`bg-black text-white w-20 rounded
              ${isSidebarOpen?'hidden':''}`}>
              <button
                onClick={() => onSelectFeature('Logout')}
                className={`block px-1 py-2 rounded hover:bg-green-300 w-full text-left text-lg flex items-center gap-3 ${
                  selectedFeature === 'Logout' ? 'bg-green-500' : ''
                }`}
              >
                <img src='/assets/logout (1).png' alt="Logout" className="w-7 h-7" />
                <span className={`${!isSidebarOpen ? 'hidden' : 'inline'}`}>Logout</span>
              </button>
            </Tooltip>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;