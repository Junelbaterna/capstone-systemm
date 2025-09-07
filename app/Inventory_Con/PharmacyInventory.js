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
  FaArchive
} from "react-icons/fa";
import { Package, Truck, CheckCircle, AlertCircle, Bell, BellRing, Clock, X } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useSettings } from "./SettingsContext";
import NotificationSystem from "./NotificationSystem";

const PharmacyInventory = () => {
  const { theme } = useTheme();
  const { settings, isProductExpiringSoon, isProductExpired, getExpiryStatus, isStockLow } = useSettings();
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [pharmacyLocationId, setPharmacyLocationId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Transfer history states
  const [showQuantityHistoryModal, setShowQuantityHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  const [quantityHistoryData, setQuantityHistoryData] = useState([]);
  const [showCurrentFifoData, setShowCurrentFifoData] = useState(false);
  const [fifoStockData, setFifoStockData] = useState([]);
  
  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState({
    expiring: [],
    lowStock: [],
    outOfStock: []
  });

  const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";

  // API function
  async function handleApiCall(action, data = {}) {
    const payload = { action, ...data };
    console.log("🚀 API Call Payload:", payload);

    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      console.log("✅ API Success Response:", resData);

      if (resData && typeof resData === "object") {
        if (!resData.success) {
          console.warn("⚠️ API responded with failure:", resData.message || resData);
        }
        return resData;
      } else {
        console.warn("⚠️ Unexpected API response format:", resData);
        return {
          success: false,
          message: "Unexpected response format",
          data: resData,
        };
      }
    } catch (error) {
      console.error("❌ API Call Error:", error);
      return {
        success: false,
        message: error.message,
        error: "REQUEST_ERROR",
      };
    }
  }

  // Calculate notifications for expiring and low stock products
  const calculateNotifications = (productList) => {
    const today = new Date();
    
    const expiring = productList.filter(product => {
      if (!product.expiration || !settings.expiryAlerts) return false;
      return isProductExpiringSoon(product.expiration) || isProductExpired(product.expiration);
    });
    
    const lowStock = productList.filter(product => {
      const quantity = parseInt(product.quantity || 0);
      return isStockLow(quantity) && settings.lowStockAlerts;
    });
    
    const outOfStock = productList.filter(product => {
      const quantity = parseInt(product.quantity || 0);
      return quantity === 0;
    });
    
    setNotifications({
      expiring: expiring.sort((a, b) => new Date(a.expiration) - new Date(b.expiration)),
      lowStock: lowStock.sort((a, b) => parseInt(a.quantity || 0) - parseInt(b.quantity || 0)),
      outOfStock
    });

    // Check for auto-reorder if enabled
    checkAutoReorder(productList);
  };

  // Auto-reorder functionality
  function checkAutoReorder(products) {
    if (!settings.autoReorder) return;
    
    const lowStockProducts = products.filter(product => 
      parseInt(product.quantity || 0) <= settings.lowStockThreshold && 
      parseInt(product.quantity || 0) > 0
    );
    
    if (lowStockProducts.length > 0) {
      const productNames = lowStockProducts.map(p => p.product_name).join(', ');
      toast.warning(`🔄 Auto-reorder: ${lowStockProducts.length} product(s) need restocking: ${productNames}`);
      
      // Here you could trigger an API call to create purchase orders
      // or send notifications to suppliers
      console.log("Auto-reorder triggered for products:", lowStockProducts);
    }
  }

  // Load pharmacy location ID
  const loadPharmacyLocation = async () => {
    try {
      const response = await handleApiCall("get_locations");
      if (response.success && Array.isArray(response.data)) {
        const pharmacyLocation = response.data.find(loc => 
          loc.location_name.toLowerCase().includes('pharmacy')
        );
        if (pharmacyLocation) {
          setPharmacyLocationId(pharmacyLocation.location_id);
          return pharmacyLocation.location_id;
        }
      }
    } catch (error) {
      console.error("Error loading pharmacy location:", error);
    }
    return null;
  };

  // Load products for pharmacy
  const loadProducts = async () => {
    if (!pharmacyLocationId) return;
    
    setIsLoading(true);
    try {
      // Try the new location-specific API first
      const response = await handleApiCall("get_products_by_location_name", {
        location_name: "Pharmacy"
      });
      
      if (response.success && Array.isArray(response.data)) {
        console.log("✅ Loaded pharmacy products:", response.data.length);
        // Filter out archived products
        const activeProducts = response.data.filter(
          (product) => (product.status || "").toLowerCase() !== "archived"
        );
        console.log("✅ Active pharmacy products after filtering:", activeProducts.length);
        setInventory(activeProducts);
        setFilteredInventory(activeProducts);
        calculateNotifications(activeProducts);
      } else {
        // Fallback to the original API
        const fallbackResponse = await handleApiCall("get_location_products", {
          location_id: pharmacyLocationId,
          search: searchTerm,
          category: selectedCategory
        });
        
        if (fallbackResponse.success && Array.isArray(fallbackResponse.data)) {
          console.log("✅ Loaded pharmacy products (fallback):", fallbackResponse.data.length);
          // Filter out archived products
          const activeProducts = fallbackResponse.data.filter(
            (product) => (product.status || "").toLowerCase() !== "archived"
          );
          console.log("✅ Active pharmacy products after filtering (fallback):", activeProducts.length);
          setInventory(activeProducts);
          setFilteredInventory(activeProducts);
          calculateNotifications(activeProducts);
        } else {
          console.warn("⚠️ No products found for pharmacy");
          setInventory([]);
          setFilteredInventory([]);
        }
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
      setInventory([]);
      setFilteredInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const locationId = await loadPharmacyLocation();
      if (locationId) {
        await loadProducts();
      }
    };
    initialize();
  }, [pharmacyLocationId]);

  useEffect(() => {
    if (pharmacyLocationId) {
      loadProducts();
    }
  }, [searchTerm, selectedCategory, pharmacyLocationId]);

  // Auto-refresh products every 15 seconds to catch new transfers and sales
  useEffect(() => {
    const interval = setInterval(() => {
      if (pharmacyLocationId && !isLoading) {
        console.log("🔄 Auto-refreshing pharmacy products...");
        loadProducts();
      }
    }, 15000); // 15 seconds - more frequent to catch POS sales

    return () => clearInterval(interval);
  }, [pharmacyLocationId, isLoading]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    filterInventory();
  }, [searchTerm, selectedCategory, inventory]);

  const filterInventory = () => {
    let filtered = inventory;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredInventory(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "in stock":
        return "success";
      case "low stock":
        return "warning";
      case "out of stock":
        return "danger";
      default:
        return "default";
    }
  };

  // Archive functionality
  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedItem(null);
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    
    setLoading(true);
    try {
      const response = await handleApiCall("delete_product", {
        product_id: selectedItem.product_id,
        reason: "Archived from pharmacy inventory",
        archived_by: "admin"
      });
      
      if (response.success) {
        toast.success("Product archived successfully");
        closeDeleteModal();
        loadProducts(); // Reload products
      } else {
        toast.error(response.message || "Failed to archive product");
      }
    } catch (error) {
      console.error("Error archiving product:", error);
      toast.error("Failed to archive product");
    } finally {
      setLoading(false);
    }
  };

  // Transfer history functions
  const openQuantityHistoryModal = (product) => {
    setSelectedProductForHistory(product);
    setShowQuantityHistoryModal(true);
    setShowCurrentFifoData(true);
    refreshProductData(product.product_id);
    loadTransferHistory(product.product_id);
  };

  const closeQuantityHistoryModal = () => {
    setShowQuantityHistoryModal(false);
    setSelectedProductForHistory(null);
    setQuantityHistoryData([]);
    setFifoStockData([]);
  };

  const refreshProductData = async (productId) => {
    try {
      const response = await handleApiCall("get_fifo_stock", { product_id: productId });
      if (response.success && Array.isArray(response.data)) {
        setFifoStockData(response.data);
      }
    } catch (error) {
      console.error("Error refreshing product data:", error);
    }
  };

  const loadTransferHistory = async (productId) => {
    try {
      console.log("Loading transfer history for product ID:", productId);
      const response = await handleApiCall("get_transfer_logs", { 
        product_id: productId,
        limit: 100
      });

      console.log("Transfer history response:", response);
      
      if (response.success) {
        console.log("Transfer data received:", response.data);
        displayTransferHistory(response.data);
      } else {
        console.error("Error loading transfer history:", response.message);
        const tableDiv = document.getElementById('transferHistoryTable');
        if (tableDiv) {
          tableDiv.innerHTML = '<div className="text-center py-4 text-red-500">Error loading transfer history: ' + response.message + '</div>';
        }
      }
    } catch (error) {
      console.error("Error loading transfer history:", error);
      const tableDiv = document.getElementById('transferHistoryTable');
      if (tableDiv) {
        tableDiv.innerHTML = '<div className="text-center py-4 text-red-500">Error: ' + error.message + '</div>';
      }
    }
  };

  const displayTransferHistory = (transferLogs) => {
    const tableDiv = document.getElementById('transferHistoryTable');
    if (!tableDiv) return;
    
    console.log("Displaying transfer history:", transferLogs);
    
    if (!transferLogs || transferLogs.length === 0) {
      console.log("No transfer logs found");
      tableDiv.innerHTML = '<div className="text-center py-4 text-gray-500">No transfer history found for this product</div>';
      return;
    }

    let html = `
      <div className="mb-3">
        <span className="text-sm font-medium" style="color: ${theme.text.primary}">Total Transfers: ${transferLogs.length}</span>
        <span className="text-sm ml-2" style="color: ${theme.text.secondary}">(Showing all transfer movements with batch details)</span>
      </div>
    `;

    transferLogs.forEach((transfer, index) => {
      const transferDate = new Date(transfer.transfer_date).toLocaleDateString();
      const hasBatchDetails = transfer.batch_details && transfer.batch_details.length > 0;
      
      html += `
        <div className="mb-4 rounded-lg border" style="border-color: ${theme.border.default}; background-color: ${theme.bg.card}">
          <div className="p-4 border-b" style="border-color: ${theme.border.light}">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold" style="color: ${theme.text.primary}">Transfer #${transfer.transfer_id}</h4>
                <p className="text-sm" style="color: ${theme.text.secondary}">${transferDate} - ${transfer.product_name}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 text-sm font-medium rounded-full" style="background-color: ${theme.colors.info}20; color: ${theme.colors.info}">
                  ${transfer.quantity} units
                </span>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <span className="inline-block px-2 py-1 text-xs font-medium rounded-full" style="background-color: ${theme.colors.danger}20; color: ${theme.colors.danger}">
                From: ${transfer.from_location}
              </span>
              <span className="inline-block px-2 py-1 text-xs font-medium rounded-full" style="background-color: ${theme.colors.success}20; color: ${theme.colors.success}">
                To: ${transfer.to_location}
              </span>
            </div>
          </div>
          
          ${hasBatchDetails ? `
            <div className="p-4">
              <h5 className="font-medium mb-3" style="color: ${theme.text.primary}">📦 Batch Details (${transfer.batch_details.length} batch${transfer.batch_details.length > 1 ? 'es' : ''})</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style="background-color: ${theme.bg.secondary}">
                      <th className="px-3 py-2 text-left font-medium" style="color: ${theme.text.secondary}">Batch #</th>
                      <th className="px-3 py-2 text-left font-medium" style="color: ${theme.text.secondary}">Reference</th>
                      <th className="px-3 py-2 text-center font-medium" style="color: ${theme.text.secondary}">Quantity</th>
                      <th className="px-3 py-2 text-center font-medium" style="color: ${theme.text.secondary}">Unit Cost</th>
                      <th className="px-3 py-2 text-center font-medium" style="color: ${theme.text.secondary}">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${transfer.batch_details.map((batch, batchIndex) => `
                      <tr style="border-bottom: 1px solid ${theme.border.light}">
                        <td className="px-3 py-2 font-mono" style="color: ${theme.text.primary}">${batch.batch_number || batch.batch_id || (batchIndex + 1)}</td>
                        <td className="px-3 py-2 font-mono text-xs" style="color: ${theme.text.primary}">${batch.batch_reference}</td>
                        <td className="px-3 py-2 text-center font-medium" style="color: ${theme.colors.primary}">${batch.batch_quantity} units</td>
                        <td className="px-3 py-2 text-center" style="color: ${theme.text.primary}">₱${Number.parseFloat(batch.unit_cost || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center" style="color: ${theme.text.primary}">
                          ${batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : `
            <div className="p-4 text-center" style="color: ${theme.text.muted}">
              <p className="text-sm">No batch details available for this transfer</p>
            </div>
          `}
        </div>
      `;
    });

    tableDiv.innerHTML = html;
    try {
      tableDiv.style.color = theme.text.primary;
    } catch (e) {}
  };

  const categories = [...new Set(inventory.map(p => {
    // Handle both string and object category formats
    if (typeof p.category === 'string') {
      return p.category;
    } else if (p.category && typeof p.category === 'object' && p.category.category_name) {
      return p.category.category_name;
    }
    return null;
  }).filter(Boolean))];
  const pages = Math.ceil(filteredInventory.length / rowsPerPage);
  const items = filteredInventory.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Update uniqueProducts for both table and stats
  const uniqueProducts = Array.from(new Map(filteredInventory.map(item => [item.product_name, item])).values());

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: theme.bg.primary }}>
      <NotificationSystem products={inventory} />
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Pharmacy Inventory</h1>
          <p style={{ color: theme.text.secondary }}>Manage pharmaceutical products and medications</p>
        </div>
        
        {/* Notification Bell */}
        <div className="relative notification-dropdown">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
            title="View Notifications"
          >
            {(notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length) > 0 ? (
              <BellRing className="h-6 w-6" style={{ color: theme.colors.warning }} />
            ) : (
              <Bell className="h-6 w-6" style={{ color: theme.text.secondary }} />
            )}
            
            {/* Notification Badge */}
            {(notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {Math.min(notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length, 99)}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 rounded-lg shadow-2xl border z-50 max-h-96 overflow-y-auto" 
                 style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, boxShadow: `0 25px 50px ${theme.shadow}` }}>
              <div className="p-4 border-b" style={{ borderColor: theme.border.default }}>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Notifications</h3>
                <p className="text-sm" style={{ color: theme.text.secondary }}>
                  {notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length} alerts
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {/* Expiring Products */}
                {notifications.expiring.length > 0 && (
                  <div className="p-4 border-b" style={{ borderColor: theme.border.light }}>
                    <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.warning }}>
                      <Clock className="h-4 w-4 mr-2" />
                      Expiring Soon ({notifications.expiring.length})
                    </h4>
                    {notifications.expiring.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: theme.text.primary }}>{product.product_name}</span>
                        <span className="text-xs px-2 py-1 rounded" style={{ 
                          backgroundColor: theme.colors.warning + '20', 
                          color: theme.colors.warning 
                        }}>
                          {Math.ceil((new Date(product.expiration) - new Date()) / (1000 * 60 * 60 * 24))} days
                        </span>
                      </div>
                    ))}
                    {notifications.expiring.length > 5 && (
                      <p className="text-xs mt-2" style={{ color: theme.text.secondary }}>
                        +{notifications.expiring.length - 5} more...
                      </p>
                    )}
                  </div>
                )}

                {/* Low Stock Products */}
                {notifications.lowStock.length > 0 && (
                  <div className="p-4 border-b" style={{ borderColor: theme.border.light }}>
                    <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.warning }}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Low Stock ({notifications.lowStock.length})
                    </h4>
                    {notifications.lowStock.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: theme.text.primary }}>{product.product_name}</span>
                        <span className="text-xs px-2 py-1 rounded" style={{ 
                          backgroundColor: theme.colors.warning + '20', 
                          color: theme.colors.warning 
                        }}>
                          {product.quantity} left
                        </span>
                      </div>
                    ))}
                    {notifications.lowStock.length > 5 && (
                      <p className="text-xs mt-2" style={{ color: theme.text.secondary }}>
                        +{notifications.lowStock.length - 5} more...
                      </p>
                    )}
                  </div>
                )}

                {/* Out of Stock Products */}
                {notifications.outOfStock.length > 0 && (
                  <div className="p-4">
                    <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.danger }}>
                      <Package className="h-4 w-4 mr-2" />
                      Out of Stock ({notifications.outOfStock.length})
                    </h4>
                    {notifications.outOfStock.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: theme.text.primary }}>{product.product_name}</span>
                        <span className="text-xs px-2 py-1 rounded" style={{ 
                          backgroundColor: theme.colors.danger + '20', 
                          color: theme.colors.danger 
                        }}>
                          0 stock
                        </span>
                      </div>
                    ))}
                    {notifications.outOfStock.length > 5 && (
                      <p className="text-xs mt-2" style={{ color: theme.text.secondary }}>
                        +{notifications.outOfStock.length - 5} more...
                      </p>
                    )}
                  </div>
                )}

                {/* No Notifications */}
                {(notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length) === 0 && (
                  <div className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2" style={{ color: theme.colors.success }} />
                    <p className="text-sm" style={{ color: theme.text.secondary }}>All products are in good condition!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl shadow-xl p-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
          <div className="flex items-center">
            <Package className="h-8 w-8" style={{ color: theme.colors.accent }} />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: theme.text.muted }}>Total Products</p>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{uniqueProducts.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8" style={{ color: theme.colors.success }} />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: theme.text.muted }}>In Stock</p>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {inventory.filter(p => p.stock_status === 'in stock').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8" style={{ color: theme.colors.warning }} />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: theme.text.muted }}>Low Stock</p>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {inventory.filter(p => p.stock_status === 'low stock').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
          <div className="flex items-center">
            <Truck className="h-8 w-8" style={{ color: theme.colors.info }} />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: theme.text.muted }}>Total Value</p>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                ₱{inventory.reduce((sum, p) => sum + (Number(p.unit_price || 0) * Number(p.quantity || 0)), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="rounded-3xl shadow-xl p-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: theme.text.muted }} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: theme.border.default, 
                  backgroundColor: theme.bg.secondary,
                  color: theme.text.primary,
                  focusRingColor: theme.colors.accent
                }}
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
              style={{ 
                borderColor: theme.border.default, 
                backgroundColor: theme.bg.secondary,
                color: theme.text.primary,
                focusRingColor: theme.colors.accent
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={typeof category === 'string' ? category : (category?.category_name || 'Unknown')}>
                  {typeof category === 'string' ? category : (category?.category_name || 'Unknown')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-3xl shadow-xl" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: theme.border.default }}>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold" style={{ color: theme.text.primary }}>Products</h3>
            <div className="text-sm" style={{ color: theme.text.secondary }}>
              {filteredInventory.length} products found
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full min-w-max" style={{ color: theme.text.primary }}>
            <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.default }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  PRODUCT NAME
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  BRAND
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  CATEGORY
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  STOCK
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  PRICE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  SUPPLIER
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  FIFO ORDER
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  BARCODE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  BATCH NO.
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  BATCH DATE
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  DATE ADDED
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  BATCH TIME
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  DAYS TO EXPIRY
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  UNIT COST
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  STATUS
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.light }}>
              {isLoading ? (
                <tr>
                  <td colSpan={15} className="px-6 py-4 text-center" style={{ color: theme.text.secondary }}>
                    Loading products...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                // Remove duplicates by product_name
                uniqueProducts.map((item, index) => (
                  <tr key={`${item.product_id}-${index}`} className="hover:bg-opacity-50" style={{ backgroundColor: 'transparent', hoverBackgroundColor: theme.bg.hover }}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium" style={{ color: theme.text.primary }}>
                        {item.product_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>
                      {item.brand || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary }}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div>
                        <div className="font-semibold" style={{ color: theme.text.primary }}>{item.quantity || 0}</div>
                        <div className="text-sm" style={{ color: theme.text.secondary }}>units</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                      ₱{Number.parseFloat(item.unit_price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>
                      {item.supplier_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.colors.accent + '20', color: theme.colors.accent }}>
                        #{item.fifo_order || 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono" style={{ color: theme.text.primary }}>
                      {item.barcode}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>
                      <div>
                        <div className="font-medium">{item.batch_reference || <span style={{ color: theme.text.muted, fontStyle: 'italic' }}>None</span>}</div>
                        {item.entry_by && (
                          <div className="text-xs" style={{ color: theme.text.secondary }}>by {item.entry_by}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                      {item.entry_date ? new Date(item.entry_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : <span style={{ color: theme.text.muted, fontStyle: 'italic' }}>N/A</span>}
                    </td>
                    <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                      {item.date_added ? new Date(item.date_added).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : <span style={{ color: theme.text.muted, fontStyle: 'italic' }}>N/A</span>}
                    </td>
                    <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                      {item.entry_time ? new Date(`2000-01-01T${item.entry_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : <span style={{ color: theme.text.muted, fontStyle: 'italic' }}>N/A</span>}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      {item.expiration ? (
                        (() => {
                          const daysUntilExpiry = Math.ceil((new Date(item.expiration) - new Date()) / (1000 * 60 * 60 * 24));
                          return (
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full" style={{
                              backgroundColor: daysUntilExpiry <= 7 ? theme.colors.danger + '20' :
                                daysUntilExpiry <= 30 ? theme.colors.warning + '20' :
                                theme.colors.success + '20',
                              color: daysUntilExpiry <= 7 ? theme.colors.danger :
                                daysUntilExpiry <= 30 ? theme.colors.warning :
                                theme.colors.success
                            }}>
                              {daysUntilExpiry} days
                            </span>
                          );
                        })()
                      ) : <span style={{ color: theme.text.muted, fontStyle: 'italic' }}>N/A</span>}
                    </td>
                    <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                      ₱{Number.parseFloat(item.unit_cost || item.unit_price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full" style={{
                        backgroundColor: item.stock_status === "in stock" ? theme.colors.success + '20' :
                          item.stock_status === "low stock" ? theme.colors.warning + '20' :
                          item.stock_status === "out of stock" ? theme.colors.danger + '20' :
                          theme.bg.secondary,
                        color: item.stock_status === "in stock" ? theme.colors.success :
                          item.stock_status === "low stock" ? theme.colors.warning :
                          item.stock_status === "out of stock" ? theme.colors.danger :
                          theme.text.primary
                      }}>
                        {item.stock_status || "unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button className="p-1" style={{ color: theme.colors.accent }}>
                          <FaEdit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => openQuantityHistoryModal(item)}
                          className="p-1"
                          style={{ color: theme.colors.success }}
                          title="View Transfer History"
                        >
                          <Truck className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(item)}
                          className="p-1"
                          style={{ color: theme.colors.danger }}
                          title="Archive Product"
                        >
                          <FaArchive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={15} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Package className="h-12 w-12" style={{ color: theme.text.muted }} />
                      <div style={{ color: theme.text.secondary }}>
                        <p className="text-lg font-medium" style={{ color: theme.text.primary }}>No products found</p>
                        <p className="text-sm">Products will appear here when transferred from warehouse</p>
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
                className="px-3 py-1 border rounded disabled:opacity-50"
                style={{ 
                  borderColor: theme.border.default,
                  color: theme.text.primary,
                  backgroundColor: theme.bg.secondary
                }}
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm" style={{ color: theme.text.secondary }}>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="px-3 py-1 border rounded disabled:opacity-50"
                style={{ 
                  borderColor: theme.border.default,
                  color: theme.text.primary,
                  backgroundColor: theme.bg.secondary
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="backdrop-blur-md rounded-xl shadow-2xl p-6 border w-96" style={{ 
            backgroundColor: theme.bg.card + 'F0', 
            borderColor: theme.border.default,
            boxShadow: `0 25px 50px ${theme.shadow}`
          }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Confirm Archive</h3>
            <p className="mb-4" style={{ color: theme.text.secondary }}>Are you sure you want to archive this product?</p>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 border rounded-md"
                style={{ 
                  borderColor: theme.border.default,
                  backgroundColor: theme.bg.secondary,
                  color: theme.text.primary
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="px-4 py-2 rounded-md disabled:opacity-50"
                style={{ 
                  backgroundColor: theme.colors.warning,
                  color: 'white'
                }}
              >
                {loading ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity History Modal */}
      {showQuantityHistoryModal && selectedProductForHistory && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-md rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border" 
               style={{ 
                 backgroundColor: theme.bg.card, 
                 borderColor: theme.border.default 
               }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.default }}>
              <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                Batch Details - {selectedProductForHistory.product_name}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={closeQuantityHistoryModal} 
                        style={{ color: theme.text.muted }}>
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Transfer Details Section */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3" style={{ color: theme.text.primary }}>Transfer Details</h4>
                <p className="text-sm mb-4" style={{ color: theme.text.secondary }}>Showing all transfers for this product</p>
                <div id="transferHistoryTable" className="min-h-[200px]">
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4" style={{ color: theme.text.muted }} />
                    <p style={{ color: theme.text.secondary }}>Loading transfer history...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PharmacyInventory; 