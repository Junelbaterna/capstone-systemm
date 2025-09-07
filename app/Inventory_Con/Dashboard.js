"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";

function Dashboard() {
  const { theme } = useTheme();
  const [selectedProduct, setSelectedProduct] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("Warehouse");
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouseData, setWarehouseData] = useState({
    totalProducts: 0,
    totalSuppliers: 0,
    storageCapacity: 0,
    warehouseValue: 0,
    lowStockItems: 0,
    expiringSoon: 0,
    totalBatches: 0,
    activeTransfers: 0
  });
  const [supplyByProduct, setSupplyByProduct] = useState([]);
  const [supplyByLocation, setSupplyByLocation] = useState([]);
  const [returnRateByProduct, setReturnRateByProduct] = useState([]);
  const [stockoutItems, setStockoutItems] = useState([]);
  const [productKPIs, setProductKPIs] = useState([]);
  const [warehouseStats, setWarehouseStats] = useState({
    totalProducts: 0,
    totalSuppliers: 0,
    storageCapacity: 75,
    warehouseValue: 0,
    lowStockItems: 0,
    expiringSoon: 0
  });
  const [loading, setLoading] = useState(true);

  // New chart data states
  const [topProductsByQuantity, setTopProductsByQuantity] = useState([]);
  const [stockDistributionByCategory, setStockDistributionByCategory] = useState([]);
  const [fastMovingItemsTrend, setFastMovingItemsTrend] = useState([]);
  const [criticalStockAlerts, setCriticalStockAlerts] = useState([]);
  const [inventoryByBranchCategory, setInventoryByBranchCategory] = useState([]);

  // Add new state for other modules' KPIs
  const [convenienceKPIs, setConvenienceKPIs] = useState({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
  const [pharmacyKPIs, setPharmacyKPIs] = useState({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
  const [transferKPIs, setTransferKPIs] = useState({ totalTransfers: 0, activeTransfers: 0 });

  // Fetch data from database
  useEffect(() => {
    fetchCategoriesAndLocations();
    fetchWarehouseData();
    fetchChartData();
    // Add new useEffect to fetch KPIs from all modules
    fetchConvenienceKPIs();
    fetchPharmacyKPIs();
    fetchTransferKPIs();
  }, [selectedProduct, selectedLocation]);

  const fetchCategoriesAndLocations = async () => {
    try {
      const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";
      
      // Fetch categories
      const categoriesResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_categories' })
      });
      const categoriesData = await categoriesResponse.json();
      if (categoriesData.success) {
        setCategories(categoriesData.data || []);
      }

      // Fetch locations
      const locationsResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_locations' })
      });
      const locationsData = await locationsResponse.json();
      if (locationsData.success) {
        setLocations(locationsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories and locations:', error);
    }
  };

  const fetchWarehouseData = async () => {
    try {
      setLoading(true);
      
      // API base URL
      const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";
      
      // Fetch warehouse-specific KPIs
      const warehouseResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_warehouse_kpis',
          product: selectedProduct,
          location: selectedLocation
        })
      });
      const warehouseData = await warehouseResponse.json();
      
      // Set warehouse data with fallback values
      setWarehouseData({
        totalProducts: warehouseData.totalProducts || 0,
        totalSuppliers: warehouseData.totalSuppliers || 0,
        storageCapacity: warehouseData.storageCapacity || 75,
        warehouseValue: warehouseData.warehouseValue || 0,
        lowStockItems: warehouseData.lowStockItems || 0,
        expiringSoon: warehouseData.expiringSoon || 0,
        totalBatches: warehouseData.totalBatches || 0,
        activeTransfers: warehouseData.activeTransfers || 0
      });

      // Fetch supply by product for warehouse
      try {
        const supplyProductResponse = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_warehouse_supply_by_product',
            product: selectedProduct,
            location: selectedLocation
          })
        });
        const supplyProductData = await supplyProductResponse.json();
        setSupplyByProduct(Array.isArray(supplyProductData) ? supplyProductData : []);
      } catch (error) {
        console.error('Error fetching supply by product:', error);
        setSupplyByProduct([]);
      }

      // Fetch supply by location for warehouse
      try {
        const supplyLocationResponse = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_warehouse_supply_by_location',
            product: selectedProduct,
            location: selectedLocation
          })
        });
        const supplyLocationData = await supplyLocationResponse.json();
        setSupplyByLocation(Array.isArray(supplyLocationData) ? supplyLocationData : []);
      } catch (error) {
        console.error('Error fetching supply by location:', error);
        setSupplyByLocation([]);
      }

      // Fetch warehouse stockout items
      try {
        const stockoutResponse = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_warehouse_stockout_items',
            product: selectedProduct,
            location: selectedLocation
          })
        });
        const stockoutData = await stockoutResponse.json();
        setStockoutItems(Array.isArray(stockoutData) ? stockoutData : []);
      } catch (error) {
        console.error('Error fetching stockout items:', error);
        setStockoutItems([]);
      }

      // Fetch warehouse product KPIs
      try {
        const productKPIsResponse = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_warehouse_product_kpis',
            product: selectedProduct,
            location: selectedLocation
          })
        });
        const productKPIsData = await productKPIsResponse.json();
        setProductKPIs(Array.isArray(productKPIsData) ? productKPIsData : []);
      } catch (error) {
        console.error('Error fetching product KPIs:', error);
        setProductKPIs([]);
      }

    } catch (error) {
      console.error('Error fetching warehouse data:', error);
      // Set empty data if API fails
      setEmptyData();
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";
      
      // Fetch top 10 products by quantity
      try {
        const topProductsResponse = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_top_products_by_quantity',
            product: selectedProduct,
            location: selectedLocation
          })
        });
        const topProductsData = await topProductsResponse.json();
        setTopProductsByQuantity(Array.isArray(topProductsData) ? topProductsData : []);
      } catch (error) {
        console.error('Error fetching top products:', error);
        setTopProductsByQuantity([]);
      }

      // Fetch stock distribution by category
      try {
        const categoryDistributionResponse = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_stock_distribution_by_category',
            product: selectedProduct,
            location: selectedLocation
          })
        });
        const categoryDistributionData = await categoryDistributionResponse.json();
        setStockDistributionByCategory(Array.isArray(categoryDistributionData) ? categoryDistributionData : []);
      } catch (error) {
        console.error('Error fetching category distribution:', error);
        setStockDistributionByCategory([]);
      }

      // Fetch fast-moving items trend
      try {
        const fastMovingResponse = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_fast_moving_items_trend',
            product: selectedProduct,
            location: selectedLocation
          })
        });
        const fastMovingData = await fastMovingResponse.json();
        setFastMovingItemsTrend(Array.isArray(fastMovingData) ? fastMovingData : []);
      } catch (error) {
        console.error('Error fetching fast moving items:', error);
        setFastMovingItemsTrend([]);
      }

      // Fetch critical stock alerts
      try {
        const criticalStockResponse = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_critical_stock_alerts',
            product: selectedProduct,
            location: selectedLocation
          })
        });
        const criticalStockData = await criticalStockResponse.json();
        setCriticalStockAlerts(Array.isArray(criticalStockData) ? criticalStockData : []);
      } catch (error) {
        console.error('Error fetching critical stock alerts:', error);
        setCriticalStockAlerts([]);
      }

      // Fetch inventory by branch and category
      try {
        const branchCategoryResponse = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_inventory_by_branch_category',
            product: selectedProduct,
            location: selectedLocation
          })
        });
        const branchCategoryData = await branchCategoryResponse.json();
        setInventoryByBranchCategory(Array.isArray(branchCategoryData) ? branchCategoryData : []);
      } catch (error) {
        console.error('Error fetching branch category data:', error);
        setInventoryByBranchCategory([]);
      }

    } catch (error) {
      console.error('Error in fetchChartData:', error);
    }
  };

  // Fetch Convenience Store KPIs
  const fetchConvenienceKPIs = async () => {
    try {
      // Get location ID for convenience store
      const locRes = await fetch("http://localhost/Enguio_Project/Api/backend.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_locations" })
      });
      const locData = await locRes.json();
      let locationId = null;
      if (locData.success && Array.isArray(locData.data)) {
        const loc = locData.data.find(l => l.location_name.toLowerCase().includes("convenience"));
        if (loc) locationId = loc.location_id;
      }
      if (!locationId) return;
      // Fetch products for convenience store
      const prodRes = await fetch("http://localhost/Enguio_Project/Api/backend.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_products_by_location_name", location_name: "convenience" })
      });
      const prodData = await prodRes.json();
      if (prodData.success && Array.isArray(prodData.data)) {
        const products = prodData.data;
        setConvenienceKPIs({
          totalProducts: products.length,
          lowStock: products.filter(p => p.stock_status === 'low stock').length,
          expiringSoon: products.filter(p => p.expiry_status === 'expiring soon').length
        });
      }
    } catch (e) { setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 }); }
  };

  // Fetch Pharmacy KPIs
  const fetchPharmacyKPIs = async () => {
    try {
      // Get location ID for pharmacy
      const locRes = await fetch("http://localhost/Enguio_Project/Api/backend.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_locations" })
      });
      const locData = await locRes.json();
      let locationId = null;
      if (locData.success && Array.isArray(locData.data)) {
        const loc = locData.data.find(l => l.location_name.toLowerCase().includes("pharmacy"));
        if (loc) locationId = loc.location_id;
      }
      if (!locationId) return;
      // Fetch products for pharmacy
      const prodRes = await fetch("http://localhost/Enguio_Project/Api/backend.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_products_by_location_name", location_name: "pharmacy" })
      });
      const prodData = await prodRes.json();
      if (prodData.success && Array.isArray(prodData.data)) {
        const products = prodData.data;
        setPharmacyKPIs({
          totalProducts: products.length,
          lowStock: products.filter(p => p.stock_status === 'low stock').length,
          expiringSoon: products.filter(p => p.expiry_status === 'expiring soon').length
        });
      }
    } catch (e) { setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 }); }
  };

  // Fetch Transfer KPIs
  const fetchTransferKPIs = async () => {
    try {
      const res = await fetch("http://localhost/Enguio_Project/Api/backend.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_transfers_with_details" })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTransferKPIs({
          totalTransfers: data.data.length,
          activeTransfers: data.data.filter(t => t.status === 'pending').length
        });
      }
    } catch (e) { setTransferKPIs({ totalTransfers: 0, activeTransfers: 0 }); }
  };

  const setEmptyData = () => {
    setWarehouseData({
      totalProducts: 0,
      totalSuppliers: 0,
      storageCapacity: 0,
      warehouseValue: 0,
      lowStockItems: 0,
      expiringSoon: 0,
      totalBatches: 0,
      activeTransfers: 0
    });

    setSupplyByProduct([]);
    setSupplyByLocation([]);
    setReturnRateByProduct([]);
    setStockoutItems([]);
    setProductKPIs([]);
  }; 

  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '₱0';
    }
    return '₱' + num.toLocaleString();
  };

  const formatPercentage = (num) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0.00%';
    }
    const numericValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numericValue)) {
      return '0.00%';
    }
    return numericValue.toFixed(2) + '%';
  };

  // Chart rendering functions
  const renderBarChart = (data, title) => {
    const maxValue = Math.max(...data.map(item => item.quantity || 0));
    
    return (
      <div className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="space-y-3">
          {data.slice(0, 10).map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="flex-1">
                <p className="text-sm truncate" style={{ color: theme.text.secondary }}>{item.product || 'Unknown Product'}</p>
              </div>
              <div className="flex-1">
                <div className="w-full rounded-full h-2" style={{ backgroundColor: theme.border.light }}>
                  <div 
                    className="h-2 rounded-full"
                    style={{ 
                      width: `${((item.quantity || 0) / maxValue) * 100}%`,
                      backgroundColor: theme.colors.accent
                    }}
                  ></div>
                </div>
              </div>
              <div className="text-xs w-16 text-right" style={{ color: theme.text.muted }}>
                {formatNumber(item.quantity || 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPieChart = (data, title) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    
    return (
      <div className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              {data.map((item, index) => {
                const percentage = (item.quantity / data.reduce((sum, d) => sum + d.quantity, 0)) * 100;
                const rotation = data.slice(0, index).reduce((sum, d) => sum + (d.quantity / data.reduce((total, dt) => total + dt.quantity, 0)) * 360, 0);
                
                return (
                  <div
                    key={index}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(${colors[index % colors.length]} ${rotation}deg, ${colors[index % colors.length]} ${rotation + (percentage * 3.6)}deg, transparent ${rotation + (percentage * 3.6)}deg)`
                    }}
                  ></div>
                );
              })}
              <div className="absolute inset-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bg.card }}>
                <span className="text-sm font-semibold" style={{ color: theme.text.secondary }}>Total</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <span className="text-sm" style={{ color: theme.text.secondary }}>{item.category}</span>
                <span className="text-xs ml-auto" style={{ color: theme.text.muted }}>{formatNumber(item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderLineChart = (data, title) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return (
      <div className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="h-64 flex items-end justify-between space-x-1">
          {months.map((month, index) => {
            const monthData = data.find(item => item.month === month) || { quantity: 0 };
            const maxValue = Math.max(...data.map(item => item.quantity || 0));
            const height = maxValue > 0 ? (monthData.quantity / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex flex-col items-center space-y-2">
                <div 
                  className="w-8 rounded-t"
                  style={{ 
                    height: `${height}%`,
                    backgroundColor: theme.colors.accent
                  }}
                ></div>
                <span className="text-xs" style={{ color: theme.text.muted }}>{month}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-1">
          {data.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.accent }}></div>
              <span className="text-xs" style={{ color: theme.text.secondary }}>{item.product}</span>
              <span className="text-xs ml-auto" style={{ color: theme.text.muted }}>{formatNumber(item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGauge = (data, title) => {
    const criticalLevel = data.length;
    const maxCritical = 20; // Maximum critical level
    const percentage = Math.min((criticalLevel / maxCritical) * 100, 100);
    
    return (
      <div className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full" style={{ backgroundColor: theme.border.light }}></div>
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                clipPath: `polygon(50% 50%, 50% 0%, ${50 + (percentage * 0.8)}% 0%, ${50 + (percentage * 0.8)}% 100%, 50% 100%)`,
                backgroundColor: percentage > 80 ? theme.colors.danger : percentage > 50 ? theme.colors.warning : theme.colors.success
              }}
            ></div>
            <div className="absolute inset-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bg.card }}>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: theme.text.primary }}>{criticalLevel}</div>
                <div className="text-xs" style={{ color: theme.text.muted }}>Critical</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          {data.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="truncate" style={{ color: theme.text.secondary }}>{item.product}</span>
              <span className="font-medium" style={{ color: theme.colors.danger }}>{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStackedColumn = (data, title) => {
    const categories = [...new Set(data.map(item => {
    // Handle both string and object category formats
    if (typeof item.category === 'string') {
      return item.category;
    } else if (item.category && typeof item.category === 'object' && item.category.category_name) {
      return item.category.category_name;
    }
    return null;
  }).filter(Boolean))];
    const locations = [...new Set(data.map(item => item.location))];
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
    
    return (
      <div className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="space-y-4">
          {locations.map((location, locIndex) => (
            <div key={locIndex} className="space-y-2">
              <div className="text-sm font-medium" style={{ color: theme.text.secondary }}>{location}</div>
              <div className="flex items-end space-x-1 h-20">
                {categories.map((category, catIndex) => {
                  const item = data.find(d => d.location === location && d.category === category);
                  const quantity = item ? item.quantity : 0;
                  const maxValue = Math.max(...data.map(d => d.quantity || 0));
                  const height = maxValue > 0 ? (quantity / maxValue) * 100 : 0;
                  
                  return (
                    <div key={catIndex} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full rounded-t"
                        style={{ 
                          height: `${height}%`,
                          backgroundColor: colors[catIndex % colors.length]
                        }}
                      ></div>
                      <span className="text-xs mt-1" style={{ color: theme.text.muted }}>{formatNumber(quantity)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category, index) => (
            <div key={index} className="flex items-center space-x-1">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-xs" style={{ color: theme.text.secondary }}>{typeof category === 'string' ? category : (category?.category_name || 'Unknown')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg.primary }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: theme.colors.accent }}></div>
          <p className="mt-4" style={{ color: theme.text.secondary }}>Loading warehouse data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: theme.colors.accent }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="border-b-2 pb-1" style={{ color: theme.text.primary, borderColor: theme.text.primary }}>Warehouse Overview</span>
              <span style={{ color: theme.text.secondary }}>Inventory Analytics</span>
              <span style={{ color: theme.text.secondary }}>Stock Reports</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Warehouse Management</h1>
          </div>
          <div className="flex space-x-4">
            <select 
              value={selectedProduct} 
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3 py-2 rounded border"
              style={{ 
                backgroundColor: theme.bg.card, 
                color: theme.text.primary,
                borderColor: theme.border.default
              }}
            >
              <option value="All">All Categories</option>
              {categories.map((category, index) => (
                <option key={index} value={typeof category === 'string' ? category : (category?.category_name || 'Unknown')}>
                  {typeof category === 'string' ? category : (category?.category_name || 'Unknown')}
                </option>
              ))}
            </select>
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 rounded border"
              style={{ 
                backgroundColor: theme.bg.card, 
                color: theme.text.primary,
                borderColor: theme.border.default
              }}
            >
              <option value="Warehouse">Warehouse</option>
              {locations.map((location, index) => (
                <option key={index} value={location.location_name}>
                  {location.location_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warehouse KPIs Section */}
      <div className="p-6 space-y-6">
        {/* Main Warehouse KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Total Products</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
              {formatNumber(warehouseData.totalProducts)}
            </p>
          </div>
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Total Suppliers</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.totalSuppliers)}</p>
          </div>
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Storage Capacity</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatPercentage(warehouseData.storageCapacity)}</p>
          </div>
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Warehouse Value</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatCurrency(warehouseData.warehouseValue)}</p>
          </div>
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Low Stock Items</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.lowStockItems)}</p>
          </div>
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Expiring Soon</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.expiringSoon)}</p>
          </div>
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Total Batches</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.totalBatches)}</p>
          </div>
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Active Transfers</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.activeTransfers)}</p>
          </div>
        </div>

        {/* Module KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Convenience Store KPIs */}
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Convenience Store - Total Products</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(convenienceKPIs.totalProducts)}</p>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Low Stock</p>
            <p className="text-xl font-bold" style={{ color: theme.colors.warning }}>{formatNumber(convenienceKPIs.lowStock)}</p>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Expiring Soon</p>
            <p className="text-xl font-bold" style={{ color: theme.colors.warning }}>{formatNumber(convenienceKPIs.expiringSoon)}</p>
          </div>
          {/* Pharmacy KPIs */}
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Pharmacy - Total Products</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(pharmacyKPIs.totalProducts)}</p>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Low Stock</p>
            <p className="text-xl font-bold" style={{ color: theme.colors.warning }}>{formatNumber(pharmacyKPIs.lowStock)}</p>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Expiring Soon</p>
            <p className="text-xl font-bold" style={{ color: theme.colors.warning }}>{formatNumber(pharmacyKPIs.expiringSoon)}</p>
          </div>
          {/* Transfer KPIs */}
          <div className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Total Transfers</p>
            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(transferKPIs.totalTransfers)}</p>
            <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Active Transfers</p>
            <p className="text-xl font-bold" style={{ color: theme.colors.accent }}>{formatNumber(transferKPIs.activeTransfers)}</p>
          </div>
        </div>

        {/* Charts Section - First Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Top 10 products by quantity */}
          {renderBarChart(topProductsByQuantity, "Top 10 Products by Quantity")}
          
          {/* Pie Chart - Stock distribution by category */}
          {renderPieChart(stockDistributionByCategory, "Stock Distribution by Category")}
        </div>

        {/* Charts Section - Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Line Chart - Stock trend of fast-moving items */}
          {renderLineChart(fastMovingItemsTrend, "Fast-Moving Items Trend")}
          
          {/* Gauge - Critical stock alerts */}
          {renderGauge(criticalStockAlerts, "Critical Stock Alerts")}
          
          {/* Stacked Column - Inventory by branch and category */}
          {renderStackedColumn(inventoryByBranchCategory, "Inventory by Branch & Category")}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Warehouse Stockout Items */}
          <div className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Warehouse Stockout Items</h3>
            <div className="h-80 flex items-end justify-between space-x-1">
              {Array.isArray(stockoutItems) && stockoutItems.map((item, index) => (
                <div key={index} className="flex flex-col items-center space-y-2">
                  <div 
                    className="w-8 rounded-t"
                    style={{ 
                      height: `${Math.abs(item.stockout || 0) / 20}px`,
                      backgroundColor: theme.colors.danger
                    }}
                  ></div>
                  <span className="text-xs rotate-45 transform origin-left" style={{ color: theme.text.muted }}>
                    {item.product && item.product.length > 12 ? item.product.substring(0, 12) + '...' : (item.product || 'Unknown')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Warehouse Products KPIs Table */}
          <div className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Warehouse Products KPIs</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.border.default}` }}>
                    <th className="text-left py-2" style={{ color: theme.text.primary }}>Product name</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Quantity</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Unit Price</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Total Value</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Supplier</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Batch</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(productKPIs) && productKPIs.map((item, index) => (
                    <tr key={index} style={{ borderBottom: `1px solid ${theme.border.light}` }}>
                      <td className="py-2" style={{ color: theme.text.primary }}>{item.product || 'Unknown Product'}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{item.quantity || 0}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{formatCurrency(item.unitPrice || 0)}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{item.supplier || 'N/A'}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{item.batch || 'N/A'}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{item.status || 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;