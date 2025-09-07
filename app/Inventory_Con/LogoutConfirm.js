"use client";
import React from "react";
import { FaSignOutAlt, FaExclamationTriangle, FaTimes } from "react-icons/fa";

const LogoutConfirm = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 max-w-md w-full mx-4 transform transition-all duration-300 scale-100 animate-fade-in-up">
        {/* Header */}
        <div className="relative p-6 border-b border-slate-200/60 bg-gradient-to-r from-red-50 to-orange-50 rounded-t-2xl">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
              <FaSignOutAlt className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-center text-slate-800 mb-2">
            Confirm Logout
          </h3>
          
          <p className="text-slate-600 text-center font-medium">
            Are you sure you want to logout?
          </p>
        </div>

        {/* Warning Message */}
        <div className="p-6">
          <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <FaExclamationTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-medium">
                Unsaved Changes Warning
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Any unsaved changes will be lost when you logout.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 space-y-3">
          <button
            onClick={onConfirm}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Yes, Logout
          </button>
          
          <button
            onClick={onCancel}
            className="w-full px-6 py-3 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200"
        >
          <FaTimes className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default LogoutConfirm; 