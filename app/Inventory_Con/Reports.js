"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { 
  FaDownload, 
  FaPrint, 
  FaChartBar, 
  FaChartLine, 
  FaChartPie, 
  FaCalendar, 
  FaFilter, 
  FaEye, 
  FaFileAlt 
} from "react-icons/fa";
import { BarChart3, TrendingUp, PieChart, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useTheme } from './ThemeContext';
import { useSettings } from './SettingsContext';

const Reports = () => {
  const { isDarkMode } = useTheme();
  const { settings } = useSettings();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0
  });
  const [topCategories, setTopCategories] = useState([]);

  // Fetch data from database
  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";
      
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_reports_data' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports || []);
        setFilteredReports(data.reports || []);
        setAnalyticsData(data.analytics || {
          totalProducts: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          totalValue: 0
        });
        setTopCategories(data.topCategories || []);
      } else {
        toast.error('Failed to fetch reports data: ' + data.message);
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast.error('Error connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filterReports();
  }, [searchTerm, selectedType, selectedDateRange, reports]);

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.generatedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
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
          filtered = filtered.filter(item => item.date === today.toISOString().split('T')[0]);
          break;
        case "week":
          filteredDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(item => new Date(item.date) >= filteredDate);
          break;
        case "month":
          filteredDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(item => new Date(item.date) >= filteredDate);
          break;
        default:
          break;
      }
    }

    setFilteredReports(filtered);
  };

  const getStatusColor = (status) => {
    if (isDarkMode) {
      switch (status) {
        case "Completed":
          return "bg-green-900 text-green-200 border border-green-700";
        case "In Progress":
          return "bg-yellow-900 text-yellow-200 border border-yellow-700";
        case "Failed":
          return "bg-red-900 text-red-200 border border-red-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (status) {
        case "Completed":
          return "bg-green-100 text-green-800 border border-green-300";
        case "In Progress":
          return "bg-yellow-100 text-yellow-800 border border-yellow-300";
        case "Failed":
          return "bg-red-100 text-red-800 border border-red-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const getTypeColor = (type) => {
    if (isDarkMode) {
      switch (type) {
        case "Stock In Report":
          return "bg-blue-900 text-blue-200 border border-blue-700";
        case "Stock Out Report":
          return "bg-red-900 text-red-200 border border-red-700";
        case "Stock Adjustment Report":
          return "bg-yellow-900 text-yellow-200 border border-yellow-700";
        case "Transfer Report":
          return "bg-purple-900 text-purple-200 border border-purple-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (type) {
        case "Stock In Report":
          return "bg-blue-100 text-blue-800 border border-blue-300";
        case "Stock Out Report":
          return "bg-red-100 text-red-800 border border-red-300";
        case "Stock Adjustment Report":
          return "bg-yellow-100 text-yellow-800 border border-yellow-300";
        case "Transfer Report":
          return "bg-purple-100 text-purple-800 border border-purple-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const handleGenerateReport = async (reportType) => {
    setIsLoading(true);
    try {
      const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";
      let action = '';
      let requestData = {};
      
      switch (reportType) {
        case 'inventory_summary':
          action = 'get_inventory_summary_report';
          break;
        case 'low_stock':
          action = 'get_low_stock_report';
          requestData = { threshold: settings.lowStockThreshold };
          break;
        case 'expiry':
          action = 'get_expiry_report';
          requestData = { days_threshold: settings.expiryWarningDays };
          break;
        case 'movement_history':
          action = 'get_movement_history_report';
          requestData = { 
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
          };
          break;
        default:
          toast.info('Report generation feature coming soon');
          setIsLoading(false);
          return;
      }

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...requestData })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`${reportType.replace('_', ' ')} report generated successfully`);
        // Here you could trigger download or show the report data
        console.log('Report data:', data.data);
      } else {
        toast.error('Failed to generate report: ' + data.message);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error generating report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (report) => {
    toast.success(`Downloading ${report.title}`);
  };

  const handlePrint = (report) => {
    toast.info(`Printing ${report.title}`);
  };

  const reportTypes = ["all", "Stock In Report", "Stock Out Report", "Stock Adjustment Report", "Transfer Report"];
  const dateRanges = ["all", "today", "week", "month"];

  const pages = Math.ceil(filteredReports.length / rowsPerPage);
  const items = filteredReports.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Calculate statistics
  const totalReports = filteredReports.length;
  const completedReports = filteredReports.filter(r => r.status === 'Completed').length;
  const inProgressReports = filteredReports.filter(r => r.status === 'In Progress').length;
  const totalFileSize = filteredReports.reduce((sum, r) => {
    const size = parseFloat(r.fileSize.replace(' MB', ''));
    return sum + size;
  }, 0);

  // Generate colors for categories
  const categoryColors = [
    "bg-green-500", "bg-blue-500", "bg-yellow-500", 
    "bg-purple-500", "bg-red-500", "bg-indigo-500"
  ];

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
          <h1 className="text-3xl font-bold" style={{ color: themeStyles.text.primary }}>Reports</h1>
          <p style={{ color: themeStyles.text.secondary }}>Generate and manage inventory reports and analytics</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleGenerateReport('inventory_summary')}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FaChartBar className="h-4 w-4" />
            {isLoading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-blue-400" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Total Products</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{analyticsData.totalProducts?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-400" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Low Stock Items</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{analyticsData.lowStockItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <PieChart className="h-8 w-8 text-red-400" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Out of Stock</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{analyticsData.outOfStockItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-400" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Total Value</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>₱{((analyticsData.totalValue || 0) / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-400" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Total Reports</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{totalReports}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Completed</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{completedReports}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-400" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>In Progress</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{inProgressReports}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-400" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Total Size</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{totalFileSize.toFixed(1)} MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      {topCategories.length > 0 && (
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="h-6 w-6 text-blue-400" />
            <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Top Categories Distribution</h3>
          </div>
          <div className="space-y-4">
            {topCategories.map((category, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-32">
                  <span className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{category.category_name}</span>
                </div>
                <div className="flex-1">
                  <div className="w-full rounded-full h-2" style={{ backgroundColor: isDarkMode ? '#475569' : '#e2e8f0' }}>
                    <div 
                      className={`h-2 rounded-full ${categoryColors[index % categoryColors.length]}`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{category.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: themeStyles.text.muted }} />
              <input
                type="text"
                placeholder="Search reports..."
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
              {reportTypes.map((type) => (
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

      {/* Reports Table */}
      <div className="rounded-3xl shadow-xl border" style={themeStyles.card}>
        <div className="px-6 py-4 border-b" style={{ borderColor: themeStyles.border.color }}>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Generated Reports</h3>
            <div className="text-sm" style={{ color: themeStyles.text.muted }}>
              {filteredReports.length} reports found
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full min-w-max" style={{ color: themeStyles.text.primary }}>
            <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: isDarkMode ? '#374151' : '#f8fafc', borderColor: themeStyles.border.color }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  REPORT TITLE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  TYPE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  GENERATED BY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  DATE & TIME
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  STATUS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  FILE INFO
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: themeStyles.card.backgroundColor, borderColor: themeStyles.border.color }}>
              {items.map((item) => (
                <tr key={item.movement_id} className="hover:opacity-80 transition-colors" style={{ backgroundColor: themeStyles.card.backgroundColor }}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{item.title}</div>
                      <div className="text-sm max-w-xs truncate" style={{ color: themeStyles.text.muted }}>{item.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                      <FaFileAlt className="h-3 w-3" />
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm" style={{ color: themeStyles.text.primary }}>{item.generatedBy}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{item.date}</div>
                      <div className="text-sm" style={{ color: themeStyles.text.muted }}>{item.time}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{item.format}</div>
                      <div className="text-sm" style={{ color: themeStyles.text.muted }}>{item.fileSize}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleViewDetails(item)}
                        className="text-blue-400 hover:text-blue-300 p-1 transition-colors"
                      >
                        <FaEye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDownload(item)}
                        className="text-green-400 hover:text-green-300 p-1 transition-colors"
                      >
                        <FaDownload className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handlePrint(item)}
                        className="text-purple-400 hover:text-purple-300 p-1 transition-colors"
                      >
                        <FaPrint className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Report Details Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border" style={themeStyles.card}>
            <div className="px-6 py-4 border-b" style={{ borderColor: themeStyles.border.color }}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Report Details</h3>
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
              {selectedReport && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Report Information</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Title:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedReport.title}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Type:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedReport.type}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Status:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedReport.status}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>File Details</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Format:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedReport.format}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>File Size:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedReport.fileSize}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Generated By:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedReport.generatedBy}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Description</h4>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }}>
                      <p style={{ color: themeStyles.text.secondary }}>{selectedReport.description}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Generated On</h4>
                    <div className="flex items-center gap-2">
                      <FaCalendar className="text-gray-400" />
                      <span className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedReport.date} at {selectedReport.time}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: themeStyles.border.color }}>
              <button 
                onClick={() => handleDownload(selectedReport)}
                className="flex items-center gap-2 px-4 py-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <FaDownload className="h-4 w-4" />
                Download
              </button>
              <button 
                onClick={() => handlePrint(selectedReport)}
                className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <FaPrint className="h-4 w-4" />
                Print
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

export default Reports; 