"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { 
  FaSearch, 
  FaEye, 
  FaFilter, 
  FaDownload, 
  FaCalendar, 
  FaMapMarkerAlt, 
  FaTruck, 
  FaBox, 
  FaUser, 
  FaRedo 
} from "react-icons/fa";
import { Package, Truck, CheckCircle, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { useTheme } from './ThemeContext';

const MovementHistory = () => {
  const { isDarkMode } = useTheme();
  const [movements, setMovements] = useState([]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [adminReports, setAdminReports] = useState([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);

  // API call function
  const handleApiCall = async (action, data = {}) => {
    try {
              const response = await fetch('http://localhost/Enguio_Project/Api/backend.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          ...data
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const responseText = await response.text();
      
      // Check if response is valid JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Invalid JSON response:', responseText);
        throw new Error('Server returned invalid JSON. Please check the server logs.');
      }
      
      if (!result.success) {
        throw new Error(result.message || 'API call failed');
      }
      
      return result;
    } catch (error) {
      console.error('API Error:', error);
      toast.error(error.message || 'Failed to fetch data');
      throw error;
    }
  };

  // Fetch movement history data
  const fetchMovementHistory = async () => {
    setIsLoading(true);
    try {
      const filters = {
        search: searchTerm,
        movement_type: selectedType,
        location: selectedLocation,
        date_range: selectedDateRange
      };
      
      const result = await handleApiCall('get_movement_history', filters);
      setMovements(result.data || []);
      setFilteredMovements(result.data || []);
    } catch (error) {
      console.error('Failed to fetch movement history:', error);
      setMovements([]);
      setFilteredMovements([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Admin Reports data (reuses backend reports used by Admin Logs)
  const fetchAdminReports = async () => {
    try {
      setIsReportsLoading(true);
      const result = await handleApiCall('get_reports_data');
      setAdminReports(Array.isArray(result.reports) ? result.reports : []);
      setReportsPage(1);
    } catch (error) {
      console.error('Failed to fetch admin reports:', error);
      setAdminReports([]);
    } finally {
      setIsReportsLoading(false);
    }
  };

  // Fetch locations for filter
  const fetchLocations = async () => {
    try {
      const result = await handleApiCall('get_locations_for_filter');
      setLocations(result.data || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMovementHistory();
    fetchLocations();
  }, []);

  // Refetch data when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMovementHistory();
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedType, selectedLocation, selectedDateRange]);

  const getStatusColor = (status) => {
    if (isDarkMode) {
      switch (status) {
        case "Completed":
          return "bg-green-900 text-green-200 border border-green-700";
        case "In Progress":
        case "Pending":
          return "bg-yellow-900 text-yellow-200 border border-yellow-700";
        case "Cancelled":
          return "bg-red-900 text-red-200 border border-red-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (status) {
        case "Completed":
          return "bg-green-100 text-green-800 border border-green-300";
        case "In Progress":
        case "Pending":
          return "bg-yellow-100 text-yellow-800 border border-yellow-300";
        case "Cancelled":
          return "bg-red-100 text-red-800 border border-red-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const getTypeColor = (type) => {
    if (isDarkMode) {
      switch (type) {
        case "Transfer":
          return "bg-blue-900 text-blue-200 border border-blue-700";
        case "Receipt":
          return "bg-green-900 text-green-200 border border-green-700";
        case "Return":
          return "bg-yellow-900 text-yellow-200 border border-yellow-700";
        case "Adjustment":
          return "bg-purple-900 text-purple-200 border border-purple-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (type) {
        case "Transfer":
          return "bg-blue-100 text-blue-800 border border-blue-300";
        case "Receipt":
          return "bg-green-100 text-green-800 border border-green-300";
        case "Return":
          return "bg-yellow-100 text-yellow-800 border border-yellow-300";
        case "Adjustment":
          return "bg-purple-100 text-purple-800 border border-purple-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const handleViewDetails = (movement) => {
    setSelectedMovement(movement);
    setShowModal(true);
  };


  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info('Export functionality coming soon');
  };

  const movementTypes = ["all", "Transfer"]; // Only Transfer for now since that's what we have
  const dateRanges = ["all", "today", "week", "month"];

  const pages = Math.ceil(filteredMovements.length / rowsPerPage);
  const items = filteredMovements.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const reportsPages = Math.ceil(adminReports.length / rowsPerPage);
  const reportItems = adminReports.slice((reportsPage - 1) * rowsPerPage, reportsPage * rowsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString;
  };

  // Calculate statistics
  const totalMovements = filteredMovements.length;
  const completedMovements = filteredMovements.filter(m => m.status === 'Completed').length;
  const pendingMovements = filteredMovements.filter(m => m.status === 'Pending' || m.status === 'In Progress').length;
  const totalQuantity = filteredMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity) || 0), 0);

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
          <h1 className="text-3xl font-bold" style={{ color: themeStyles.text.primary }}>Movement History</h1>
          <p style={{ color: themeStyles.text.secondary }}>Track all inventory movements and transfers</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <FaDownload className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Total Movements</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{totalMovements}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Completed</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{completedMovements}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Pending</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{pendingMovements}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <Package className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Total Quantity</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{totalQuantity}</p>
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
                placeholder="Search movements..."
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
              {movementTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Types" : type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              style={themeStyles.input}
            >
              <option value="all">All Locations</option>
              {locations.map((location) => (
                <option key={location.location_name} value={location.location_name}>
                  {location.location_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="w-full md:w-48 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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

      {/* Movement History Table */}
      <div className="rounded-3xl shadow-xl border" style={themeStyles.card}>
        <div className="px-6 py-4 border-b" style={{ borderColor: themeStyles.border.color }}>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Movement Records</h3>
            <div className="text-sm" style={{ color: themeStyles.text.muted }}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  Loading...
                </div>
              ) : (
                `${filteredMovements.length} movements found`
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full min-w-max" style={{ color: themeStyles.text.primary }}>
            <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: isDarkMode ? '#374151' : '#f8fafc', borderColor: themeStyles.border.color }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  PRODUCT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  TYPE
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  QUANTITY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  FROM
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  TO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  MOVED BY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  DATE & TIME
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
                  <td colSpan={9} className="px-6 py-4 text-center" style={{ color: themeStyles.text.muted }}>
                    Loading movements...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr key={`${item.id}-${item.productId}`} className="hover:opacity-80 transition-colors" style={{ backgroundColor: themeStyles.card.backgroundColor }}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{item.product_name}</div>
                        <div className="text-sm" style={{ color: themeStyles.text.muted }}>ID: {item.productId}</div>
                        <div className="text-xs" style={{ color: themeStyles.text.muted }}>{item.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.movementType)}`}>
                        <FaTruck className="h-3 w-3" />
                        {item.movementType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`font-semibold ${item.quantity < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {item.quantity > 0 ? '+' : ''}{item.quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-gray-400 h-3 w-3" />
                        <span className="text-sm" style={{ color: themeStyles.text.primary }}>{item.fromLocation}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <FaMapMarkerAlt className="text-gray-400 h-3 w-3" />
                        <span className="text-sm" style={{ color: themeStyles.text.primary }}>{item.toLocation}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaUser className="text-gray-400 h-3 w-3" />
                        <span className="text-sm" style={{ color: themeStyles.text.primary }}>{item.movedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{formatDate(item.date)}</div>
                        <div className="text-sm" style={{ color: themeStyles.text.muted }}>{formatTime(item.time)}</div>
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
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <FaBox className="h-12 w-12" style={{ color: themeStyles.text.muted }} />
                      <div style={{ color: themeStyles.text.muted }}>
                        <p className="text-lg font-medium">No movement records found</p>
                        <p className="text-sm">Try adjusting your filters or refresh the data</p>
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

      {/* Admin Reports (from Admin -> Logs -> Reports) */}
      <div className="rounded-3xl shadow-xl border" style={themeStyles.card}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: themeStyles.border.color }}>
          <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Admin Reports</h3>
          <button
            onClick={() => fetchAdminReports()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md"
            style={{ backgroundColor: '#2563eb', color: '#fff' }}
          >
            <FaRedo className="h-4 w-4" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full min-w-max" style={{ color: themeStyles.text.primary }}>
            <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: isDarkMode ? '#374151' : '#f8fafc', borderColor: themeStyles.border.color }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>TITLE</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>TYPE</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>GENERATED BY</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>DATE</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: themeStyles.card.backgroundColor, borderColor: themeStyles.border.color }}>
              {isReportsLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center" style={{ color: themeStyles.text.muted }}>Loading reports...</td>
                </tr>
              ) : reportItems.length > 0 ? (
                reportItems.map((r, idx) => (
                  <tr key={`${r.type}-${r.movement_id || idx}`} className="hover:opacity-80 transition-colors" style={{ backgroundColor: themeStyles.card.backgroundColor }}>
                    <td className="px-6 py-3">{r.title}</td>
                    <td className="px-6 py-3">{r.type}</td>
                    <td className="px-6 py-3">{r.generatedBy || '-'}</td>
                    <td className="px-6 py-3">{r.date || '-'}</td>
                    <td className="px-6 py-3">{r.time || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <FaBox className="h-12 w-12" style={{ color: themeStyles.text.muted }} />
                      <div style={{ color: themeStyles.text.muted }}>
                        <p className="text-lg font-medium">No reports found</p>
                        <p className="text-sm">Try refreshing the reports</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {reportsPages > 1 && (
          <div className="flex justify-center mt-4 pb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setReportsPage(Math.max(1, reportsPage - 1))}
                disabled={reportsPage === 1}
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
                Page {reportsPage} of {reportsPages}
              </span>
              <button
                onClick={() => setReportsPage(Math.min(reportsPages, reportsPage + 1))}
                disabled={reportsPage === reportsPages}
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

      {/* Details Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border" style={themeStyles.card}>
            <div className="px-6 py-4 border-b" style={{ borderColor: themeStyles.border.color }}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Movement Details</h3>
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
              {selectedMovement && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Product Information</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Product Name:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.product_name}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Product ID:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.productId}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Category:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.category}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Brand:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.brand || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Reference:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.reference}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Movement Details</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Type:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.movementType}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Quantity:</span>
                          <div className={`font-medium ${selectedMovement.quantity < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {selectedMovement.quantity > 0 ? '+' : ''}{selectedMovement.quantity}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Status:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.status}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Unit Price:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>₱{selectedMovement.unit_price?.toFixed(2) || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>From Location</h4>
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-gray-400" />
                        <span className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.fromLocation}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>To Location</h4>
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-gray-400" />
                        <span className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.toLocation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Moved By</h4>
                      <div className="flex items-center gap-2">
                        <FaUser className="text-gray-400" />
                        <span className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedMovement.movedBy}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Date & Time</h4>
                      <div className="flex items-center gap-2">
                        <FaCalendar className="text-gray-400" />
                        <span className="font-medium" style={{ color: themeStyles.text.primary }}>{formatDate(selectedMovement.date)} at {formatTime(selectedMovement.time)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedMovement.description && (
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Description</h4>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }}>
                        <p style={{ color: themeStyles.text.secondary }}>{selectedMovement.description}</p>
                      </div>
                    </div>
                  )}

                  {selectedMovement.notes && selectedMovement.notes !== null && (
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Notes</h4>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }}>
                        <p style={{ color: themeStyles.text.secondary }}>{selectedMovement.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: themeStyles.border.color }}>
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

export default MovementHistory; 