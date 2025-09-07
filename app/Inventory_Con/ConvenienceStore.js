"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Search,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Bell,
  BellRing,
} from "lucide-react";
import { FaArchive } from "react-icons/fa";
import { useTheme } from "./ThemeContext";
import { useSettings } from "./SettingsContext";
import NotificationSystem from "./NotificationSystem";

function ConvenienceInventory() {
  const { theme } = useTheme();
  const { settings, isProductExpiringSoon, isProductExpired, getExpiryStatus } = useSettings();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProductType, setSelectedProductType] = useState("all");
  const [convenienceLocationId, setConvenienceLocationId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState(null);
  const [batchData, setBatchData] = useState([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  
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
      return quantity > 0 && quantity <= settings.lowStockThreshold && settings.lowStockAlerts;
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

  // Load convenience store location ID
  const loadConvenienceLocation = async () => {
    try {
      const response = await handleApiCall("get_locations");
      if (response.success && Array.isArray(response.data)) {
        const convenienceLocation = response.data.find(loc => 
          loc.location_name.toLowerCase().includes('convenience')
        );
        if (convenienceLocation) {
          console.log("📍 Found convenience location:", convenienceLocation);
          setConvenienceLocationId(convenienceLocation.location_id);
          return convenienceLocation.location_id;
        } else {
          console.warn("⚠️ No convenience store location found");
        }
      }
    } catch (error) {
      console.error("Error loading convenience location:", error);
    }
    return null;
  };

  // Load products for convenience store
  const loadProducts = async () => {
    if (!convenienceLocationId) return;
    
    setLoading(true);
    try {
      console.log("🔄 Loading convenience store products...");
      
      // Try the location products API that includes transfer information
      const response = await handleApiCall("get_location_products", {
        location_id: convenienceLocationId,
        search: searchTerm,
        category: selectedCategory,
        product_type: selectedProductType
      });
      
      console.log("📦 API Response:", response);
      
      if (response.success && Array.isArray(response.data)) {
        console.log("✅ Loaded convenience store products:", response.data.length);
        // Filter out archived products
        const activeProducts = response.data.filter(
          (product) => (product.status || "").toLowerCase() !== "archived"
        );
        console.log("✅ Active convenience store products after filtering:", activeProducts.length);
        console.log("📋 Products:", activeProducts.map(p => `${p.product_name} (${p.quantity}) - ${p.product_type}`));
        setProducts(activeProducts);
        calculateNotifications(activeProducts);
      } else {
        console.warn("⚠️ Primary API failed, trying fallback...");
        // Fallback to the location name API
        const fallbackResponse = await handleApiCall("get_products_by_location_name", {
          location_name: "convenience"
        });
        
        if (fallbackResponse.success && Array.isArray(fallbackResponse.data)) {
          console.log("✅ Loaded convenience store products (fallback):", fallbackResponse.data.length);
          // Filter out archived products
          const activeProducts = fallbackResponse.data.filter(
            (product) => (product.status || "").toLowerCase() !== "archived"
          );
          console.log("✅ Active convenience store products after filtering (fallback):", activeProducts.length);
          setProducts(activeProducts);
          calculateNotifications(activeProducts);
        } else {
          console.warn("⚠️ No products found for convenience store");
          setProducts([]);
        }
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const locationId = await loadConvenienceLocation();
      if (locationId) {
        await loadProducts();
      }
    };
    initialize();
  }, [convenienceLocationId]);

  useEffect(() => {
    if (convenienceLocationId) {
      loadProducts();
    }
  }, [searchTerm, selectedCategory, selectedProductType, convenienceLocationId]);

  // Auto-refresh products every 15 seconds to catch new transfers and sales
  useEffect(() => {
    const interval = setInterval(() => {
      if (convenienceLocationId && !loading) {
        console.log("🔄 Auto-refreshing convenience store products...");
        const previousCount = products.length;
        const previousExpiringCount = notifications.expiring.length;
        
        loadProducts().then(() => {
          // Check if new products were added
          if (products.length > previousCount) {
            const newProducts = products.length - previousCount;
            toast.success(`🆕 ${newProducts} new product(s) transferred to convenience store!`);
          }
          
          // Check for new expiring products
          if (notifications.expiring.length > previousExpiringCount && settings.expiryAlerts) {
            const newExpiringProducts = notifications.expiring.length - previousExpiringCount;
            toast.warning(`⚠️ ${newExpiringProducts} product(s) expiring within ${settings.expiryWarningDays} days!`);
          }
        });
      }
    }, 15000); // 15 seconds - more frequent to catch POS sales

    return () => clearInterval(interval);
  }, [convenienceLocationId, loading, notifications.expiring.length, settings.expiryAlerts, settings.expiryWarningDays]);

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

  const getStatusColor = (status) => {
    switch (status) {
      case "in stock":
        return "text-green-600 bg-green-100";
      case "low stock":
        return "text-yellow-600 bg-yellow-100";
      case "out of stock":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
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
    
    setArchiveLoading(true);
    try {
      const response = await handleApiCall("delete_product", {
        product_id: selectedItem.product_id,
        reason: "Archived from convenience store inventory",
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
      setArchiveLoading(false);
    }
  };

  // Load batch data for a product
  const loadBatchData = async (productId) => {
    setLoadingBatch(true);
    try {
      // First try to get transfer details for this product
      const transferResponse = await handleApiCall("get_transferred_products_by_location", {
        location_id: convenienceLocationId,
        product_id: productId
      });
      
      if (transferResponse.success && Array.isArray(transferResponse.data)) {
        // Convert transfer data to batch format
        const batchDataFromTransfers = transferResponse.data.map(transfer => ({
          batch_id: transfer.transfer_header_id,
          batch_reference: `TR-${transfer.transfer_header_id}`,
          available_quantity: transfer.transferred_qty,
          unit_cost: transfer.unit_price || 0,
          srp: transfer.srp || 0,
          entry_date: transfer.created_at,
          source_location: transfer.source_location,
          destination_location: transfer.destination_location,
          transfer_date: transfer.delivery_date || transfer.created_at
        }));
        
        setBatchData(batchDataFromTransfers);
      } else {
        // Fallback to FIFO stock if no transfers found
        const fifoResponse = await handleApiCall("get_fifo_stock", {
          product_id: productId
        });
        
        if (fifoResponse.success && Array.isArray(fifoResponse.data)) {
          setBatchData(fifoResponse.data);
        } else {
          setBatchData([]);
        }
      }
    } catch (error) {
      console.error("Error loading batch data:", error);
      setBatchData([]);
    } finally {
      setLoadingBatch(false);
    }
  };

  // Open batch modal
  const openBatchModal = (product) => {
    setSelectedProductForBatch(product);
    setShowBatchModal(true);
    loadBatchData(product.product_id);
  };

  // Close batch modal
  const closeBatchModal = () => {
    setShowBatchModal(false);
    setSelectedProductForBatch(null);
    setBatchData([]);
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
          tableDiv.innerHTML = '<div class="text-center py-4 text-red-500">Error loading transfer history: ' + response.message + '</div>';
        }
      }
    } catch (error) {
      console.error("Error loading transfer history:", error);
      const tableDiv = document.getElementById('transferHistoryTable');
      if (tableDiv) {
        tableDiv.innerHTML = '<div class="text-center py-4 text-red-500">Error: ' + error.message + '</div>';
      }
    }
  };

  const displayTransferHistory = (transferLogs) => {
    const tableDiv = document.getElementById('transferHistoryTable');
    if (!tableDiv) return;
    
    console.log("Displaying transfer history:", transferLogs);
    
    if (!transferLogs || transferLogs.length === 0) {
      console.log("No transfer logs found");
      tableDiv.innerHTML = '<div class="text-center py-4 text-gray-500">No transfer history found for this product</div>';
      return;
    }

    let html = `
      <div class="mb-3">
        <span class="text-sm font-medium" style="color: ${theme.text.primary}">Total Transfers: ${transferLogs.length}</span>
        <span class="text-sm ml-2" style="color: ${theme.text.secondary}">(Showing all transfer movements with batch details)</span>
      </div>
    `;

    transferLogs.forEach((transfer, index) => {
      const transferDate = new Date(transfer.transfer_date).toLocaleDateString();
      const hasBatchDetails = transfer.batch_details && transfer.batch_details.length > 0;
      
      html += `
        <div class="mb-4 rounded-lg border" style="border-color: ${theme.border.default}; background-color: ${theme.bg.card}">
          <div class="p-4 border-b" style="border-color: ${theme.border.light}">
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-semibold" style="color: ${theme.text.primary}">Transfer #${transfer.transfer_id}</h4>
                <p class="text-sm" style="color: ${theme.text.secondary}">${transferDate} - ${transfer.product_name}</p>
              </div>
              <div class="text-right">
                <span class="inline-block px-3 py-1 text-sm font-medium rounded-full" style="background-color: ${theme.colors.info}20; color: ${theme.colors.info}">
                  ${transfer.quantity} units
                </span>
              </div>
            </div>
            <div class="flex gap-4 mt-2">
              <span class="inline-block px-2 py-1 text-xs font-medium rounded-full" style="background-color: ${theme.colors.danger}20; color: ${theme.colors.danger}">
                From: ${transfer.from_location}
              </span>
              <span class="inline-block px-2 py-1 text-xs font-medium rounded-full" style="background-color: ${theme.colors.success}20; color: ${theme.colors.success}">
                To: ${transfer.to_location}
              </span>
            </div>
          </div>
          
          ${hasBatchDetails ? `
            <div class="p-4">
              <h5 class="font-medium mb-3" style="color: ${theme.text.primary}">📦 Batch Details (${transfer.batch_details.length} batch${transfer.batch_details.length > 1 ? 'es' : ''})</h5>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr style="background-color: ${theme.bg.secondary}">
                      <th class="px-3 py-2 text-left font-medium" style="color: ${theme.text.secondary}">Batch #</th>
                      <th class="px-3 py-2 text-left font-medium" style="color: ${theme.text.secondary}">Reference</th>
                      <th class="px-3 py-2 text-center font-medium" style="color: ${theme.text.secondary}">Quantity</th>
                      <th class="px-3 py-2 text-center font-medium" style="color: ${theme.text.secondary}">Unit Cost</th>
                      <th class="px-3 py-2 text-center font-medium" style="color: ${theme.text.secondary}">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${transfer.batch_details.map((batch, batchIndex) => `
                      <tr style="border-bottom: 1px solid ${theme.border.light}">
                        <td class="px-3 py-2 font-mono" style="color: ${theme.text.primary}">${batch.batch_number || batch.batch_id || (batchIndex + 1)}</td>
                        <td class="px-3 py-2 font-mono text-xs" style="color: ${theme.text.primary}">${batch.batch_reference}</td>
                        <td class="px-3 py-2 text-center font-medium" style="color: ${theme.colors.primary}">${batch.batch_quantity} units</td>
                        <td class="px-3 py-2 text-center" style="color: ${theme.text.primary}">₱${Number.parseFloat(batch.unit_cost || 0).toFixed(2)}</td>
                        <td class="px-3 py-2 text-center" style="color: ${theme.text.primary}">
                          ${batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : `
            <div class="p-4 text-center" style="color: ${theme.text.muted}">
              <p class="text-sm">No batch details available for this transfer</p>
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

  const categories = [...new Set(products.map(p => {
    // Handle both string and object category formats
    if (typeof p.category === 'string') {
      return p.category;
    } else if (p.category && typeof p.category === 'object' && p.category.category_name) {
      return p.category.category_name;
    }
    return null;
  }).filter(Boolean))];

  // --- Dashboard Statistics Calculation ---
  // Calculate total store value
  const totalStoreValue = products.reduce(
    (sum, p) => sum + (Number(p.unit_price || 0) * Number(p.quantity || 0)),
    0
  );
  // For demo, use static percentage changes
  const percentChangeProducts = 3; // +3% from last month
  const percentChangeValue = 1; // +1% from last month
  // Low stock count
  const lowStockCount = products.filter(p => p.stock_status === 'low stock').length;

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Increased from 10 to show more products
  const paginatedProducts = products.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(products.length / itemsPerPage);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: theme.bg.primary }}>
      <NotificationSystem products={products} />
      {/* Header */}
      <div className="w-full p-6 pb-4">
        <div className="flex items-center text-sm mb-2" style={{ color: theme.text.secondary }}>
          <span>Inventory Management</span>
          <div className="mx-2">{">"}</div>
          <span style={{ color: theme.colors.accent }}>Convenience Store</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.text.primary }}>Convenience Store Inventory</h1>
            <p style={{ color: theme.text.secondary }}>Manage convenience store products and transfers</p>
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
                            {Math.ceil((new Date(product.expiration) - new Date()) / (1000 * 60 * 60 * 24))} days (Alert: {settings.expiryWarningDays}d)
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
      </div>

      {/* Dashboard Cards */}
      <div className="w-full px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Store Products */}
          <div className="rounded-xl shadow-md p-6 flex justify-between items-center min-h-[110px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: theme.text.muted }}>STORE PRODUCTS</div>
              <div className="text-4xl font-bold" style={{ color: theme.text.primary }}>{products.length}</div>
              <div className="text-xs mt-2" style={{ color: theme.text.secondary }}>+{percentChangeProducts}% from last month</div>
            </div>
            <div>
              <Package className="h-10 w-10" style={{ color: theme.colors.accent }} />
            </div>
          </div>
          {/* Low Stock Items */}
          <div className="rounded-xl shadow-md p-6 flex justify-between items-center min-h-[110px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: theme.text.muted }}>LOW STOCK ITEMS</div>
              <div className="text-4xl font-bold" style={{ color: theme.text.primary }}>{lowStockCount}</div>
              <div className="text-xs mt-2" style={{ color: theme.text.secondary }}>items below threshold</div>
            </div>
            <div>
              <AlertCircle className="h-10 w-10" style={{ color: theme.colors.danger }} />
            </div>
          </div>
          {/* Store Value */}
          <div className="rounded-xl shadow-md p-6 flex justify-between items-center min-h-[110px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: theme.text.muted }}>STORE VALUE</div>
              <div className="text-4xl font-bold" style={{ color: theme.text.primary }}>₱{totalStoreValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</div>
              <div className="text-xs mt-2" style={{ color: theme.text.secondary }}>+{percentChangeValue}% from last month</div>
            </div>
            <div>
              <Package className="h-10 w-10" style={{ color: theme.colors.warning }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="w-full px-6 pb-4">
        <div className="rounded-3xl shadow-xl p-6 mb-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: theme.text.muted }} />
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
            <div className="w-full md:w-48">
              <select
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: theme.bg.secondary, 
                  backgroundColor: theme.bg.secondary,
                  color: theme.text.primary,
                  focusRingColor: theme.colors.accent
                }}
              >
                <option value="all">All Types</option>
                <option value="Regular">Direct Stock Only</option>
                <option value="Transferred">Transferred Only</option>
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="w-full px-6 pb-6">
        <div className="rounded-3xl shadow-xl w-full" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: theme.border.default }}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold" style={{ color: theme.text.primary }}>Store Products</h3>
              <div className="flex items-center gap-4">
                <div className="text-sm" style={{ color: theme.text.secondary }}>
                  {products.length} products found
                </div>
                {products.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.success }}></div>
                      <span style={{ color: theme.text.secondary }}>
                        {products.filter(p => p.product_type === 'Regular').length} Direct Stock
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.accent }}></div>
                      <span style={{ color: theme.text.secondary }}>
                        {products.filter(p => p.product_type === 'Transferred').length} Transferred
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto w-full">
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
                  TRANSFER DETAILS
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.light }}>
              {loading ? (
                <tr>
                  <td colSpan={17} className="px-6 py-4 text-center" style={{ color: theme.text.secondary }}>
                    Loading products...
                  </td>
                </tr>
              ) : paginatedProducts.length > 0 ? (
                paginatedProducts.map((product, index) => (
                  <tr key={`${product.product_id}-${index}`} className="hover:bg-opacity-50" style={{ backgroundColor: 'transparent', hoverBackgroundColor: theme.bg.hover }}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium" style={{ color: theme.text.primary }}>
                        {product.product_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>
                        {product.brand || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary }}>
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div>
                          <div className="font-semibold" style={{ color: theme.text.primary }}>{product.quantity || 0}</div>
                          <div className="text-sm" style={{ color: theme.text.secondary }}>units</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                        ₱{Number.parseFloat(product.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>
                        {product.supplier_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          #{product.fifo_order || 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono" style={{ color: theme.text.primary }}>
                        {product.barcode}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>
                        <div>
                          <div className="font-medium">{product.batch_reference || <span className="text-gray-400 italic">None</span>}</div>
                          {product.entry_by && (
                            <div className="text-xs" style={{ color: theme.text.secondary }}>by {product.entry_by}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                        {product.batch_date_time && product.batch_date_time !== 'N/A' ? (
                          new Date(product.batch_date_time).toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            year: '2-digit' 
                          })
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                        {product.date_added ? new Date(product.date_added).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : <span className="text-gray-400 italic">N/A</span>}
                      </td>
                      <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                        {product.batch_date_time && product.batch_date_time !== 'N/A' ? (
                          new Date(product.batch_date_time).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            hour12: true 
                          })
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {product.expiration ? (
                          (() => {
                            const expiryStatus = getExpiryStatus(product.expiration);
                            const colorClasses = {
                              'expired': 'bg-red-100 text-red-700',
                              'critical': 'bg-red-100 text-red-700',
                              'warning': 'bg-yellow-100 text-yellow-700',
                              'good': 'bg-green-100 text-green-700',
                              'no-expiry': 'bg-gray-100 text-gray-700'
                            };
                            return (
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${colorClasses[expiryStatus.status]}`}>
                                {expiryStatus.status === 'expired' ? `Expired ${expiryStatus.days}d ago` : `${expiryStatus.days} days`}
                                {expiryStatus.status === 'warning' && (
                                  <span className="ml-1 text-xs">⚠️</span>
                                )}
                                {expiryStatus.status === 'critical' && (
                                  <span className="ml-1 text-xs">🚨</span>
                                )}
                              </span>
                            );
                          })()
                        ) : <span className="text-gray-400 italic">N/A</span>}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        ₱{Number.parseFloat(product.unit_cost || product.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                           product.stock_status === "in stock"
                             ? "bg-green-100 text-green-800"
                             : product.stock_status === "low stock"
                               ? "bg-yellow-100 text-yellow-800"
                               : product.stock_status === "out of stock"
                                 ? "bg-red-100 text-red-800"
                                 : "bg-gray-100 text-gray-800"
                         }`}>
                           {product.stock_status || "unknown"}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-center">
                         {product.product_type === 'Transferred' ? (
                           <div className="text-xs" style={{ color: theme.text.secondary }}>
                             <div className="font-semibold" style={{ color: theme.colors.info }}>From: {product.source_location}</div>
                             <div>By: {product.transferred_by}</div>
                             <div>{new Date(product.transfer_date).toLocaleDateString()}</div>
                             <div className="mt-1">
                               <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                 Transferred
                               </span>
                             </div>
                           </div>
                         ) : (
                           <div className="text-xs" style={{ color: theme.text.secondary }}>
                             <div className="font-semibold" style={{ color: theme.colors.success }}>From: {product.source_location || 'Warehouse'}</div>
                             <div className="mt-1">
                               <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                 Direct Stock
                               </span>
                             </div>
                           </div>
                         )}
                       </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => openBatchModal(product)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Batches"
                          >
                            <Package className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => openQuantityHistoryModal(product)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="View Transfer History"
                          >
                            <Truck className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => openDeleteModal(product)}
                            className="text-red-600 hover:text-red-900 p-1"
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
                    <td colSpan={17} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <Package className="h-12 w-12 text-gray-300" />
                        <div className="text-gray-500">
                          <p className="text-lg font-medium">No products found</p>
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
          {totalPages > 1 && (
            <div className="flex justify-center mt-4 pb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-6 border border-gray-200/50 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Archive</h3>
            <p className="text-gray-700 mb-4">Are you sure you want to archive this product?</p>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md disabled:opacity-50"
              >
                {archiveLoading ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Details Modal */}
      {showBatchModal && selectedProductForBatch && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-200/50 w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Batch Details</h3>
                <p className="text-gray-600 mt-1">
                  {selectedProductForBatch.product_name} - {selectedProductForBatch.barcode}
                </p>
              </div>
              <button
                onClick={closeBatchModal}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Product Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900">Total Stock</h4>
                <p className="text-2xl font-bold text-blue-700">
                  {selectedProductForBatch.quantity || 0} units
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900">Unit Cost</h4>
                <p className="text-2xl font-bold text-green-700">
                  ₱{Number.parseFloat(selectedProductForBatch.unit_cost || selectedProductForBatch.unit_price || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-900">SRP</h4>
                <p className="text-2xl font-bold text-orange-700">
                  ₱{Number.parseFloat(selectedProductForBatch.srp || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Transfer Details Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Transfer Details</h4>
                <p className="text-sm text-gray-600">Showing all transfers for this product</p>
              </div>
             
              {loadingBatch ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading batch data...</p>
                </div>
              ) : batchData.length > 0 ? (
                <div className="overflow-x-auto w-full">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transfer ID
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity Transferred
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Cost
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SRP
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transfer Date
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          From Location
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batchData.map((batch, index) => (
                        <tr key={batch.batch_id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {batch.batch_reference || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {batch.available_quantity || 0} units
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">
                            ₱{Number.parseFloat(batch.unit_cost || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">
                            ₱{Number.parseFloat(batch.srp || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">
                            {batch.transfer_date ? new Date(batch.transfer_date).toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit', 
                              year: '2-digit' 
                            }) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-900">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {batch.source_location || 'Warehouse'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium">No batch data found</p>
                  <p className="text-sm">This product may not have batch information</p>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Batches:</span>
                  <span className="ml-2 font-semibold">{batchData.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Available:</span>
                  <span className="ml-2 font-semibold">
                    {batchData.reduce((sum, batch) => sum + (batch.available_quantity || 0), 0)} units
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Active Batches:</span>
                  <span className="ml-2 font-semibold">
                    {batchData.filter(batch => (batch.available_quantity || 0) > 0).length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Consumed Batches:</span>
                  <span className="ml-2 font-semibold">
                    {batchData.filter(batch => (batch.available_quantity || 0) <= 0).length}
                  </span>
                </div>
              </div>
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
                        style={{ color: theme.text.muted }}
                        onMouseEnter={(e) => e.target.style.color = theme.text.secondary}
                        onMouseLeave={(e) => e.target.style.color = theme.text.muted}>
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg border" 
                     style={{ 
                       backgroundColor: theme.colors.info + '20', 
                       borderColor: theme.colors.info + '40' 
                     }}>
                  <h4 className="font-semibold" style={{ color: theme.colors.info }}>Product Info</h4>
                  <p className="text-sm" style={{ color: theme.text.primary }}>Name: {selectedProductForHistory.product_name}</p>
                  <p className="text-sm" style={{ color: theme.text.primary }}>Category: {selectedProductForHistory.category}</p>
                  <p className="text-sm" style={{ color: theme.text.primary }}>
                    Current Stock: {
                      fifoStockData && fifoStockData.length > 0 
                        ? fifoStockData.reduce((sum, batch) => sum + (batch.available_quantity || 0), 0)
                        : selectedProductForHistory.quantity || 0
                    }
                  </p>
                </div>
                <div className="p-4 rounded-lg border" 
                     style={{ 
                       backgroundColor: theme.colors.success + '20', 
                       borderColor: theme.colors.success + '40' 
                     }}>
                  <h4 className="font-semibold" style={{ color: theme.colors.success }}>Stock Status</h4>
                  <p className="text-sm" style={{ color: theme.text.primary }}>
                    Status: {
                      (() => {
                        const currentStock = fifoStockData && fifoStockData.length > 0 
                          ? fifoStockData.reduce((sum, batch) => sum + (batch.available_quantity || 0), 0)
                          : selectedProductForHistory.quantity || 0;
                        
                        if (currentStock <= 0) return 'out of stock';
                        if (currentStock <= 10) return 'low stock';
                        return 'in stock';
                      })()
                    }
                  </p>
                  <p className="text-sm" style={{ color: theme.text.primary }}>SRP: ₱{Number.parseFloat(selectedProductForHistory.srp || 0).toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-lg border" 
                     style={{ 
                       backgroundColor: theme.colors.accent + '20', 
                       borderColor: theme.colors.accent + '40' 
                     }}>
                  <h4 className="font-semibold" style={{ color: theme.colors.accent }}>History Summary</h4>
                  <p className="text-sm" style={{ color: theme.text.primary }}>Total Movements: {quantityHistoryData.length}</p>
                  <p className="text-sm" style={{ color: theme.text.primary }}>Last Updated: {quantityHistoryData.length > 0 ? new Date(quantityHistoryData[0].movement_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="p-4 rounded-lg border" 
                     style={{ 
                       backgroundColor: theme.colors.warning + '20', 
                       borderColor: theme.colors.warning + '40' 
                     }}>
                  <h4 className="font-semibold" style={{ color: theme.colors.warning }}>FIFO Batches</h4>
                  <p className="text-sm" style={{ color: theme.text.primary }}>
                    Active Batches: {
                      fifoStockData && fifoStockData.length > 0 
                        ? fifoStockData.filter(batch => (batch.available_quantity || 0) > 0).length
                        : 0
                    }
                  </p>
                  <p className="text-sm" style={{ color: theme.text.primary }}>
                    Total Available: {
                      fifoStockData && fifoStockData.length > 0 
                        ? fifoStockData.reduce((sum, batch) => sum + (batch.available_quantity || 0), 0)
                        : 0
                    } units
                  </p>
                </div>
              </div>

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

              {/* Current FIFO Batches Table */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: theme.text.primary }}>Current FIFO Batches</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border" 
                         style={{ 
                           color: theme.text.primary,
                           borderColor: theme.border.default 
                         }}>
                    <thead>
                      <tr style={{ backgroundColor: theme.bg.hover }}>
                        <th className="border px-3 py-2 text-left text-sm font-semibold" 
                            style={{ 
                              borderColor: theme.border.default,
                              color: theme.text.primary 
                            }}>Batch Number</th>
                        <th className="border px-3 py-2 text-left text-sm font-semibold" 
                            style={{ 
                              borderColor: theme.border.default,
                              color: theme.text.primary 
                            }}>Date Added</th>
                        <th className="border px-3 py-2 text-left text-sm font-semibold" 
                            style={{ 
                              borderColor: theme.border.default,
                              color: theme.text.primary 
                            }}>Expiry Date</th>
                        <th className="border px-3 py-2 text-left text-sm font-semibold" 
                            style={{ 
                              borderColor: theme.border.default,
                              color: theme.text.primary 
                            }}>Available Qty</th>
                        <th className="border px-3 py-2 text-left text-sm font-semibold" 
                            style={{ 
                              borderColor: theme.border.default,
                              color: theme.text.primary 
                            }}>Unit Cost</th>
                        <th className="border px-3 py-2 text-left text-sm font-semibold" 
                            style={{ 
                              borderColor: theme.border.default,
                              color: theme.text.primary 
                            }}>SRP</th>
                        <th className="border px-3 py-2 text-left text-sm font-semibold" 
                            style={{ 
                              borderColor: theme.border.default,
                              color: theme.text.primary 
                            }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fifoStockData && fifoStockData.length > 0 ? (
                        fifoStockData.map((batch, index) => (
                          <tr key={batch.fifo_id || index} style={{ borderBottom: `1px solid ${theme.border.light}` }}>
                            <td className="border px-3 py-2 font-mono text-sm" style={{ borderColor: theme.border.default, color: theme.text.primary }}>
                              {batch.batch_number || batch.batch_id || index + 1}
                            </td>
                            <td className="border px-3 py-2 text-sm" style={{ borderColor: theme.border.default, color: theme.text.primary }}>
                              {batch.entry_date ? new Date(batch.entry_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="border px-3 py-2 text-sm" style={{ borderColor: theme.border.default, color: theme.text.primary }}>
                              {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="border px-3 py-2 text-center" style={{ borderColor: theme.border.default }}>
                              <span className="inline-block px-2 py-1 text-xs font-medium rounded-full" style={{
                                backgroundColor: batch.available_quantity <= 0 ? theme.colors.danger + '20' :
                                               batch.available_quantity <= 10 ? theme.colors.warning + '20' :
                                               theme.colors.success + '20',
                                color: batch.available_quantity <= 0 ? theme.colors.danger :
                                       batch.available_quantity <= 10 ? theme.colors.warning :
                                       theme.colors.success
                              }}>
                                {batch.available_quantity || 0}
                              </span>
                            </td>
                            <td className="border px-3 py-2 text-sm" style={{ borderColor: theme.border.default, color: theme.text.primary }}>
                              ₱{Number.parseFloat(batch.unit_cost || 0).toFixed(2)}
                            </td>
                            <td className="border px-3 py-2 text-sm" style={{ borderColor: theme.border.default, color: theme.text.primary }}>
                              ₱{Number.parseFloat(batch.srp || 0).toFixed(2)}
                            </td>
                            <td className="border px-3 py-2 text-sm" style={{ borderColor: theme.border.default, color: theme.text.primary }}>
                              {batch.status || 'active'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="border px-3 py-2 text-center" 
                              style={{ 
                                borderColor: theme.border.default,
                                color: theme.text.secondary 
                              }}>
                            No FIFO batches available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConvenienceInventory;
