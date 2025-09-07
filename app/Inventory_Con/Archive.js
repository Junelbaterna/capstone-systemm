"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { 
  FaSearch, 
  FaEye, 
  FaFilter, 
  FaDownload, 
  FaCalendar, 
  FaArchive, 
  FaTrash, 
  FaUndo, 
  FaHistory, 
  FaBox 
} from "react-icons/fa";
import { Archive as ArchiveIcon, Trash2, RotateCcw, FileText, Clock, AlertCircle } from "lucide-react";
import { useTheme } from './ThemeContext';

const Archive = () => {
  const { isDarkMode } = useTheme();
  const [archivedItems, setArchivedItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // API call function (copied from Warehouse.js for consistency)
  async function handleApiCall(action, data = {}) {
    const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";
    const payload = { action, ...data };
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await response.json();
      return resData;
    } catch (error) {
      console.error("❌ API Call Error:", error);
      return { success: false, message: error.message, error: "REQUEST_ERROR" };
    }
  }

  // Fetch archived items from backend on mount
  useEffect(() => {
    async function fetchArchivedItems() {
      setIsLoading(true);
      try {
        const response = await handleApiCall("get_archived_items");
        if (response.success && Array.isArray(response.data)) {
          setArchivedItems(response.data);
          setFilteredItems(response.data);
        } else {
          setArchivedItems([]);
          setFilteredItems([]);
        }
      } catch (error) {
        setArchivedItems([]);
        setFilteredItems([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchArchivedItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchTerm, selectedType, selectedDateRange, archivedItems]);

  const filterItems = () => {
    let filtered = archivedItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.archivedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    if (selectedDateRange !== "all") {
      const today = new Date();
      const filteredDate = new Date();
      
      switch (selectedDateRange) {
        case "today":
          filtered = filtered.filter(item => item.archivedDate === today.toISOString().split('T')[0]);
          break;
        case "week":
          filteredDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(item => new Date(item.archivedDate) >= filteredDate);
          break;
        case "month":
          filteredDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(item => new Date(item.archivedDate) >= filteredDate);
          break;
        default:
          break;
      }
    }

    setFilteredItems(filtered);
  };

  const getStatusColor = (status) => {
    if (isDarkMode) {
      switch (status) {
        case "Archived":
          return "bg-gray-800 text-gray-200 border border-gray-700";
        case "Deleted":
          return "bg-red-900 text-red-200 border border-red-700";
        case "Restored":
          return "bg-green-900 text-green-200 border border-green-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (status) {
        case "Archived":
          return "bg-gray-100 text-gray-800 border border-gray-300";
        case "Deleted":
          return "bg-red-100 text-red-800 border border-red-300";
        case "Restored":
          return "bg-green-100 text-green-800 border border-green-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const getTypeColor = (type) => {
    if (isDarkMode) {
      switch (type) {
        case "Product":
          return "bg-blue-900 text-blue-200 border border-blue-700";
        case "Category":
          return "bg-purple-900 text-purple-200 border border-purple-700";
        case "Supplier":
          return "bg-orange-900 text-orange-200 border border-orange-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (type) {
        case "Product":
          return "bg-blue-100 text-blue-800 border border-blue-300";
        case "Category":
          return "bg-purple-100 text-purple-800 border border-purple-300";
        case "Supplier":
          return "bg-orange-100 text-orange-800 border border-orange-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleRestore = async (id) => {
    try {
      const response = await handleApiCall("restore_archived_item", { id });
      if (response.success) {
        setArchivedItems(prev => prev.filter(item => item.id !== id));
        toast.success('Item restored successfully');
      } else {
        toast.error(response.message || 'Failed to restore item');
      }
    } catch (error) {
      toast.error('Error restoring item');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      try {
        const response = await handleApiCall("delete_archived_item", { id });
        if (response.success) {
          setArchivedItems(prev => prev.filter(item => item.id !== id));
          toast.success('Item permanently deleted');
        } else {
          toast.error(response.message || 'Failed to delete item');
        }
      } catch (error) {
        toast.error('Error deleting item');
      }
    }
  };

  const itemTypes = ["all", "Product", "Category", "Supplier"];
  const dateRanges = ["all", "today", "week", "month"];

  const pages = Math.ceil(filteredItems.length / rowsPerPage);
  const items = filteredItems.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Calculate statistics
  const totalArchived = filteredItems.length;
  const archivedProducts = filteredItems.filter(item => item.type === 'Product').length;
  const archivedCategories = filteredItems.filter(item => item.type === 'Category').length;
  const archivedSuppliers = filteredItems.filter(item => item.type === 'Supplier').length;

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
          <h1 className="text-3xl font-bold" style={{ color: themeStyles.text.primary }}>Archive</h1>
          <p style={{ color: themeStyles.text.secondary }}>Manage archived items and restoration</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-900 transition-colors"
          >
            <FaDownload className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <ArchiveIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Total Archived</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{totalArchived}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Products</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{archivedProducts}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Categories</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{archivedCategories}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Suppliers</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{archivedSuppliers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: themeStyles.text.muted }} />
              <input
                type="text"
                placeholder="Search archived items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                style={themeStyles.input}
              />
            </div>
          </div>
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              style={themeStyles.input}
            >
              {itemTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Types" : type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              style={themeStyles.input}
            >
              {dateRanges.map((range) => (
                <option key={range} value={range}>
                  {range === "all" ? "All Time" : 
                   range === "today" ? "Today" :
                   range === "week" ? "Last 7 Days" :
                   range === "month" ? "Last 30 Days" : range}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Archived Items Table */}
      <div className="rounded-3xl shadow-xl border" style={themeStyles.card}>
        <div className="px-6 py-4 border-b" style={{ borderColor: themeStyles.border.color }}>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Archived Items</h3>
            <div className="text-sm" style={{ color: themeStyles.text.muted }}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  Loading...
                </div>
              ) : (
                `${filteredItems.length} items found`
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full min-w-max" style={{ color: themeStyles.text.primary }}>
            <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: isDarkMode ? '#374151' : '#f8fafc', borderColor: themeStyles.border.color }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  ITEM NAME
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  TYPE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  CATEGORY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  ARCHIVED BY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  DATE ARCHIVED
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  STATUS
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: themeStyles.card.backgroundColor, borderColor: themeStyles.border.color }}>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center" style={{ color: themeStyles.text.muted }}>
                    Loading archived items...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:opacity-80 transition-colors" style={{ backgroundColor: themeStyles.card.backgroundColor }}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{item.name}</div>
                        <div className="text-sm" style={{ color: themeStyles.text.muted }}>{item.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: themeStyles.text.primary }}>{item.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: themeStyles.text.primary }}>{item.archivedBy}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{item.archivedDate}</div>
                        <div className="text-sm" style={{ color: themeStyles.text.muted }}>{item.archivedTime}</div>
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
                          onClick={() => handleViewDetails(item)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors"
                        >
                          <FaEye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleRestore(item.id)}
                          className="text-green-600 hover:text-green-900 p-1 transition-colors"
                        >
                          <FaUndo className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <FaBox className="h-12 w-12" style={{ color: themeStyles.text.muted }} />
                      <div style={{ color: themeStyles.text.muted }}>
                        <p className="text-lg font-medium">No archived items found</p>
                        <p className="text-sm">Archived items will appear here</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center mt-4 pb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded disabled:opacity-50 transition-colors"
                style={{
                  backgroundColor: themeStyles.card.backgroundColor,
                  color: themeStyles.text.primary,
                  border: `1px solid ${themeStyles.border.color}`
                }}
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm" style={{ color: themeStyles.text.primary }}>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="px-3 py-1 rounded disabled:opacity-50 transition-colors"
                style={{
                  backgroundColor: themeStyles.card.backgroundColor,
                  color: themeStyles.text.primary,
                  border: `1px solid ${themeStyles.border.color}`
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Item Details Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border" style={themeStyles.card}>
            <div className="px-6 py-4 border-b" style={{ borderColor: themeStyles.border.color }}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Item Details</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {selectedItem && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Item Information</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Name:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedItem.name}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Type:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedItem.type}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Category:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedItem.category}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Status:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedItem.status}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Archive Details</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Archived By:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedItem.archivedBy}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Date Archived:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedItem.archivedDate}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Time Archived:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedItem.archivedTime}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedItem.description && (
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Description</h4>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }}>
                        <p style={{ color: themeStyles.text.secondary }}>{selectedItem.description}</p>
                      </div>
                    </div>
                  )}

                  {selectedItem.reason && (
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Reason for Archiving</h4>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }}>
                        <p style={{ color: themeStyles.text.secondary }}>{selectedItem.reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: themeStyles.border.color }}>
              <button 
                onClick={() => handleRestore(selectedItem?.id)}
                className="flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-900 transition-colors"
              >
                <FaUndo className="h-4 w-4" />
                Restore
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Archive; 