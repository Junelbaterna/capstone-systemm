"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from '../components/sidebars';
import { toast } from "react-toastify";


const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";

// Helper: get current session user (for logging)
function getCurrentSessionUser() {
  try {
    const raw = sessionStorage.getItem('user_data');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      user_id: parsed?.user_id || parsed?.emp_id,
      username: parsed?.username,
    };
  } catch (_) {
    return {};
  }
}

// Helper: record general activity to tbl_activity_log (tries backend, then logs API)
async function recordActivity({ activityType, description, tableName = null, recordId = null }) {
  const { user_id, username } = getCurrentSessionUser();
  const payload = {
    action: 'log_activity',
    user_id: user_id || null,
    username: username || null,
    activity_type: activityType,
    description,
    table_name: tableName,
    record_id: recordId,
  };
  try {
    // Use backend.php as authoritative writer
    const res = await axios.post(API_BASE_URL, payload);
    if (res?.data?.success) {
      // Refresh unread count after successful logging
      if (window.refreshUnreadCount) {
        window.refreshUnreadCount();
      }
      if (window.bumpLogsBadge) {
        window.bumpLogsBadge();
      }
      return;
    }
  } catch (_) {}
}

// Helper: record login/logout as generic activity (more portable)
async function recordLogin({ loginType = 'LOGIN', status = 'SUCCESS' }) {
  const desc = loginType === 'LOGOUT' ? `User logged out (${status})` : `User logged in (${status})`;
  await recordActivity({ activityType: loginType, description: desc, tableName: 'tbl_login', recordId: null });
}
//dashboard
function Dashboard() {
  const metrics = [
    {
      title: "TOTAL SALES",
      value: "₱24,780",
      subtitle: "+8% from last month",
      icon: "💰", // Using emoji instead of lucide icon
      trend: "up",
    },
    {
      title: "ACTIVE SUPPLIERS",
      value: "10",
      subtitle: "+20% from last month",
      icon: "👥", // Using emoji instead of lucide icon
      trend: "up",
    },
    {
      title: "TOTAL PRODUCTS",
      value: "1,284",
      subtitle: "+4% from last month",
      icon: "📦", // Using emoji instead of lucide icon
      trend: "up",
    },
    {
      title: "AVERAGE TIME",
      value: "3.2h",
      subtitle: "-5% from last month",
      icon: "⏰", // Using emoji instead of lucide icon
      trend: "down",
    },
  ];

  const recentActivities = [
    {
      title: "New shipment received - 8:00 AM",
      color: "bg-green-500",
    },
    {
      title: "Inventory count updated - 3:30 AM",
      color: "bg-blue-500",
    },
    {
      title: "Low stock alert: Paracetamol 500mg - 8:15 AM",
      color: "bg-yellow-500",
    },
    {
      title: "Stock transfer completed - Yesterday",
      color: "bg-purple-500",
    },
    {
      title: "Inventory adjustment approved - Yesterday",
      color: "bg-red-500",
    },
  ];

  const quickActions = [
    {
      title: "ADD PRODUCTS",
      icon: "➕", // Using emoji instead of lucide icon
      color: "bg-gray-100 hover:bg-gray-200",
    },
    {
      title: "STOCKS RECEIVING",
      icon: "📈", // Using emoji instead of lucide icon
      color: "bg-blue-100 hover:bg-blue-200",
    },
    {
      title: "REPORTS",
      icon: "📊", // Using emoji instead of lucide icon
      color: "bg-gray-100 hover:bg-gray-200",
    },
    {
      title: "STOCK COUNT",
      icon: "📋", // Using emoji instead of lucide icon
      color: "bg-orange-100 hover:bg-orange-200",
    },
  ];

  useEffect(() => {
    // Removed navigation/viewing logging
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">DASHBOARD</h1>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white shadow-sm p-6 rounded-lg">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
              <span className="text-lg">{metric.icon}</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <p className="text-xs text-gray-600 mt-1">{metric.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white shadow-sm p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">RECENT ACTIVITY</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${activity.color}`} />
                <span className="text-sm text-gray-700">{activity.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow-sm p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">QUICK ACTIONS</h3>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={`h-20 flex flex-col items-center justify-center space-y-2 ${action.color} border border-gray-200 rounded-lg`}
                onClick={() => {
                  recordActivity({ activityType: 'DASHBOARD_QUICK_ACTION', description: `Clicked ${action.title}` });
                }}
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-xs font-medium">{action.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
//product
function Products(){
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showExpiryDropdown, setShowExpiryDropdown] = useState(false);
  const [expiryBadgeHidden, setExpiryBadgeHidden] = useState(false);
  const [lastSeenExpiryCount, setLastSeenExpiryCount] = useState(null);
  const EXPIRY_BADGE_HIDDEN_KEY = 'products_expiry_badge_hidden';
  const EXPIRY_LAST_SEEN_COUNT_KEY = 'products_expiry_last_seen_count';
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  // Details modal state
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.post(API_BASE_URL, {
          action: "get_products"
        });
        if (response.data.success) {
          setProducts(response.data.data || []);
        } else {
          setProducts([]);
        }
      } catch (err) {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    // Removed navigation/viewing logging
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Expiration helpers and computed alerts
  const toDateOnly = (value) => {
    if (!value) return null;
    const s = String(value);
    const d = s.includes(' ') ? s.split(' ')[0] : s;
    const parts = d.split('-');
    if (parts.length !== 3) return null;
    const [y, m, day] = parts.map(Number);
    const dt = new Date(y, (m || 1) - 1, day || 1);
    if (isNaN(dt.getTime())) return null;
    dt.setHours(0,0,0,0);
    return dt;
  };
  const today = (() => { const t = new Date(); t.setHours(0,0,0,0); return t; })();
  const tomorrow = (() => { const t = new Date(today); t.setDate(t.getDate() + 1); return t; })();
  const isProductExpired = (p) => {
    const d = toDateOnly(p?.expiration);
    return !!(d && d < today);
  };
  const isProductExpiringTomorrow = (p) => {
    const d = toDateOnly(p?.expiration);
    return !!(d && d.getTime() === tomorrow.getTime());
  };
  const expiredProducts = products.filter(isProductExpired);
  const expiringTomorrowProducts = products.filter(isProductExpiringTomorrow);
  const totalExpiryAlerts = expiredProducts.length + expiringTomorrowProducts.length;
  // Load persisted badge state
  useEffect(() => {
    try {
      const hidden = localStorage.getItem(EXPIRY_BADGE_HIDDEN_KEY);
      if (hidden === '1') setExpiryBadgeHidden(true);
      const seenStr = localStorage.getItem(EXPIRY_LAST_SEEN_COUNT_KEY);
      if (seenStr !== null && seenStr !== undefined) {
        const n = Number(seenStr);
        if (!Number.isNaN(n)) setLastSeenExpiryCount(n);
      }
    } catch (_) {}
  }, []);

  // Re-show badge when new alerts appear after being marked as read
  useEffect(() => {
    if (lastSeenExpiryCount === null) return; // not marked as read yet
    if (totalExpiryAlerts > (lastSeenExpiryCount || 0)) {
      setExpiryBadgeHidden(false);
      try { localStorage.setItem(EXPIRY_BADGE_HIDDEN_KEY, '0'); } catch (_) {}
    }
  }, [totalExpiryAlerts, lastSeenExpiryCount]);
  const formatExpiryDate = (s) => {
    if (!s) return '-';
    const only = String(s).split(' ')[0];
    return only;
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination functions
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Open/close details modal
  const openDetails = (product) => {
    setSelectedProduct(product);
    setShowDetails(true);
  };
  const closeDetails = () => {
    setShowDetails(false);
    setSelectedProduct(null);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Product Management</h1>
      {/* Expiration Notification Bell */}
      <div className="flex justify-end mb-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => { 
              setExpiryBadgeHidden(true); 
              setLastSeenExpiryCount(totalExpiryAlerts); 
              try { 
                localStorage.setItem(EXPIRY_BADGE_HIDDEN_KEY, '1');
                localStorage.setItem(EXPIRY_LAST_SEEN_COUNT_KEY, String(totalExpiryAlerts));
              } catch (_) {}
              setShowExpiryDropdown((v) => !v); 
            }}
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 focus:outline-none border border-gray-200"
            title="Expiration notifications"
          >
            <img src="/assets/notification.png" alt="notifications" className="w-5 h-5" />
            {!expiryBadgeHidden && totalExpiryAlerts > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {totalExpiryAlerts}
              </span>
            )}
          </button>
          {showExpiryDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="px-3 py-2 border-b font-semibold text-gray-800">Expiration Alerts</div>
              <div className="max-h-[200px] overflow-y-auto">
                {totalExpiryAlerts === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No upcoming expirations</div>
                ) : (
                  <>
                    {expiredProducts.length > 0 && (
                      <div>
                        <div className="px-3 pt-3 pb-1 text-xs uppercase text-red-600 font-bold">Expired</div>
                        {expiredProducts.map((p) => (
                          <div key={p.product_id} className="px-3 py-2 text-sm flex items-center justify-between">
                            <span className="text-red-600 font-medium truncate mr-2" title={p.product_name}>{p.product_name}</span>
                            <span className="text-red-600 text-xs ml-2">{formatExpiryDate(p.expiration)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {expiringTomorrowProducts.length > 0 && (
                      <div>
                        <div className="px-3 pt-3 pb-1 text-xs uppercase text-yellow-600 font-bold">Expiring Tomorrow</div>
                        {expiringTomorrowProducts.map((p) => (
                          <div key={p.product_id} className="px-3 py-2 text-sm flex items-center justify-between">
                            <span className="truncate mr-2" title={p.product_name}>{p.product_name}</span>
                            <span className="text-gray-600 text-xs ml-2">{formatExpiryDate(p.expiration)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <img src="/assets/search.png" alt="search" className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search products by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border p-2 pl-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap">#</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap">Barcode</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap">Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">Loading...</td>
                  </tr>
                ) : currentProducts.length > 0 ? (
                  currentProducts.map((product, index) => {
                    const expired = isProductExpired(product);
                    const redText = expired ? 'text-red-600 font-semibold' : '';
                    return (
                      <tr key={product.product_id}>
                        <td className={`px-6 py-4 whitespace-nowrap ${redText}`}>{startIndex + index + 1}</td>
                        <td className={`px-6 py-4 whitespace-nowrap ${redText}`}>{product.product_name}</td>
                        <td className={`px-6 py-4 whitespace-nowrap ${redText}`}>{product.category}</td>
                        <td className={`px-6 py-4 whitespace-nowrap ${redText}`}>{product.barcode}</td>
                        <td className={`px-6 py-4 whitespace-nowrap ${redText}`}>{product.unit_price}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openDetails(product)}
                            className="inline-flex items-center px-2 py-1 text-blue-600 hover:text-blue-800 border border-blue-200 rounded"
                            title="View details"
                          >
                            <img src="/assets/eye.png" alt="view" className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">No products found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Details Modal */}
      {showDetails && selectedProduct && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl mx-auto border border-gray-300 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
              <span>Product Details</span>
              {isProductExpired(selectedProduct) ? (
                <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">Expired</span>
              ) : isProductExpiringTomorrow(selectedProduct) ? (
                <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">Expires Tomorrow</span>
              ) : null}
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Name:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{selectedProduct.product_name || '-'}</span></div>
              <div><strong>Category:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{selectedProduct.category || '-'}</span></div>
              <div><strong>Barcode:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{selectedProduct.barcode || '-'}</span></div>
              <div><strong>Brand:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{selectedProduct.brand || '-'}</span></div>
              <div><strong>Unit Price:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{selectedProduct.unit_price || '-'}</span></div>
              <div><strong>Quantity:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{selectedProduct.quantity || '-'}</span></div>
              <div className="col-span-2"><strong>Description:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{selectedProduct.description || '-'}</span></div>
              <div><strong>Prescription:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{selectedProduct.prescription || '-'}</span></div>
              <div><strong>Bulk:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{selectedProduct.bulk || '-'}</span></div>
              <div><strong>Expiration:</strong> <span className={`${isProductExpired(selectedProduct) ? 'text-red-600 font-semibold' : ''}`}>{formatExpiryDate(selectedProduct.expiration) || '-'}</span></div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={closeDetails} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevious}
              disabled={currentPage === 1}
              className={`px-3 py-2 text-sm border rounded-md ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
              }`}
            >
              ← Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-2 text-sm border rounded-md ${
                    currentPage === page
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={goToNext}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 text-sm border rounded-md ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );

}

// login activity
function LoginActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.post(API_BASE_URL, {
        action: "get_login_activity",
        limit: 300,
        search,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      if (response.data.success) {
        setLogs(response.data.data || []);
        setCurrentPage(1);
      } else {
        setLogs([]);
      }
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // optional: refresh every 30s
    const id = setInterval(fetchLogs, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Removed navigation/viewing logging
  }, []);

  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    // already yyyy-mm-dd in most cases
    const s = String(dateString);
    // if datetime, split
    if (s.includes(' ')) return s.split(' ')[0];
    return s;
  };

  const formatTimeOnly = (timeString) => {
    if (!timeString) return '-';
    const s = String(timeString);
    // extract HH:mm[:ss]
    const timePart = s.includes(' ') ? s.split(' ')[1] : s;
    const match = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return '-';
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const suffix = hour >= 12 ? 'pm' : 'am';
    hour = hour % 12;
    if (hour === 0) hour = 12; // midnight/noon handling
    return `${hour}:${minute} ${suffix}`;
  };

  const roleLabel = (roleId) => {
    switch (Number(roleId)) {
      case 1: return "Admin";
      case 2: return "Pharmacy Cashier";
      case 3: return "Cashier";
      case 4: return "Inventory";
      default: return "Unknown";
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Login Activity</h1>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm text-gray-600 mb-1">Search</label>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by name or username" className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="border p-2 rounded" />
        </div>
        <button onClick={fetchLogs} className="h-10 px-4 bg-blue-500 text-white rounded">Filter</button>
        <button onClick={fetchLogs} className="h-10 px-4 bg-green-500 text-white rounded">Refresh</button>
      </div>

      <div className="w-full rounded-md border">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">#</th>
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Employee</th>
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Username</th>
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Role</th>
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Location</th>
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Login Date</th>
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Login Time</th>
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Logout Date</th>
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Logout Time</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <td colSpan="8" className="p-4 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <td colSpan="8" className="p-4 text-center text-center text-muted-foreground">No logs</td>
                </tr>
              ) : (
                logs
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((row, idx) => (
                  <tr key={row.login_id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{`${row.Fname || ''} ${row.Lname || ''}`.trim() || '-'}</td>
                    <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{row.username}</td>
                    <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{row.role || roleLabel(row.role_id)}</td>
                    <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{row.terminal_name || '-'}</td>
                    <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{formatDateOnly(row.login_date)}</td>
                    <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{formatTimeOnly(row.login_time)}</td>
                    <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{formatDateOnly(row.logout_date)}</td>
                    <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{formatTimeOnly(row.logout_time)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination controls */}
        {logs.length > itemsPerPage && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} – {Math.min(currentPage * itemsPerPage, logs.length)} of {logs.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              {Array.from({ length: Math.ceil(logs.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${currentPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                >
                  {page}
                </button>
              ))}
              <button
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === Math.ceil(logs.length / itemsPerPage) ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={currentPage === Math.ceil(logs.length / itemsPerPage)}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(logs.length / itemsPerPage), p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SalesHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCashierTxns, setSelectedCashierTxns] = useState([]);
  const [txnPage, setTxnPage] = useState(1);
  const txnsPerPage = 10;

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await axios.post(API_BASE_URL, { action: 'get_pos_sales', limit: 500 });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRows(res.data.data);
      } else {
        setRows([]);
      }
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const resp = await axios.post(API_BASE_URL, { action: 'display_employee' });
      if (resp.data?.success) setEmployees(resp.data.employees || []);
    } catch (_) {}
  };

  useEffect(() => { fetchSales(); fetchEmployees(); }, []);
  useEffect(() => { /* Removed navigation/viewing logging */ }, []);

  const getShiftName = (shiftId) => {
    if (shiftId === null || shiftId === undefined) return '-';
    switch (Number(shiftId)) {
      case 1: return 'Shift1';
      case 2: return 'Shift2';
      case 3: return 'Shift3';
      default: return 'Unknown';
    }
  };

  const fmtPeso = (n) => `₱${Number(n||0).toFixed(2)}`;
  const cashierToShift = (() => {
    const map = new Map();
    for (const e of employees) {
      if (e?.username) map.set(String(e.username).toLowerCase(), getShiftName(e.shift_id));
    }
    return map;
  })();

  // Aggregate sales per cashier
  const stats = (() => {
    const m = new Map();

    // Pre-seed all cashiers (role_id 2 or 3) even without sales
    const employeeCashiers = (employees || []).filter(e => {
      const rid = Number(e?.role_id);
      return rid === 2 || rid === 3;
    });
    for (const emp of employeeCashiers) {
      const username = String(emp.username || '').toLowerCase();
      if (!username) continue;
      const displayName = `${emp.Fname || ''} ${emp.Lname || ''}`.trim() || emp.username;
      if (!m.has(username)) {
        m.set(username, {
          cashier: displayName,
          username: emp.username,
          transactions: 0,
          total: 0,
          payments: {},
          terminals: new Set(),
          firstSale: null,
          lastSale: null,
          shift: getShiftName(emp.shift_id),
        });
      }
    }

    // Accumulate POS sales into the map
    for (const r of rows) {
      const cashierRaw = r.cashier || 'Unknown';
      const keyCandidate = String(cashierRaw).toLowerCase();
      const key = m.has(keyCandidate) ? keyCandidate : keyCandidate || 'unknown';
      if (!m.has(key)) {
        m.set(key, {
          cashier: cashierRaw,
          username: cashierRaw,
          transactions: 0,
          total: 0,
          payments: {},
          terminals: new Set(),
          firstSale: null,
          lastSale: null,
          shift: (r.shift_name || cashierToShift.get(key) || '-'),
        });
      }
      const s = m.get(key);
      const payment = String(r.payment_type || '-').trim().toLowerCase();
      const amount = Number(r.total_amount || 0);
      const terminal = (r.terminal_name || r.terminal || 'POS');
      const date = r.txn_date || r.date || '-';
      const time = r.txn_time || r.time || '-';
      s.transactions += 1;
      s.total += amount;
      s.payments[payment] = (s.payments[payment] || 0) + amount;
      s.terminals.add(terminal);
      const dtStr = `${date} ${time}`.trim();
      const dt = new Date(dtStr);
      if (!s.firstSale || (dt instanceof Date && !isNaN(dt) && dt < s.firstSale)) s.firstSale = dt;
      if (!s.lastSale || (dt instanceof Date && !isNaN(dt) && dt > s.lastSale)) s.lastSale = dt;
    }

    return Array.from(m.values()).sort((a,b)=>b.total - a.total);
  })();

  const filtered = stats.filter(s =>
    s.cashier.toLowerCase().includes(search.toLowerCase()) ||
    String(s.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const isRowForCashier = (row, s) => {
    const rc = String(row.cashier || 'unknown').toLowerCase();
    const u = String(s.username || '').toLowerCase();
    const c = String(s.cashier || '').toLowerCase();
    return rc === u || rc === c || (c === 'unknown' && rc === 'unknown');
  };

  const openDetails = (s) => {
    const txns = rows
      .filter(r => isRowForCashier(r, s))
      .sort((a, b) => {
        const da = new Date(`${a.txn_date || ''} ${a.txn_time || ''}`);
        const db = new Date(`${b.txn_date || ''} ${b.txn_time || ''}`);
        return isNaN(db) - isNaN(da) || db - da;
      });
    setSelectedCashier(s);
    setSelectedCashierTxns(txns);
    setTxnPage(1);
    setShowModal(true);
  };
  const closeDetails = () => { setShowModal(false); setSelectedCashier(null); };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sales History</h1>

      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Search</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cashier name" className="border p-2 rounded w-80" />
        </div>
        <button onClick={fetchSales} className="h-10 px-4 bg-blue-500 text-white rounded">Refresh</button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase">Cashier</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase">Shift</th>
                <th className="px-3 py-2 text-right text-xs font-bold uppercase">Transactions</th>
                <th className="px-3 py-2 text-right text-xs font-bold uppercase">Total Sales</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase">Terminals</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase">Last Sale</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-6">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-6">No sales found</td></tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr key={`${s.cashier}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <button onClick={()=>openDetails(s)} className="text-blue-600 hover:underline">{s.cashier}</button>
                    </td>
                    <td className="px-3 py-2">{s.shift}</td>
                    <td className="px-3 py-2 text-right">{s.transactions}</td>
                    <td className="px-3 py-2 text-right">{fmtPeso(s.total)}</td>
                    <td className="px-3 py-2">{Array.from(s.terminals).join(', ')}</td>
                    <td className="px-3 py-2">{s.lastSale && !isNaN(s.lastSale) ? s.lastSale.toLocaleString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedCashier && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 border">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Cashier Details</h2>
              <button onClick={closeDetails} className="text-gray-600 hover:text-gray-800">✕</button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><strong>Cashier:</strong> {selectedCashier.cashier}</div>
                <div><strong>Shift:</strong> {selectedCashier.shift}</div>
                <div><strong>Transactions:</strong> {selectedCashier.transactions}</div>
                <div><strong>Total Sales:</strong> {fmtPeso(selectedCashier.total)}</div>
                <div><strong>Average Sale:</strong> {fmtPeso(selectedCashier.total / Math.max(1, selectedCashier.transactions))}</div>
                <div><strong>Terminals:</strong> {Array.from(selectedCashier.terminals).join(', ') || '-'}</div>
                <div><strong>First Sale:</strong> {selectedCashier.firstSale && !isNaN(selectedCashier.firstSale) ? selectedCashier.firstSale.toLocaleString() : '-'}</div>
                <div><strong>Last Sale:</strong> {selectedCashier.lastSale && !isNaN(selectedCashier.lastSale) ? selectedCashier.lastSale.toLocaleString() : '-'}</div>
              </div>
              <div>
                <div className="font-semibold mb-1">Payments</div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(selectedCashier.payments).length === 0 ? (
                    <span className="text-gray-500">No payment data</span>
                  ) : (
                    Object.entries(selectedCashier.payments).map(([k,v]) => (
                      <span key={k} className="px-2 py-1 rounded border bg-gray-50 text-gray-700">{k.toUpperCase()}: {fmtPeso(v)}</span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1">Transactions ({selectedCashierTxns.length})</div>
                <div className="max-h-64 overflow-y-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left">Txn ID</th>
                        <th className="px-2 py-1 text-left">Date</th>
                        <th className="px-2 py-1 text-left">Time</th>
                        <th className="px-2 py-1 text-left">Payment</th>
                        <th className="px-2 py-1 text-left">Terminal</th>
                        <th className="px-2 py-1 text-left">Shift</th>
                        <th className="px-2 py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCashierTxns
                        .slice((txnPage - 1) * txnsPerPage, txnPage * txnsPerPage)
                        .map((t, i) => (
                          <tr key={`${t.transaction_id || t.sales_header_id || 'txn'}-${i}`} className="border-t">
                            <td className="px-2 py-1">{t.transaction_id || '-'}</td>
                            <td className="px-2 py-1">{t.txn_date || t.date || '-'}</td>
                            <td className="px-2 py-1">{t.txn_time || t.time || '-'}</td>
                            <td className="px-2 py-1">{String(t.payment_type || '-').toUpperCase()}</td>
                            <td className="px-2 py-1">{t.terminal_name || t.terminal || 'POS'}</td>
                            <td className="px-2 py-1">{t.shift_name || getShiftName(t.shift_id) || '-'}</td>
                            <td className="px-2 py-1 text-right">{fmtPeso(t.total_amount)}</td>
                          </tr>
                        ))}
                      {selectedCashierTxns.length === 0 && (
                        <tr><td colSpan={6} className="px-2 py-2 text-center text-gray-500">No transactions</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {selectedCashierTxns.length > txnsPerPage && (
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => setTxnPage(p => Math.max(1, p - 1))}
                      disabled={txnPage === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <div className="text-xs text-gray-600">
                      Page {txnPage} of {Math.ceil(selectedCashierTxns.length / txnsPerPage)}
                    </div>
                    <button
                      onClick={() => setTxnPage(p => Math.min(Math.ceil(selectedCashierTxns.length / txnsPerPage), p + 1))}
                      disabled={txnPage === Math.ceil(selectedCashierTxns.length / txnsPerPage)}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end">
              <button onClick={closeDetails} className="px-4 py-2 bg-blue-600 text-white rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

//user
function UserManagement() { 
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fname: "",
    mname: "",
    lname: "",
    birthdate: "",
    gender: "",
    username: "",
    password: "",
    contact: "",
    email: "",
    role: "",
    shift: "",
    age: "",
    address: "",
    status: "Active",
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [lastCreatedUser, setLastCreatedUser] = useState(null); // Store last created user with plain password
  const [showCredentialPreview, setShowCredentialPreview] = useState(false);
  const [previewUserData, setPreviewUserData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Password reset states
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // State for historical data
  const [prevTotalUsers, setPrevTotalUsers] = useState(0);
  const [prevActiveUsers, setPrevActiveUsers] = useState(0);
  const [prevInactiveUsers, setPrevInactiveUsers] = useState(0);

  // Debugging state
  const [debugInfo, setDebugInfo] = useState("");

  // Function to fetch employees
  const fetchEmployee = async () => {
    try {
      const response = await axios.post(API_BASE_URL, {
        action: "display_employee",
      });
      if (response.data.success) {
        const userData = (response.data.employees || []).map((user) => ({
          ...user,
          status: user.status || "Active",
          role_id: parseInt(user.role_id),
          shift_id: user.shift_id ? parseInt(user.shift_id) : null,
        }));
        setUsers(userData);
        setError(null); // Clear any previous errors
      } else {
        setError(response.data.message || "Failed to fetch employees");
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("An error occurred while fetching employees.");
    } finally {
      setLoading(false);
    }
  };

  // Helpers: Title Case formatters
  // Loose: for input typing — preserves trailing space so users can type a second name
  const toTitleCaseLoose = (input) => {
    if (input === null || input === undefined) return "";
    const raw = String(input);
    const endsWithSpace = /\s$/.test(raw);
    const formatted = raw
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(part => part
        .split('-')
        .map(seg => seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : '')
        .join('-')
      )
      .join(' ')
      .replace(/^\s+/, '');
    return endsWithSpace ? formatted + ' ' : formatted;
  };
  // Strict: for submit — trims edges and collapses spaces
  const toTitleCaseStrict = (input) => {
    if (input === null || input === undefined) return "";
    return String(input)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(part => part
        .split('-')
        .map(seg => seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : '')
        .join('-')
      )
      .join(' ')
      .trim();
  };

  // Fetch employees with status
  useEffect(() => {
    // Initial fetch
    fetchEmployee();

    // Set up polling every 5 seconds
    const intervalId = setInterval(fetchEmployee, 5000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'fname' || name === 'mname' || name === 'lname') {
      setFormData({ ...formData, [name]: toTitleCaseLoose(value) });
      return;
    }
    if (name === 'contact') {
      // Digits only, max 11
      const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
      setFormData({ ...formData, [name]: digitsOnly });
      return;
    }
    if (name === 'age') {
      // Digits only; allow up to 3 chars; do not auto-clamp here (handled on submit)
      const digitsOnly = value.replace(/\D/g, '').slice(0, 3);
      setFormData({ ...formData, [name]: digitsOnly });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Sanitize empty strings to null
    const sanitizedData = {
      ...formData,
      fname: toTitleCaseStrict(formData.fname) || null,
      mname: toTitleCaseStrict(formData.mname) || null,
      lname: toTitleCaseStrict(formData.lname) || null,
    };

    // Password policy: at least one uppercase and one number
    const passwordValue = String(sanitizedData.password || '');
    const hasUppercase = /[A-Z]/.test(passwordValue);
    const hasNumber = /[0-9]/.test(passwordValue);
    if (!(hasUppercase && hasNumber)) {
      toast.error("Password must include at least one uppercase letter and one number.", {
        style: { backgroundColor: "red", color: "white" },
        position: "top-right",
        hideProgressBar: true,
        autoClose: 3000,
      });
      return;
    }

    // Age policy: must be 18 or above
    const ageNum = Number(sanitizedData.age);
    if (!Number.isFinite(ageNum) || ageNum < 18) {
      toast.error("Age must be 18 or above.", {
        style: { backgroundColor: "red", color: "white" },
        position: "top-right",
        hideProgressBar: true,
        autoClose: 3000,
      });
      return;
    }

    // Only require shift for cashier and pharmacy cashier
    const role = sanitizedData.role;
    const needsShift = role === "cashier" || role === "pharmacy cashier";
    if (needsShift && !sanitizedData.shift) {
      toast.error("Shift is required for Cashier and Pharmacy Cashier.", {
        style: { backgroundColor: "red", color: "white" },
        position: "top-right",
        hideProgressBar: true,
        autoClose: 3000,
      });
      return;
    }

    // Show credential preview before creating user
    const previewData = {
      ...sanitizedData,
      role_id: role === "admin" ? 1 : role === "pharmacy cashier" ? 2 : role === "cashier" ? 3 : role === "inventory" ? 4 : 1,
      plainPassword: sanitizedData.password,
      needsShift,
      role
    };
    
    setPreviewUserData(previewData);
    setShowCredentialPreview(true);
  };

  // Function to actually create the user after preview confirmation
  const confirmCreateUser = async () => {
    const sanitizedData = previewUserData;
    const role = sanitizedData.role;
    const needsShift = sanitizedData.needsShift;

    try {
      const payload = {
        action: "add_employee",
        fname: sanitizedData.fname,
        mname: sanitizedData.mname,
        lname: sanitizedData.lname,
        birthdate: sanitizedData.birthdate,
        gender: sanitizedData.gender,
        username: sanitizedData.username,
        password: sanitizedData.password,
        contact_num: sanitizedData.contact,
        email: sanitizedData.email,
        role_id: sanitizedData.role_id,
        age: sanitizedData.age,
        address: sanitizedData.address,
        status: sanitizedData.status,
      };
      
      // Always include shift_id - set to specific value for cashier/pharmacy cashier, null for others
      if (needsShift) {
        payload.shift_id =
          sanitizedData.shift === "Shift1" ? 1 :
          sanitizedData.shift === "Shift2" ? 2 :
          sanitizedData.shift === "Shift3" ? 3 : null;
      } else {
        payload.shift_id = null;
      }

      console.log("Debug - Creating user with payload:", payload);

      const response = await axios.post(API_BASE_URL, payload);

      if (response.data.success) {
        try {
          await recordActivity({
            activityType: 'USER_CREATE',
            description: `Created employee ${sanitizedData.username} (${sanitizedData.fname} ${sanitizedData.lname}) with role ${role}${needsShift && sanitizedData.shift ? `, shift ${sanitizedData.shift}` : ''}`,
            tableName: 'tbl_employee',
            recordId: response.data.emp_id || null,
          });
        } catch (_) {}
        // Store the newly created user with plain password for printing
        setLastCreatedUser({
          ...sanitizedData,
          emp_id: response.data.emp_id || 'New',
          plainPassword: sanitizedData.password
        });

        // Clear form and close modals
        setFormData({
          fname: "", mname: "", lname: "", birthdate: "", gender: "",
          username: "", password: "", contact: "", email: "", role: "",
          shift: "", age: "", address: "", status: "Active",
        });
        setShowModal(false);
        setShowCredentialPreview(false);
        
        // Immediately fetch updated user list from database
        await fetchEmployee();
        
        toast.success("Employee added successfully!", {
          style: { backgroundColor: "green", color: "white" },
          position: "top-right", hideProgressBar: true, autoClose: 3000,
        });
      } else {
        toast.error(response.data.message || "Failed to add employee.", {
          style: { backgroundColor: "red", color: "white" },
          position: "top-right", hideProgressBar: true, autoClose: 3000,
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred.", {
        style: { backgroundColor: "red", color: "white" },
        position: "top-right", hideProgressBar: true, autoClose: 3000,
      });
    }
  };

  const handleStatusChange = async (employeeId, newStatus) => {
    const idToUse = Number(employeeId); // Ensure numeric emp_id
    console.log("Debug: Updating user ID:", idToUse, "to status:", newStatus);
    try {
      const response = await axios.post(API_BASE_URL, {
        action: "update_employee_status",
        id: idToUse,
        status: newStatus,
      });
      console.log("Debug: API Response Status:", response.status);
      console.log("Debug: API Response Data:", response.data);
      if (response.data.success) {
        toast.success("Status updated successfully!",
          {
            style:{backgroundColor:"green", color:"white"},
            position:"top-right",
            hideProgressBar:true,
            autoClose:3000
          }
        );
        try {
          const u = users.find(x => Number(x.emp_id) === idToUse);
          await recordActivity({
            activityType: 'USER_STATUS_UPDATE',
            description: `Changed status of ${u?.username || 'employee'} (ID ${idToUse}) to ${newStatus}`,
            tableName: 'tbl_employee',
            recordId: idToUse,
          });
          // Also record a distinct activation/deactivation event for clearer audit trail
          const normalized = String(newStatus || '').toLowerCase();
          const isActive = normalized === 'active' || normalized === '1' || normalized === 'enabled';
          await recordActivity({
            activityType: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
            description: `${isActive ? 'Activated' : 'Deactivated'} ${u?.username || 'employee'} (ID ${idToUse})`,
            tableName: 'tbl_employee',
            recordId: idToUse,
          });
          // Badge count will be updated by fetchUnreadLogsCount via bumpLogsBadge
        } catch (_) {}
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            Number(user.emp_id) === idToUse ? { ...user, status: newStatus } : user
          )
        );
      } else {
        toast.error(response.data.message || "Failed to update status.",
          {
            style:{backgroundColor:"red", color:"white"},
            position:"top-right",
            hideProgressBar:true,
            autoClose:3000
          }
        );
      }
    } catch (error) {
      console.error("Debug: Error updating status:", error);
      toast.error(error.response?.data?.message || "An error occurred.",
        {
            style:{backgroundColor:"red", color:"white"},
            position:"top-right",
            hideProgressBar:true,
            autoClose:3000
          }
      );
    }
  };

  const filteredUsers = users.filter((user) => {
    // Debugging: Log user data once
    if (users.length > 0 && !debugInfo) {
      setDebugInfo(
        `Role type: ${typeof user.role_id}, Role value: ${user.role_id}, Shift type: ${typeof user.shift_id}, Shift value: ${user.shift_id}`
      );
    }

    const matchesSearch =
      (user.Fname || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.Lname || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      selectedRole === "all" ||
      (selectedRole === "admin" && user.role_id === 1) ||
      (selectedRole === "cashier" && user.role_id === 3) ||
      (selectedRole === "pharmacy cashier" && user.role_id === 2) ||
      (selectedRole === "inventory" && user.role_id === 4);

    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "Active" && user.status === "Active") ||
      (selectedStatus === "Inactive" && user.status === "Inactive");

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate user statistics based on filtered results
  const totalUsers = filteredUsers.length;
  const activeUsers = filteredUsers.filter((user) => user.status === "Active").length;
  const inactiveUsers = filteredUsers.filter((user) => user.status === "Inactive").length;

  // Calculate percentage changes
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? "100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change.toFixed(1)}%`;
  };

  const totalChange = calculateChange(totalUsers, prevTotalUsers);
  const activeChange = calculateChange(activeUsers, prevActiveUsers);
  const inactiveChange = calculateChange(inactiveUsers, prevInactiveUsers);

  // Updated Card Component for horizontal stretching
  const UserCard = ({ title, count, change }) => {
    const isPositive = parseFloat(change) > 0;
    const changeText = `${isPositive ? "+" : ""}`;
    return (
      <div className="bg-white p-6 rounded-lg shadow-md w-full h-32 flex flex-col justify-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-4xl font-bold mt-2">{count}</div>
        <div className={`text-sm mt-2 ${isPositive ? "text-green-500" : "text-green-500"}`}>
          {changeText}
        </div>
      </div>
    );
  };

  // Shift mapping function
  const getShiftName = (shiftId) => {
    // Handle null/undefined cases first
    if (shiftId === null || shiftId === undefined) {
      return "-";
    }
    
    // Convert to number for comparison
    const numericShiftId = Number(shiftId);
    
    switch (numericShiftId) {
      case 1:
        return "Shift1";
      case 2:
        return "Shift2";
      case 3:
        return "Shift3";
      default:
        return "Unknown";
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-GB", options);
  };

  // Password reset functions
  const openResetPasswordModal = (user) => {
    setSelectedUserForReset(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowResetPasswordModal(true);
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setSelectedUserForReset(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleResetPassword = async () => {
    // Validation
    if (!newPassword || newPassword.trim().length < 3) {
      toast.error("Password must be at least 3 characters long.", {
        style: { backgroundColor: "red", color: "white" },
        position: "top-right",
        hideProgressBar: true,
        autoClose: 3000,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.", {
        style: { backgroundColor: "red", color: "white" },
        position: "top-right",
        hideProgressBar: true,
        autoClose: 3000,
      });
      return;
    }

    try {
      setIsResetting(true);
      const response = await axios.post(API_BASE_URL, {
        action: "reset_password",
        emp_id: selectedUserForReset.emp_id,
        new_password: newPassword.trim()
      });

      if (response.data.success) {
        toast.success("Password reset successfully!", {
          style: { backgroundColor: "green", color: "white" },
          position: "top-right",
          hideProgressBar: true,
          autoClose: 3000,
        });
        try {
          await recordActivity({
            activityType: 'USER_PASSWORD_RESET',
            description: `Reset password for ${selectedUserForReset.username || ''} (ID ${selectedUserForReset.emp_id})`,
            tableName: 'tbl_employee',
            recordId: Number(selectedUserForReset.emp_id) || null,
          });
        } catch (_) {}
        setIsResetting(false);
        closeResetPasswordModal();
      } else {
        toast.error(response.data.message || "Failed to reset password.", 
          {
          style: { backgroundColor: "red", color: "white" },
          position: "top-right",
          hideProgressBar: true,
          autoClose: 3000,
        });
        setIsResetting(false);
      }
    } catch (error) {
      toast.error("An error occurred while resetting password.", {
        style: { backgroundColor: "red", color: "white" },
        position: "top-right",
        hideProgressBar: true,
        autoClose: 3000,
      });
      setIsResetting(false);
    }
  };

  // Print user credentials function
  const printUserCredentials = (user) => {
    try { recordActivity({ activityType: 'USER_CREDENTIALS_PRINT', description: `Printed credentials for ${user.username || ''} (ID ${user.emp_id})`, tableName: 'tbl_employee', recordId: Number(user.emp_id) || null }); } catch (_) {}
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>User Credentials - ${user.Fname} ${user.Lname}</title>
        <style>
          @media print {
            @page { margin: 1in; }
            body { font-family: Arial, sans-serif; }
          }
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
          .document-title {
            font-size: 18px;
            color: #666;
            margin-top: 10px;
          }
          .credential-card {
            border: 2px solid #ddd;
            border-radius: 10px;
            padding: 25px;
            margin: 20px 0;
            background: #f9f9f9;
          }
          .user-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .info-item {
            padding: 8px 0;
          }
          .info-label {
            font-weight: bold;
            color: #333;
            display: inline-block;
            width: 120px;
          }
          .info-value {
            color: #666;
          }
          .credentials-section {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
          }
          .credentials-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            text-align: center;
          }
          .credential-item {
            margin: 10px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          .username, .password {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
          }
          .role-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            color: white;
            background: #28a745;
          }
          .print-note {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 10px;
            margin: 20px 0;
            font-size: 12px;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">ENGUIO PHARMACY SYSTEM</div>
          <div class="document-title">Employee Credentials</div>
        </div>
        
        <div class="credential-card">
          <div class="user-info">
            <div class="info-item">
              <span class="info-label">Employee ID:</span>
              <span class="info-value">${user.emp_id}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Full Name:</span>
              <span class="info-value">${user.Fname} ${user.Mname || ''} ${user.Lname}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">${user.email}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Contact:</span>
              <span class="info-value">${user.contact_num || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Role:</span>
              <span class="role-badge">${
                user.role_id === 1 ? "Admin" :
                user.role_id === 2 ? "Pharmacy Cashier" :
                user.role_id === 3 ? "Cashier" :
                user.role_id === 4 ? "Inventory" : "Unknown"
              }</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value">${user.status}</span>
            </div>
          </div>
          
          <div class="credentials-section">
            <div class="credentials-title">🔐 LOGIN CREDENTIALS</div>
            <div class="credential-item">
              <strong>Username:</strong> <span class="username">${user.username}</span>
            </div>
            <div class="credential-item">
              <strong>Password:</strong> <span class="password">${
                lastCreatedUser && 
                lastCreatedUser.username === user.username && 
                lastCreatedUser.plainPassword 
                  ? lastCreatedUser.plainPassword 
                  : '[Contact Administrator - Password is encrypted in database]'
              }</span>
            </div>
          </div>
          
          <div class="print-note">
            <strong>⚠️ IMPORTANT:</strong> Keep these credentials secure and confidential. 
            Do not share with unauthorized personnel.
          </div>
        </div>
        
        <div class="footer">
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Enguio Pharmacy Management System</p>
        </div>
      </body>
      </html>
      
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      {/* Horizontally stretched cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <UserCard title="Total Users" count={totalUsers} />
        <UserCard title="Active Users" count={activeUsers} />
        <UserCard title="Inactive Users" count={inactiveUsers} />
      </div>

      {/* Existing Controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Manage your user accounts and permissions</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search users..."
            className="px-4 py-2 border rounded-lg w-64"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="cashier">Cashier</option>
            <option value="pharmacy cashier">Pharmacy cashier</option>
            <option value="inventory">Inventory</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-1.5 w-35 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Add User
          </button>
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded mt-4">
        <table className="w-500 border-collapse">
          <thead>
                          <tr className="bg-gray-100 sticky top-0">
                <th className="py-2 ">#</th>
                <th className="py-2">User</th>
                <th className="py-2">Birthdate</th>
                <th className="py-2">Contact</th>
                <th className="py-2">Username</th>
                <th className="py-2 pl-5">Gender</th>
                <th className="py-2">Role</th>
                <th className="py-2">Shift</th>
                <th className="py-2 pl-5">Age</th>
                <th className="py-2 pl-5">Address</th>
                <th className="py-2 mr-10">Status</th>
                <th className="py-2 pl-5">Actions</th>
              </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <tr key={user.emp_id ?? `${user.username || 'user'}-${index}`} className="border-b">
                <td className="py-2 pl-2 ml-20">{index + 1}</td>
                <td className="py-2 pl-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center">
                      {`${user.Fname?.[0] || ""}${user.Lname?.[0] || ""}`.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold pl-5">
                        {`${user.Fname || ""} ${user.Mname || ""} ${user.Lname || ""}`.trim()}
                      </p>
                      <p className="text-sm text-blue-500 pl-5">{user.email || "-"}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2 pl-4">{formatDate(user.birthdate)}</td>
                <td className="py-2 pl-7">{user.contact_num ?? "-"}</td>
                <td className="py-2 pl-5">{user.username ?? "-"}</td>
                <td className="py-2 pl-10">
                  {user.gender ? (
                    <span className={`px-2 py-1 rounded-lg ${
                      user.gender.toLowerCase() === 'male' 
                        ? 'bg-blue-100 text-blue-700' 
                        : user.gender.toLowerCase() === 'female'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.gender}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-2 pl-28">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg">
                    {user.role_id === 1
                      ? "Admin"
                      : user.role_id === 2
                      ? "Pharmacy cashier"
                      : user.role_id === 3
                      ? "Cashier"
                      : user.role_id === 4
                      ? "Inventory"
                      : "Unknown"}
                  </span>
                </td>
                <td className="py-2 pl-3">
                     {(user.role_id === 2 || user.role_id === 3) ? (
                       <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
                        {getShiftName(user.shift_id)}
                   </span>
                         ) : (
                          "-"
                           )}
                  </td>
                <td className="py-2 pl-5">{user.age ?? "-"}</td>
                <td className="py-2 pl-45">{user.address ?? "-"}</td>
                <td className="py-2 pl-4">
                  <select
                    value={users.find(u => (u.emp_id === user.emp_id))?.status || user.status || "Active"}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      await handleStatusChange(user.emp_id, newStatus);
                      // ensure only this row updates locally to keep each dropdown independent
                      setUsers(prev => prev.map(u => (u.emp_id === user.emp_id ? { ...u, status: newStatus } : u)));
                    }}
                    className={`px-2 py-1 rounded-lg mr-5 ${
                      (users.find(u => (u.emp_id === user.emp_id))?.status || user.status) === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-200 text-red-700"
                    }`}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </td>
                <td className="py-2 pl-2 ">
                  <button
                    onClick={() => openResetPasswordModal(user)}
                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    title="Change Password"
                  >
                    🔒 Change
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-150 mx-auto border border-gray-300 max-h-[100vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Add New Employee</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First, Middle, Last Name */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1">First Name</label>
                  <input
                    type="text"
                    name="fname"
                    value={formData.fname}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Middle Name</label>
                  <input
                    type="text"
                    name="mname"
                    value={formData.mname}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block mb-1">Last Name</label>
                  <input
                    type="text"
                    name="lname"
                    value={formData.lname}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-50 border p-2 rounded"
                    required
                  >
                    <option>-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="ml-20">
                  <label>Birthdate</label>
                  <input
                    type="date"
                    name="birthdate"
                    min="1800-01-01"
                    max="2010-01-01"
                    value={formData.birthdate}
                    onChange={handleInputChange}
                    className="w-50 border p-2 mr-40 pl-3 rounded"
                    required
                  />
                </div>
              </div>

              {/* Email & Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Contact Number</label>
                  <input
                    type="tel"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    maxLength={11}
                    title="Enter exactly 11 digits"
                    placeholder="11 digits"
                  />
                </div>
              </div>

              {/* Role & Shift */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required
                  >
                    <option value="">-- Select Role --</option>
                    <option value="admin">Admin</option>
                    <option value="cashier">Cashier</option>
                    <option value="pharmacy cashier">Pharmacy cashier</option>
                    <option value="inventory">Inventory</option>
                  </select>
                </div>
                {(formData.role === "cashier" || formData.role === "pharmacy cashier") && (
                  <div>
                    <label className="block mb-1">Shift</label>
                    <select
                      name="shift"
                      value={formData.shift}
                      onChange={handleInputChange}
                      className="w-full border p-2 rounded"
                      required
                    >
                      <option value="">-- Select Shift --</option>
                      <option value="Shift1">Shift1</option>
                      <option value="Shift2">Shift2</option>
                      <option value="Shift3">Shift3</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Age & Address */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required
                    min={18}
                    inputMode="numeric"
                    placeholder="18 or above"
                  />
                </div>
                <div>
                  <label className="block mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full border p-2 rounded pr-10"
                      required
                      placeholder="Must have Uppercase and Number"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-600 hover:text-gray-800"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <img src={showPassword ? "/assets/hidden.png" : "/assets/eye.png"} alt={showPassword ? "hide" : "show"} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Preview Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credential Preview Modal */}
      {showCredentialPreview && previewUserData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto border border-gray-300 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-center">📋 User Credentials Preview</h2>
            
            {/* Credential Preview Card */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">ENGUIO PHARMACY SYSTEM</h3>
                <p className="text-sm text-gray-600">Employee Credentials</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><strong>Full Name:</strong> {`${previewUserData.fname} ${previewUserData.mname || ''} ${previewUserData.lname}`.trim()}</div>
                <div><strong>Email:</strong> {previewUserData.email}</div>
                <div><strong>Contact:</strong> {previewUserData.contact}</div>
                <div><strong>Role:</strong> 
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                    {previewUserData.role_id === 1 ? "Admin" :
                     previewUserData.role_id === 2 ? "Pharmacy Cashier" :
                     previewUserData.role_id === 3 ? "Cashier" :
                     previewUserData.role_id === 4 ? "Inventory" : "Unknown"}
                  </span>
                </div>
                {previewUserData.needsShift && (
                  <div><strong>Shift:</strong> {previewUserData.shift}</div>
                )}
                <div><strong>Age:</strong> {previewUserData.age}</div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">🔐 Login Credentials</h4>
                <div className="space-y-2">
                  <div><strong>Username:</strong> <code className="bg-white px-2 py-1 rounded">{previewUserData.username}</code></div>
                  <div><strong>Password:</strong> <code className="bg-white px-2 py-1 rounded">{previewUserData.plainPassword}</code></div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> Please print these credentials before confirming. The password will be encrypted after creation.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between space-x-3">
              <button
                onClick={() => printUserCredentials(previewUserData)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                🖨️ Print Credentials
              </button>
              <button
                onClick={() => setShowCredentialPreview(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateUser}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                ✅ Confirm & Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetPasswordModal && selectedUserForReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-auto border border-gray-300">
            <h2 className="text-xl font-semibold mb-4 text-center">🔒 Change Password</h2>
            
            {/* User Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center mr-3">
                  {`${selectedUserForReset.Fname?.[0] || ""}${selectedUserForReset.Lname?.[0] || ""}`.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">
                    {`${selectedUserForReset.Fname || ""} ${selectedUserForReset.Mname || ""} ${selectedUserForReset.Lname || ""}`.trim()}
                  </p>
                  <p className="text-sm text-gray-600">{selectedUserForReset.email}</p>
                  <p className="text-xs text-blue-600">ID: {selectedUserForReset.emp_id}</p>
                </div>
              </div>
            </div>

            {/* Password Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                  minLength="3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                  minLength="3"
                />
              </div>
            </div>

            {/* Warning */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <strong>⚠️ Warning:</strong> This will permanently change the user's password. Make sure to inform the user of their new password.
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeResetPasswordModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                disabled={!newPassword || !confirmPassword || isResetting}
              >
                {isResetting ? 'Saving…' : '💾 Save New Password'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
//brand
function Logs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [selectedTab, setSelectedTab] = useState('Movement History');
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);
  const [movementRows, setMovementRows] = useState([]);
  const [movementLoading, setMovementLoading] = useState(false);
  const [transferRows, setTransferRows] = useState([]);
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Use backend.php as the single source
      const res = await axios.post(API_BASE_URL, {
        action: 'get_all_logs',
        limit: 500,
        search,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        let combined = res.data.data;
        const hasActivity = combined.some(r => (r.action || r.log_activity) && !['login','logout'].includes(String(r.action || r.log_activity).toLowerCase()));
        if (!hasActivity) {
          try {
            const ra = await axios.post(API_BASE_URL, { action: 'get_activity_logs', limit: 500, search, date_from: dateFrom || undefined, date_to: dateTo || undefined });
            if (ra.data?.success && Array.isArray(ra.data.data)) {
              const mapped = ra.data.data.map(a => ({
                date_created: a.date_created || a.created_at || '-',
                time_created: a.time_created || '-',
                user_full_name: a.username || '-',
                username: a.username || '-',
                role: a.role || '',
                action: a.activity_type || a.action || 'activity',
                description: a.activity_description || a.description || '',
              }));
              combined = [...combined, ...mapped];
            }
          } catch (_) {}
        }
        // Deduplicate entries (collapse duplicate logout/login records from multiple sources within the same minute)
        const seen = new Set();
        const unique = combined.filter(r => {
          const actionLower = String(r.action || r.log_activity || '').toLowerCase();
          const userLower = String(r.username || r.user_full_name || '-').toLowerCase();
          const dateOnly = String(r.date_created || r.login_date || '-').split(' ')[0];
          const timeRaw = String(r.time_created || r.login_time || '-');
          const m = timeRaw.match(/^(\d{1,2}):(\d{2})/);
          const minute = m ? `${String(m[1]).padStart(2,'0')}:${m[2]}` : timeRaw;
          const key = [actionLower, userLower, dateOnly, minute].join('|');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setRows(unique);
        setCurrentPage(1);

        // Update the global "last seen" to the newest timestamp from what is displayed
        try {
          const toIso = (r) => {
            const d = r.date_created || r.login_date;
            const t = r.time_created || r.login_time;
            if (!d || !t) return null;
            const s = `${String(d)} ${String(t)}`;
            const dt = new Date(s);
            return isNaN(dt.getTime()) ? null : dt.toISOString();
          };
          const latest = unique
            .map(toIso)
            .filter(Boolean)
            .sort()
            .pop();
          if (latest && typeof window !== 'undefined' && window.setLogsLastSeen) {
            window.setLogsLastSeen(latest);
          }
        } catch (_) {}
        return;
      }
      setRows([]);
    } catch (_) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);
  useEffect(() => { /* Removed navigation/viewing logging */ }, []);

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const res = await axios.post(API_BASE_URL, { action: 'get_reports_data' });
      if (res.data?.success && Array.isArray(res.data.reports)) {
        setReports(res.data.reports);
        setReportsPage(1);
      } else {
        setReports([]);
      }
    } catch (_) {
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'Reports') {
      fetchReports();
    }
  }, [selectedTab]);

  const fetchMovementHistory = async () => {
    try {
      setMovementLoading(true);
      const res = await axios.post(API_BASE_URL, { action: 'get_movement_history', search });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setMovementRows(res.data.data);
        setCurrentPage(1);
      } else {
        setMovementRows([]);
      }
    } catch (_) {
      setMovementRows([]);
    } finally {
      setMovementLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'Movement History') {
      fetchMovementHistory();
    }
  }, [selectedTab, search]);

  const fetchTransferHistory = async () => {
    try {
      setTransferLoading(true);
      const res = await axios.post(API_BASE_URL, { action: 'get_movement_history', search });
      if (res.data?.success && Array.isArray(res.data.data)) {
        const aggregated = (() => {
          const m = new Map();
          for (const r of res.data.data) {
            const id = r.id || r.transfer_header_id;
            if (!id) continue;
            const qty = Number(r.quantity) || 0;
            if (!m.has(id)) {
              m.set(id, {
                id,
                date: r.date,
                time: r.time,
                fromLocation: r.fromLocation,
                toLocation: r.toLocation,
                movedBy: r.movedBy,
                status: r.status,
                itemsCount: 1,
                totalQty: Math.abs(qty),
              });
            } else {
              const ex = m.get(id);
              ex.itemsCount += 1;
              ex.totalQty += Math.abs(qty);
            }
          }
          return Array.from(m.values()).sort((a, b) => {
            const d = (new Date(b.date) - new Date(a.date));
            if (d !== 0) return d;
            return String(b.time).localeCompare(String(a.time));
          });
        })();
        setTransferRows(aggregated);
        setCurrentPage(1);
      } else {
        setTransferRows([]);
      }
    } catch (_) {
      setTransferRows([]);
    } finally {
      setTransferLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'Transfer History') {
      fetchTransferHistory();
    }
  }, [selectedTab, search]);

  const isMovementAction = (a) => {
    const x = String(a || '').toLowerCase();
    return x.includes('stock_in') || x.includes('stock_out') || x.includes('stock_adjustment') || x.startsWith('stock_') || x.includes('stock ');
  };

  const isTransferAction = (a) => String(a || '').toLowerCase().includes('inventory_transfer');

  const filteredByTab = (() => {
    if (selectedTab === 'Movements') return rows.filter(r => isMovementAction(r.action || r.log_activity));
    if (selectedTab === 'Transfers') return rows.filter(r => isTransferAction(r.action || r.log_activity));
    return rows;
  })();

  const paged = filteredByTab.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredByTab.length / itemsPerPage));

  const fmtTime = (s) => {
    if (!s) return '-';
    const parts = String(s).split(':');
    if (parts.length < 2) return s;
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12; if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };

  // Render a colored badge for the action type
  const renderActionBadge = (actionRaw) => {
    const actionString = String(actionRaw || '').trim();
    const a = actionString.toLowerCase();
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
    
    // System logs
    if (a.includes('login')) return <span className={`${base} bg-green-100 text-green-700`}>🔐 LOGIN</span>;
    if (a.includes('logout')) return <span className={`${base} bg-gray-200 text-gray-800`}>🚪 LOGOUT</span>;
    if (a.includes('user_activated')) return <span className={`${base} bg-emerald-100 text-emerald-700`}>✅ USER ACTIVATED</span>;
    if (a.includes('user_deactivated')) return <span className={`${base} bg-yellow-100 text-yellow-800`}>⚠️ USER DEACTIVATED</span>;
    
    // POS Activities
    if (a.includes('pos_sale_saved')) return <span className={`${base} bg-blue-100 text-blue-700`}>💳 POS SALE</span>;
    if (a.includes('pos_sale_error')) return <span className={`${base} bg-red-100 text-red-700`}>❌ POS ERROR</span>;
    if (a.includes('pos')) return <span className={`${base} bg-blue-100 text-blue-700`}>💳 POS</span>;
    
    // Inventory Activities
    if (a.includes('inventory_transfer_created')) return <span className={`${base} bg-purple-100 text-purple-700`}>🚚 TRANSFER</span>;
    if (a.includes('inventory_transfer_deleted')) return <span className={`${base} bg-red-100 text-red-700`}>🗑️ TRANSFER DELETE</span>;
    if (a.includes('inventory_transfer')) return <span className={`${base} bg-purple-100 text-purple-700`}>🚚 TRANSFER</span>;
    
    // Stock Movement Activities (from database)
    if (a.includes('stock_in')) return <span className={`${base} bg-green-100 text-green-700`}>📦 STOCK IN</span>;
    if (a.includes('stock_out')) return <span className={`${base} bg-orange-100 text-orange-700`}>📤 STOCK OUT</span>;
    if (a.includes('stock_movement')) return <span className={`${base} bg-blue-100 text-blue-700`}>📊 MOVEMENT</span>;
    if (a.includes('stock_adjustment')) return <span className={`${base} bg-teal-100 text-teal-700`}>⚖️ ADJUSTMENT</span>;
    
    // Stock & Warehouse Activities
    if (a.includes('stock_adjustment_created')) return <span className={`${base} bg-orange-100 text-orange-700`}>📊 STOCK ADJ</span>;
    if (a.includes('stock_adjustment_updated')) return <span className={`${base} bg-yellow-100 text-yellow-700`}>✏️ STOCK UPD</span>;
    if (a.includes('warehouse_stock_updated')) return <span className={`${base} bg-teal-100 text-teal-700`}>🏭 WAREHOUSE</span>;
    if (a.includes('stock') || a.includes('warehouse')) return <span className={`${base} bg-teal-100 text-teal-700`}>📊 STOCK</span>;
    
    // Error handling
    if (a.includes('error') || a.includes('fail')) return <span className={`${base} bg-red-100 text-red-700`}>❌ {actionString.toUpperCase()}</span>;
    
    // User activities
    if (a.includes('user')) return <span className={`${base} bg-indigo-100 text-indigo-700`}>👤 {actionString.toUpperCase()}</span>;
    
    // General activities
    if (a.includes('activity')) return <span className={`${base} bg-blue-100 text-blue-700`}>📝 ACTIVITY</span>;
    
    return <span className={`${base} bg-gray-100 text-gray-700`}>{actionString ? actionString.toUpperCase() : '-'}</span>;
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Activity Logs</h1>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {['Movement History','Transfer History','Reports'].map(tab => (
          <button
            key={tab}
            onClick={() => { setSelectedTab(tab); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded border text-sm ${selectedTab === tab ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm text-gray-600 mb-1">Search</label>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by user, action, description" className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="border p-2 rounded" />
        </div>
        <button onClick={fetchLogs} className="h-10 px-4 bg-blue-500 text-white rounded">Filter</button>
        <button onClick={fetchLogs} className="h-10 px-4 bg-green-500 text-white rounded">Refresh</button>
      </div>

      <div className="w-full rounded-md border">
        {selectedTab === 'Reports' ? (
          <>
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">#</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Title</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Generated By</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Date</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {reportsLoading ? (
                    <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">Loading reports...</td></tr>
                  ) : reports.length === 0 ? (
                    <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No reports</td></tr>
                  ) : (
                    reports
                      .slice((reportsPage - 1) * itemsPerPage, reportsPage * itemsPerPage)
                      .map((r, idx) => (
                        <tr key={`${r.type}-${r.movement_id || idx}`} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-2">{(reportsPage - 1) * itemsPerPage + idx + 1}</td>
                          <td className="p-2">{r.title}</td>
                          <td className="p-2">{r.type}</td>
                          <td className="p-2">{r.generatedBy || '-'}</td>
                          <td className="p-2">{r.date || '-'}</td>
                          <td className="p-2">{r.time || '-'}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            {reports.length > itemsPerPage && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(reportsPage - 1) * itemsPerPage + 1} – {Math.min(reportsPage * itemsPerPage, reports.length)} of {reports.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${reportsPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={reportsPage === 1}
                    onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: Math.max(1, Math.ceil(reports.length / itemsPerPage)) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setReportsPage(page)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${reportsPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${reportsPage === Math.max(1, Math.ceil(reports.length / itemsPerPage)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={reportsPage === Math.max(1, Math.ceil(reports.length / itemsPerPage))}
                    onClick={() => setReportsPage(p => Math.min(Math.max(1, Math.ceil(reports.length / itemsPerPage)), p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : selectedTab === 'Movement History' ? (
          <>
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Product</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Qty</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">From</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">To</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Moved By</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Date</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Time</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {movementLoading ? (
                    <tr><td colSpan="9" className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                  ) : movementRows.length === 0 ? (
                    <tr><td colSpan="9" className="p-4 text-center text-muted-foreground">No movement history</td></tr>
                  ) : (
                    movementRows
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((r, idx) => (
                        <tr key={`${r.id}-${idx}`} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-2">{r.product_name}</td>
                          <td className="p-2">{r.movementType}</td>
                          <td className="p-2 text-right">{r.quantity}</td>
                          <td className="p-2">{r.fromLocation}</td>
                          <td className="p-2">{r.toLocation}</td>
                          <td className="p-2">{r.movedBy}</td>
                          <td className="p-2">{r.date}</td>
                          <td className="p-2">{r.time}</td>
                          <td className="p-2">{r.status}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            {movementRows.length > itemsPerPage && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} – {Math.min(currentPage * itemsPerPage, movementRows.length)} of {movementRows.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: Math.max(1, Math.ceil(movementRows.length / itemsPerPage)) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${currentPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === Math.max(1, Math.ceil(movementRows.length / itemsPerPage)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={currentPage === Math.max(1, Math.ceil(movementRows.length / itemsPerPage))}
                    onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(movementRows.length / itemsPerPage)), p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : selectedTab === 'Transfer History' ? (
          <>
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Transfer #</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Date</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Time</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">From</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">To</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Moved By</th>
                    <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Items</th>
                    <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Total Qty</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {transferLoading ? (
                    <tr><td colSpan="9" className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                  ) : transferRows.length === 0 ? (
                    <tr><td colSpan="9" className="p-4 text-center text-muted-foreground">No transfer history</td></tr>
                  ) : (
                    transferRows
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((r, idx) => (
                        <tr key={`${r.id}-${idx}`} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-2">TR-{r.id}</td>
                          <td className="p-2">{r.date}</td>
                          <td className="p-2">{r.time}</td>
                          <td className="p-2">{r.fromLocation}</td>
                          <td className="p-2">{r.toLocation}</td>
                          <td className="p-2">{r.movedBy}</td>
                          <td className="p-2 text-right">{r.itemsCount}</td>
                          <td className="p-2 text-right">{r.totalQty}</td>
                          <td className="p-2">{r.status}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            {transferRows.length > itemsPerPage && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} – {Math.min(currentPage * itemsPerPage, transferRows.length)} of {transferRows.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: Math.max(1, Math.ceil(transferRows.length / itemsPerPage)) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${currentPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === Math.max(1, Math.ceil(transferRows.length / itemsPerPage)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={currentPage === Math.max(1, Math.ceil(transferRows.length / itemsPerPage))}
                    onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(transferRows.length / itemsPerPage)), p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">#</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Date</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Time</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">User</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Username</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Role</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Action</th>
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Description</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {loading ? (
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td colSpan="8" className="p-4 text-center text-muted-foreground">Loading...</td>
                    </tr>
                  ) : filteredByTab.length === 0 ? (
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td colSpan="8" className="p-4 text-center text-muted-foreground">No logs</td>
                    </tr>
                  ) : (
                    paged.map((r, idx) => (
                      <tr key={`${r.date_created}-${r.time_created}-${idx}`} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                        <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{r.date_created || '-'}</td>
                        <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{fmtTime(r.time_created)}</td>
                        <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{r.user_full_name || r.username || '-'}</td>
                        <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{r.username || '-'}</td>
                        <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{r.role || '-'}</td>
                        <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{renderActionBadge(r.action || r.log_activity)}</td>
                        <td className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] max-w-[520px] truncate" title={r.description}>{r.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredByTab.length > itemsPerPage && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} – {Math.min(currentPage * itemsPerPage, filteredByTab.length)} of {filteredByTab.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${currentPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

//supplier
function Supplier() {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch suppliers on load
  useEffect(() => {
    fetchSuppliers();
  }, []);
  useEffect(() => { /* Removed navigation/viewing logging */ }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.post(
        API_BASE_URL,
        {
          action: "get_suppliers"
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.success) {
        setSuppliers(response.data.data || []);
      } else {
        console.error(response.data.message || "Failed to fetch suppliers");
      }
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier &&
      supplier.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Supplier Management</h1>

      {/* Search Box Only */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search suppliers by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Suppliers Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-black-700 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-black-700 uppercase tracking-wider">Supplier Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-black-700 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-black-700 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-black-700 uppercase tracking-wider">Email</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier, index) => (
                  <tr key={supplier.supplier_id}>
                    <td className="px-6 py-4">{index + 1}</td>
                    <td className="px-6 py-4">{supplier.supplier_name}</td>
                    <td className="px-6 py-4">{supplier.supplier_address}</td>
                    <td className="px-6 py-4">{supplier.supplier_contact}</td>
                    <td className="px-6 py-4">{supplier.supplier_email}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    No suppliers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



// Default Export
export default function Admin() {
  const [selectedFeature, setSelectedFeature] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loginActivityBadge, setLoginActivityBadge] = useState(0);
  const [loginActivityTotal, setLoginActivityTotal] = useState(0);
  const [unreadLogsCount, setUnreadLogsCount] = useState(0);
  const [lastLogsNavigation, setLastLogsNavigation] = useState(null);
  const [showBadge, setShowBadge] = useState(false);
  const [lastCountedIso, setLastCountedIso] = useState(null);
  const [hasUnseenLogs, setHasUnseenLogs] = useState(false);

  const getLastSeenTotal = () => {
    try {
      const v = localStorage.getItem('login_activity_last_seen_total');
      return v ? parseInt(v, 10) : 0;
    } catch (_) {
      return 0;
    }
  };

  const markLoginActivitySeen = (total) => {
    try {
      localStorage.setItem('login_activity_last_seen_total', String(total));
    } catch (_) {}
  };

  // Login Activity merged into Logs; stop polling and clear badge
  useEffect(() => { setLoginActivityBadge(0); setLoginActivityTotal(0); }, []);

  // Fetch unread logs count on component mount and refresh periodically
  useEffect(() => {
    // Use previously saved baselines if present; otherwise initialize to now
    try {
      let seen = null;
      let counted = null;
      try { seen = localStorage.getItem('logs_last_seen_iso'); } catch (_) {}
      try { counted = localStorage.getItem('logs_last_counted_iso'); } catch (_) {}
      try { setHasUnseenLogs(localStorage.getItem('logs_has_unseen') === '1'); } catch (_) {}
      const baseline = counted || seen || new Date().toISOString();
      setLastLogsNavigation(seen || baseline);
      setLastCountedIso(baseline);
      if (!seen) { try { localStorage.setItem('logs_last_seen_iso', baseline); } catch (_) {} }
      if (!counted) { try { localStorage.setItem('logs_last_counted_iso', baseline); } catch (_) {} }
    } catch (_) {}
    fetchUnreadLogsCount();
    
    // Refresh every 30 seconds to keep badge count updated
    const interval = setInterval(fetchUnreadLogsCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Keep showBadge in sync with persistent unseen flag
  useEffect(() => {
    if (hasUnseenLogs) {
      setShowBadge(true);
    }
  }, [hasUnseenLogs]);

  const markHasUnseen = () => {
    try {
      setHasUnseenLogs(true);
      localStorage.setItem('logs_has_unseen', '1');
    } catch (_) {}
  };
  const clearHasUnseen = () => {
    try {
      setHasUnseenLogs(false);
      localStorage.setItem('logs_has_unseen', '0');
    } catch (_) {}
  };

  const fetchUnreadLogsCount = async () => {
    try {
      // Always compute total unseen since the last seen timestamp
      let baseline = lastLogsNavigation;
      try { baseline = localStorage.getItem('logs_last_seen_iso') || baseline; } catch (_) {}
      if (!baseline) {
        baseline = new Date().toISOString();
        setLastLogsNavigation(baseline);
        try { localStorage.setItem('logs_last_seen_iso', baseline); } catch (_) {}
      }

      const resAll = await axios.post(API_BASE_URL, { action: 'get_all_logs', limit: 1000 });
      let combined = Array.isArray(resAll.data?.data) ? resAll.data.data : [];
      const hasActivity = combined.some(r => (r.action || r.log_activity) && !['login','logout'].includes(String(r.action || r.log_activity).toLowerCase()));
      if (!hasActivity) {
        try {
          const resActs = await axios.post(API_BASE_URL, { action: 'get_activity_logs', limit: 1000 });
          if (resActs?.data?.success && Array.isArray(resActs.data.data)) {
            const mapped = resActs.data.data.map(a => ({
              date_created: a.date_created || a.created_at || '-',
              time_created: a.time_created || '-',
              user_full_name: a.username || '-',
              username: a.username || '-',
              role: a.role || '',
              action: a.activity_type || a.action || 'activity',
              description: a.activity_description || a.description || '',
            }));
            combined = [...combined, ...mapped];
          }
        } catch (_) {}
      }

      const toIso = (r) => {
        const d = r.date_created || r.login_date;
        const t = r.time_created || r.login_time;
        if (!d || !t) return null;
        const s = `${String(d)} ${String(t)}`;
        const dt = new Date(s);
        return isNaN(dt.getTime()) ? null : dt.toISOString();
      };
      const baseMs = Date.parse(baseline);
      const afterBaseline = combined.filter(r => {
        const iso = toIso(r);
        return iso && Date.parse(iso) > baseMs;
      });
      const seenKeys = new Set();
      const unique = afterBaseline.filter(r => {
        const actionLower = String(r.action || r.log_activity || '').toLowerCase();
        const userLower = String(r.username || r.user_full_name || '-').toLowerCase();
        const dateOnly = String(r.date_created || r.login_date || '-').split(' ')[0];
        const timeRaw = String(r.time_created || r.login_time || '-');
        const m = timeRaw.match(/^(\d{1,2}):(\d{2})/);
        const minute = m ? `${String(m[1]).padStart(2,'0')}:${m[2]}` : timeRaw;
        const key = [actionLower, userLower, dateOnly, minute].join('|');
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      const totalUnseen = unique.length;
      setUnreadLogsCount(totalUnseen);
      if (totalUnseen > 0) {
        setShowBadge(true);
        markHasUnseen();
      }
    } catch (error) {
      console.error('Error fetching unread logs count:', error);
    }
  };

  // Refresh unread count after logging activities
  const refreshUnreadCount = () => {
    fetchUnreadLogsCount();
  };

  // Manual refresh function for testing - now shows new entries since last navigation
  const manualRefreshBadge = () => {
    // Expose quick check without noisy logs
    fetchUnreadLogsCount();
  };

  // Make refreshUnreadCount available globally for recordActivity helper
  useEffect(() => {
    window.refreshUnreadCount = refreshUnreadCount;
    // Expose setter so Logs view can update the last-seen timestamp to newest displayed
    window.setLogsLastSeen = (isoTs) => {
      try {
        if (isoTs) {
          setLastLogsNavigation(isoTs);
          setUnreadLogsCount(0);
          setShowBadge(false);
          try { localStorage.setItem('logs_last_seen_iso', isoTs); } catch (_) {}
          setLastCountedIso(isoTs);
          try { localStorage.setItem('logs_last_counted_iso', isoTs); } catch (_) {}
        }
      } catch (_) {}
    };
    // Also expose a helper for activities to increment badge when backend write succeeds
    window.bumpLogsBadge = () => {
      // Only fetch to avoid double counting; no optimistic increment
      try { setTimeout(fetchUnreadLogsCount, 0); } catch (_) {}
    };
    // Expose a force-show helper to notify user immediately even if backend counting lags
    window.forceShowLogsBadge = () => {
      // Keep for API compatibility, but route to fetch-based update to avoid multi-bumps
      try { setTimeout(fetchUnreadLogsCount, 0); } catch (_) {}
    };
    return () => {
      delete window.refreshUnreadCount;
      delete window.setLogsLastSeen;
      delete window.bumpLogsBadge;
      delete window.forceShowLogsBadge;
    };
  }, []);

  // This function is no longer needed since we reset the badge when navigating to Logs
  // const markLogsAsRead = async () => {
  //   try {
  //     const response = await axios.post(API_BASE_URL, {
  //       action: 'mark_logs_as_read'
  //     });
  //     if (response.data.success) {
  //       setUnreadLogsCount(0);
  //     }
  //   } catch (error) {
  //     console.error('Error marking logs as read:', error);
  //   }
  // };

  const handleSelectFeature = (feature) => {
    setSelectedFeature(feature);
    // When navigating to Logs, mark as read immediately and hide the badge
    if (feature === 'Logs') {
      const currentTime = new Date().toISOString();
      setLastLogsNavigation(currentTime);
      setUnreadLogsCount(0);
      setShowBadge(false);
      clearHasUnseen();
      try { localStorage.setItem('logs_last_seen_iso', currentTime); } catch (_) {}
      setLastCountedIso(currentTime);
      try { localStorage.setItem('logs_last_counted_iso', currentTime); } catch (_) {}
    }
    
    // Removed navigation logging
    // no-op for removed Login Activity view
  };

  const renderContent = () => {
    switch (selectedFeature) {
      //user
      case "User":
        return <UserManagement />;
      //dashboard
      case "Dashboard":
        return <Dashboard />;
      //products
      case "products":
        return <Products/>;
        //supplier
      case "Supplier":
        return <Supplier/>;
        //stock entry
      case "Logs":
        return <Logs />;
        //records (removed)
        //sales history
      case "Sales History":
        return (
          <SalesHistory />
        );
        //store settings
      case "Store Settings":
        return (
          <div className="p-8">
            <h1 className="text-2xl font-bold">Store Settings</h1>
            <p>Configure store settings here.</p>
          </div>
        );
        //logout
      case "Logout":
        // Run logout only once using effect to avoid duplicate calls on re-render
        const LogoutOnce = () => {
          const didRun = React.useRef(false);
          useEffect(() => {
            if (didRun.current) return;
            didRun.current = true;
            (async () => {
              try {
                let empId = null;
                try {
                  const stored = sessionStorage.getItem('user_data');
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    empId = parsed?.user_id || parsed?.emp_id || null;
                  }
                } catch (_) {}

                const response = await axios.post("http://localhost/Enguio_Project/Api/backend.php", {
                  action: "logout",
                  emp_id: empId
                });

                // Record generic logout activity for badge freshness (backend remains authoritative)
                try {
                  await recordActivity({ activityType: 'LOGOUT', description: 'User logged out (SUCCESS)', tableName: 'tbl_login', recordId: null });
                } catch (_) {}

                // Clear local state and redirect
                sessionStorage.removeItem('user_data');
                window.location.href = "/";
              } catch (error) {
                // On any error, still clear and redirect
                sessionStorage.removeItem('user_data');
                window.location.href = "/";
              }
            })();
          }, []);
          return (
            <div className="p-8">
              <h1 className="text-2xl font-bold">Logging Out...</h1>
              <p>Please wait while we log you out.</p>
            </div>
          );
        };
        return <LogoutOnce />;
      default:
        return (
          <div className="p-8">
            <p>Select a valid feature from the sidebar.</p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar
          onSelectFeature={handleSelectFeature}
          selectedFeature={selectedFeature}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          loginActivityBadge={loginActivityBadge}
          unreadLogsCount={unreadLogsCount}
          showBadge={showBadge}
        />
        {/* Main Content Area */}
        <main
          className={`flex-1 p-8 overflow-y-auto bg-white transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "ml-64" : "ml-16"
          }`}
        >
          {renderContent()}
        </main>
      </div>

    </>
  );
}