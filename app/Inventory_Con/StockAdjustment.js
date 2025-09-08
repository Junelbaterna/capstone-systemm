"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { 
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaFilter, 
  FaDownload, 
  FaUpload, 
  FaMinus, 
  FaPlus as FaPlusIcon 
} from "react-icons/fa";
import { Package, TrendingUp, TrendingDown, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useTheme } from "./ThemeContext";

const StockAdjustment = () => {
  const { isDarkMode } = useTheme();
  const isDark = isDarkMode;
  const [adjustments, setAdjustments] = useState([]);
  const [filteredAdjustments, setFilteredAdjustments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  
  // Ensure page is always a positive integer
  const setPageSafe = (newPage) => {
    const pageNum = Math.max(1, parseInt(newPage) || 1);
    setPage(pageNum);
  };
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({
    total_adjustments: 0,
    additions: 0,
    subtractions: 0,
    net_quantity: 0
  });
  const [totalRecords, setTotalRecords] = useState(0);
  const [newAdjustment, setNewAdjustment] = useState({
    product_id: "",
    product_name: "",
    adjustment_type: "Addition",
    quantity: 0,
    reason: "",
    notes: "",
    unit_cost: 0,
    expiration_date: ""
  });

  // API Functions
  const handleApiCall = async (action, data = {}) => {
    try {
              const response = await fetch('/Api/backend.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...data
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'API call failed');
      }
      
      return result;
    } catch (error) {
      console.error(`API Error (${action}):`, error);
      throw error;
    }
  };

  // Fetch stock adjustments
  const fetchAdjustments = async () => {
    setIsLoading(true);
    try {
      const result = await handleApiCall('get_stock_adjustments', {
        search: searchTerm,
        type: selectedType === 'all' ? 'all' : (selectedType === 'Addition' ? 'IN' : 'OUT'),
        status: selectedStatus,
        page: parseInt(page),
        limit: parseInt(rowsPerPage)
      });
      
      setAdjustments(result.data || []);
      setFilteredAdjustments(result.data || []);
      setTotalRecords(result.total || 0);
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      toast.error('Failed to fetch adjustments: ' + (error.message || 'Unknown error'));
      setAdjustments([]);
      setFilteredAdjustments([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const result = await handleApiCall('get_stock_adjustment_stats');
      setStats(result.data || {
        total_adjustments: 0,
        additions: 0,
        subtractions: 0,
        net_quantity: 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({
        total_adjustments: 0,
        additions: 0,
        subtractions: 0,
        net_quantity: 0
      });
    }
  };

  // Create new adjustment
  const createAdjustment = async (adjustmentData) => {
    try {
      const result = await handleApiCall('create_stock_adjustment', {
        product_id: adjustmentData.product_id,
        adjustment_type: adjustmentData.adjustment_type,
        quantity: adjustmentData.quantity,
        reason: adjustmentData.reason,
        notes: adjustmentData.notes,
        unit_cost: adjustmentData.unit_cost,
        expiration_date: adjustmentData.expiration_date,
        created_by: 'admin' // This should come from user session
      });
      
      // Log the activity with user context
      try {
        const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
        await fetch('http://localhost/Enguio_Project/Api/backend.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log_activity',
            activity_type: 'STOCK_ADJUSTMENT_CREATED',
            description: `Stock ${adjustmentData.adjustment_type}: ${adjustmentData.quantity} units of ${adjustmentData.product_name || 'Product'} (Reason: ${adjustmentData.reason})`,
            table_name: 'tbl_stock_movements',
            record_id: result.data?.adjustment_id || null,
            user_id: userData.user_id || userData.emp_id,
            username: userData.username,
            role: userData.role,
          }),
        });
      } catch (_) {}
      
      toast.success('Stock adjustment created successfully');
      setShowCreateModal(false);
      setNewAdjustment({
        product_id: "",
        product_name: "",
        adjustment_type: "Addition",
        quantity: 0,
        reason: "",
        notes: "",
        unit_cost: 0,
        expiration_date: ""
      });
      
      // Refresh data
      await fetchAdjustments();
      await fetchStats();
      
      return result;
    } catch (error) {
      // Log the error
      try {
        await fetch('http://localhost/Enguio_Project/Api/backend.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log_activity',
            activity_type: 'STOCK_ADJUSTMENT_ERROR',
            description: `Failed to create stock adjustment: ${error.message}`,
            table_name: 'tbl_stock_movements',
            record_id: null,
          }),
        });
      } catch (_) {}
      
      toast.error('Failed to create adjustment: ' + error.message);
      throw error;
    }
  };

  // Update adjustment
  const updateAdjustment = async (adjustmentData) => {
    try {
      const result = await handleApiCall('update_stock_adjustment', {
        movement_id: adjustmentData.id,
        quantity: adjustmentData.quantity,
        reason: adjustmentData.reason,
        notes: adjustmentData.notes,
        unit_cost: adjustmentData.unit_cost,
        expiration_date: adjustmentData.expiration_date
      });
      
      // Log the activity
      try {
        await fetch('http://localhost/Enguio_Project/Api/backend.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log_activity',
            activity_type: 'STOCK_ADJUSTMENT_UPDATED',
            description: `Updated stock adjustment: ${adjustmentData.quantity} units (Reason: ${adjustmentData.reason})`,
            table_name: 'tbl_stock_movements',
            record_id: adjustmentData.id,
          }),
        });
      } catch (_) {}
      
      toast.success('Adjustment updated successfully');
      setShowModal(false);
      setEditingAdjustment(null);
      
      // Refresh data
      await fetchAdjustments();
      await fetchStats();
      
      return result;
    } catch (error) {
      // Log the error
      try {
        await fetch('http://localhost/Enguio_Project/Api/backend.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log_activity',
            activity_type: 'STOCK_ADJUSTMENT_UPDATE_ERROR',
            description: `Failed to update stock adjustment ID ${adjustmentData.id}: ${error.message}`,
            table_name: 'tbl_stock_movements',
            record_id: adjustmentData.id,
          }),
        });
      } catch (_) {}
      
      toast.error('Failed to update adjustment: ' + error.message);
      throw error;
    }
  };

  // Delete adjustment
  const deleteAdjustment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this adjustment?')) {
      return;
    }
    
    try {
      const result = await handleApiCall('delete_stock_adjustment', {
        movement_id: id
      });
      
      toast.success('Adjustment deleted successfully');
      
      // Refresh data
      await fetchAdjustments();
      await fetchStats();
      
      return result;
    } catch (error) {
      toast.error('Failed to delete adjustment: ' + error.message);
      throw error;
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchAdjustments();
    fetchStats();
  }, []);

  // Refresh data when filters change
  useEffect(() => {
    // Reset to first page when filters change
    if (page !== 1) {
      setPage(1);
    } else {
      fetchAdjustments();
    }
  }, [searchTerm, selectedType, selectedStatus, rowsPerPage]);
  
  // Fetch data when page changes
  useEffect(() => {
    fetchAdjustments();
  }, [page]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "Addition":
        return "bg-green-100 text-green-800";
      case "Subtraction":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleEdit = (adjustment) => {
    setEditingAdjustment(adjustment);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (editingAdjustment) {
      await updateAdjustment(editingAdjustment);
    }
  };

  const handleDelete = async (id) => {
    await deleteAdjustment(id);
  };

  const handleCreate = async () => {
    if (!newAdjustment.product_id || !newAdjustment.quantity || !newAdjustment.reason) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    await createAdjustment(newAdjustment);
  };

  const adjustmentTypes = ["all", "Addition", "Subtraction"];
  const statuses = ["all", "Approved", "Pending", "Rejected"];
  
  // Calculate total pages
  const pages = Math.ceil(totalRecords / rowsPerPage);

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Stock Adjustment</h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Manage inventory adjustments and stock modifications</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-900">
            <FaUpload className="h-4 w-4" />
            Import
          </button>


        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6`}>
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Adjustments</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total_adjustments}</p>
            </div>
          </div>
        </div>
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6`}>
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Additions</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.additions}</p>
            </div>
          </div>
        </div>
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6`}>
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Subtractions</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.subtractions}</p>
            </div>
          </div>
        </div>
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6`}>
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Net Quantity</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.net_quantity}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl p-6`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search adjustments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
              />
            </div>
          </div>
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
            >
              {adjustmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Types" : type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All Status" : status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl`}>
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Adjustments</h3>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {isLoading ? 'Loading...' : `${filteredAdjustments.length} adjustments found`}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full min-w-max">
            <thead className={`${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b sticky top-0 z-10`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  PRODUCT
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  TYPE
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  QUANTITY
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  REASON
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  ADJUSTED BY
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  DATE & TIME
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  STATUS
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className={`px-6 py-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Loading adjustments...
                  </td>
                </tr>
              ) : filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan="8" className={`px-6 py-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No adjustments found
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((item) => (
                  <tr key={item.id} className={`hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div>
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.product_name}</div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID: {item.product_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.adjustment_type)}`}>
                        {item.adjustment_type === "Addition" ? <FaPlusIcon className="h-3 w-3" /> : <FaMinus className="h-3 w-3" />}
                        {item.adjustment_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate" title={item.reason}>
                        <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.reason}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.adjusted_by || 'Admin'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.date}</div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.time}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900 p-1">
                          <FaEye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center mt-4 pb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPageSafe(page - 1)}
                disabled={page === 1}
                className={`px-3 py-1 border rounded disabled:opacity-50 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Previous
              </button>
              <span className={`px-3 py-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPageSafe(page + 1)}
                disabled={page === pages}
                className={`px-3 py-1 border rounded disabled:opacity-50 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Adjustment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Adjustment</h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Product ID *</label>
                    <input
                      type="text"
                      value={newAdjustment.product_id}
                      onChange={(e) => setNewAdjustment({...newAdjustment, product_id: e.target.value})}
                      placeholder="Enter product ID"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Product Name</label>
                    <input
                      type="text"
                      value={newAdjustment.product_name}
                      onChange={(e) => setNewAdjustment({...newAdjustment, product_name: e.target.value})}
                      placeholder="Enter product name"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Adjustment Type</label>
                    <select
                      value={newAdjustment.adjustment_type}
                      onChange={(e) => setNewAdjustment({...newAdjustment, adjustment_type: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                    >
                      <option value="Addition">Addition</option>
                      <option value="Subtraction">Subtraction</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quantity *</label>
                    <input
                      type="number"
                      value={newAdjustment.quantity}
                      onChange={(e) => setNewAdjustment({...newAdjustment, quantity: parseInt(e.target.value) || 0})}
                      min="1"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Reason *</label>
                  <input
                    type="text"
                    value={newAdjustment.reason}
                    onChange={(e) => setNewAdjustment({...newAdjustment, reason: e.target.value})}
                    placeholder="Enter reason for adjustment"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Unit Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newAdjustment.unit_cost}
                      onChange={(e) => setNewAdjustment({...newAdjustment, unit_cost: parseFloat(e.target.value) || 0})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Expiration Date</label>
                    <input
                      type="date"
                      value={newAdjustment.expiration_date}
                      onChange={(e) => setNewAdjustment({...newAdjustment, expiration_date: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                  <textarea
                    value={newAdjustment.notes}
                    onChange={(e) => setNewAdjustment({...newAdjustment, notes: e.target.value})}
                    placeholder="Additional notes..."
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                  />
                </div>
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button 
                onClick={() => setShowCreateModal(false)}
                className={`px-4 py-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Adjustment</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {editingAdjustment && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Product Name</label>
                      <input
                        type="text"
                        value={editingAdjustment.product_name}
                        onChange={(e) => setEditingAdjustment({...editingAdjustment, product_name: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Product ID</label>
                      <input
                        type="text"
                        value={editingAdjustment.product_id}
                        onChange={(e) => setEditingAdjustment({...editingAdjustment, product_id: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Adjustment Type</label>
                      <select
                        value={editingAdjustment.adjustment_type}
                        onChange={(e) => setEditingAdjustment({...editingAdjustment, adjustment_type: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      >
                        <option value="Addition">Addition</option>
                        <option value="Subtraction">Subtraction</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quantity</label>
                      <input
                        type="number"
                        value={editingAdjustment.quantity}
                        onChange={(e) => setEditingAdjustment({...editingAdjustment, quantity: parseInt(e.target.value)})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Reason</label>
                    <input
                      type="text"
                      value={editingAdjustment.reason}
                      onChange={(e) => setEditingAdjustment({...editingAdjustment, reason: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Adjusted By</label>
                      <input
                        type="text"
                        value={editingAdjustment.adjusted_by}
                        onChange={(e) => setEditingAdjustment({...editingAdjustment, adjusted_by: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                      <select
                        value={editingAdjustment.status}
                        onChange={(e) => setEditingAdjustment({...editingAdjustment, status: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      >
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                    <textarea
                      value={editingAdjustment.notes}
                      onChange={(e) => setEditingAdjustment({...editingAdjustment, notes: e.target.value})}
                      placeholder="Additional notes..."
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button 
                onClick={() => setShowModal(false)}
                className={`px-4 py-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default StockAdjustment; 