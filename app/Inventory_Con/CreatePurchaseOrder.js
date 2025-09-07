"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaPlus, 
  FaTrash, 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaTruck, 
  FaBox, 
  FaFileAlt,
  FaCalendar,
  FaUser,
  FaBuilding
} from "react-icons/fa";
import { 
  ShoppingCart, 
  FileText, 
  Package, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Building,
} from "lucide-react";

// Define API base URLs at the top of the file
const API_BASE_SIMPLE = "http://localhost/Enguio_Project/Api/purchase_order_api_simple.php";
const API_BASE = "http://localhost/Enguio_Project/Api/purchase_order_api.php";

function CreatePurchaseOrder() {
  // Tab stateasy
  const [activeTab, setActiveTab] = useState('create');
  
  // Create Purchase Order states
  const [formData, setFormData] = useState({
    supplier: "",
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: "",
    notes: ""
  });
     const [selectedProducts, setSelectedProducts] = useState([]);
   const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState({ emp_id: 21 }); // Mock user ID

  // Purchase Order List states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poLoading, setPoLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [poFilter, setPoFilter] = useState('delivered');
  // Removed 3-dots status menu; using inline dynamic action instead

  // Compute the next actionable step for a PO based on its current status
  const getNextPoAction = (po) => {
    if (!po) return null;
    const poId = po.purchase_header_id;
    
    // delivered -> approve (if all items complete) or request missing items
    if (po.status === 'delivered') {
      return {
        label: 'Approve',
        onClick: () => updatePOStatus(poId, 'approved')
      };
    }
    // partial_delivery -> update delivery when missing items arrive
    if (po.status === 'partial_delivery') {
      return {
        label: 'Update Delivery',
        onClick: () => handleUpdatePartialDelivery(poId)
      };
    }
    // complete -> approve
    if (po.status === 'complete') {
      return {
        label: 'Approve',
        onClick: () => updatePOStatus(poId, 'approved')
      };
    }
    // No further automatic action
    return null;
  };

  // Removed Escape handler previously used for 3-dots menu

  // Receive Items states
  const [receivingList, setReceivingList] = useState([]);
  const [receiveLoading, setReceiveLoading] = useState(true);
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [receiveFormData, setReceiveFormData] = useState({
    delivery_receipt_no: "",
    notes: "",
    items: []
  });



  // Receive Items states
  const [showReceiveItemsForm, setShowReceiveItemsForm] = useState(false);
  const [selectedPOForReceive, setSelectedPOForReceive] = useState(null);
  const [receiveItemsFormData, setReceiveItemsFormData] = useState({});

  // Partial Delivery Management states
  const [showPartialDeliveryForm, setShowPartialDeliveryForm] = useState(false);
  const [selectedPOForPartialDelivery, setSelectedPOForPartialDelivery] = useState(null);
  const [partialDeliveryFormData, setPartialDeliveryFormData] = useState({
    items: []
  });

     useEffect(() => {
     if (activeTab === 'create') {
       fetchSuppliers();
     } else if (activeTab === 'list') {
       fetchPurchaseOrders(poFilter);
     } else if (activeTab === 'receive') {
       fetchReceivingList();
     }
   }, [activeTab, poFilter]);

     // No dropdown functionality needed

  // Debug: Monitor selectedProducts changes
  useEffect(() => {
    console.log('selectedProducts changed:', selectedProducts);
  }, [selectedProducts]);

  // Create Purchase Order functions
  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${API_BASE_SIMPLE}?action=suppliers`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.data || []);
      } else {
        console.warn('No suppliers found or error loading suppliers');
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
      if (error.message.includes('Failed to fetch')) {
        toast.error('Cannot connect to server. Please check if the backend is running.');
      }
    }
  };

  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

     const addProduct = () => {
     const newProduct = {
       id: Date.now(),
       searchTerm: "",
       quantity: 1,
       unitType: "pieces" // Default to pieces
     };
     setSelectedProducts([...selectedProducts, newProduct]);
   };

  const removeProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const safeNumber = (val) => {
    const num = typeof val === 'string' && val.trim() === '' ? 0 : Number(val);
    return Number.isNaN(num) ? 0 : num;
  };

  const updateProduct = (index, field, value) => {
    console.log('updateProduct called:', { index, field, value }); // Debug log
    const updatedProducts = [...selectedProducts];
    let safeValue = value;

    if (field === 'quantity') {
      safeValue = safeNumber(value);
    }

    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: safeValue
    };

    // Total calculation removed as requested

         // No complex logic needed - just update the field

    setSelectedProducts(updatedProducts);
  };

  // Total calculation removed as requested

  // Payment method functionality removed as requested

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplier) {
      toast.error("Please select a supplier");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

         // Validate that each product has searchTerm and quantity
     for (let i = 0; i < selectedProducts.length; i++) {
       const product = selectedProducts[i];
       if (!product.searchTerm) {
         toast.error(`Product ${i + 1}: Please enter a product name`);
         return;
       }
       if (!product.quantity || product.quantity <= 0) {
         toast.error(`Product ${i + 1}: Please enter a valid quantity`);
         return;
       }
     }



    setLoading(true);

    try {
                   const purchaseOrderData = {
         supplier_id: parseInt(formData.supplier),
         expected_delivery_date: formData.expectedDelivery,
         created_by: currentUser.emp_id,
         products: selectedProducts.map(product => ({
           searchTerm: product.searchTerm,
           quantity: parseInt(product.quantity),
           unit_type: product.unitType
         }))
       };

      const response = await fetch(`${API_BASE_SIMPLE}?action=create_purchase_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseOrderData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Purchase Order ${result.po_number} created successfully!`);
        
        // Reset form
        setFormData({
          supplier: "",
          orderDate: new Date().toISOString().split('T')[0],
          expectedDelivery: "",
          notes: ""
        });
        setSelectedProducts([]);
      } else {
        toast.error(result.error || "Error creating purchase order");
      }
      
    } catch (error) {
      toast.error("Error creating purchase order");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Purchase Order List functions
  const fetchPurchaseOrders = async (status = null) => {
    try {
      let url = `${API_BASE_SIMPLE}?action=purchase_orders`;
      if (status) {
        url += `&status=${status}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setPurchaseOrders(data.data);
      } else {
        toast.error('Failed to load purchase orders');
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Error loading purchase orders');
    } finally {
      setPoLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      // New partial delivery status system
      delivered: { color: 'bg-green-100 text-green-800', text: 'Delivered' },
      partial_delivery: { color: 'bg-orange-100 text-orange-800', text: 'Partial Delivery' },
      complete: { color: 'bg-blue-100 text-blue-800', text: 'Complete' },
      approved: { color: 'bg-purple-100 text-purple-800', text: 'Approved' },
      return: { color: 'bg-red-100 text-red-800', text: 'Return' },
    };
    
    const config = statusConfig[status] || { color: 'bg-green-100 text-green-800', text: 'Delivered' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getDeliveryStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      'in_transit': { color: 'bg-blue-100 text-blue-800', text: 'To ship' },
      'delivered': { color: 'bg-green-100 text-green-800', text: 'Shipped' },
      'partial': { color: 'bg-orange-100 text-orange-800', text: 'Partial' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // Normalize orders and get counts for all statuses
  const [allPurchaseOrders, setAllPurchaseOrders] = useState([]);
  
  // Fetch all purchase orders for counting (without status filter)
  const fetchAllPurchaseOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_orders`);
      const data = await response.json();
      if (data.success) {
        setAllPurchaseOrders(data.data);
      }
    } catch (error) {
      console.error('Error fetching all purchase orders:', error);
    }
  };

  // Optimistically remove a PO from the current list view
  const removePoFromList = (poId) => {
    setPurchaseOrders((prev) => prev.filter((p) => p.purchase_header_id !== poId));
  };

  // Fetch all orders when component mounts to get counts
  useEffect(() => {
    fetchAllPurchaseOrders();
  }, []);

  const normalizedOrders = useMemo(() => {
    const seen = new Set();
    const rows = [];
    for (const po of allPurchaseOrders || []) {
      if (seen.has(po.purchase_header_id)) continue;
      seen.add(po.purchase_header_id);
      rows.push({
        ...po,
        delivery_status: po.delivery_status || 'pending',
        status: po.status || 'delivered',
      });
    }
    return rows;
  }, [allPurchaseOrders]);

  // Use the filtered purchase orders from API
  const filteredPurchaseOrders = useMemo(() => {
    const seen = new Set();
    const rows = [];
    for (const po of purchaseOrders || []) {
      if (seen.has(po.purchase_header_id)) continue;
      seen.add(po.purchase_header_id);
      rows.push({
        ...po,
        delivery_status: po.delivery_status || 'pending',
        status: po.status || 'delivered',
      });
    }
    return rows;
  }, [purchaseOrders]);

  const poCounts = useMemo(() => {
    const counts = {
      delivered: normalizedOrders.filter((po) => po.status === 'delivered').length,
      partial_delivery: normalizedOrders.filter((po) => po.status === 'partial_delivery').length,
      complete: normalizedOrders.filter((po) => po.status === 'complete').length,
      approved: normalizedOrders.filter((po) => po.status === 'approved').length,
      return: normalizedOrders.filter((po) => po.status === 'return').length,
    };
    return counts;
  }, [normalizedOrders]);

  // Removed activeMenuPO memo (no 3-dots menu)

  const updatePOStatus = async (poId, nextStatus) => {
    try {
      const requestBody = { 
        purchase_header_id: poId, 
        status: nextStatus 
      };
      
      // Add approval details if status is 'approved'
      if (nextStatus === 'approved') {
        requestBody.approved_by = 21; // Default user ID - you can get this from user context
        requestBody.approval_notes = 'Purchase order approved via frontend';
      }
      
      const response = await fetch(`${API_BASE_SIMPLE}?action=update_po_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Status updated successfully');
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (e) {
      console.error('Update status error:', e);
      toast.error('Error updating status');
    } finally {
      // no-op; 3-dots menu removed
    }
  };

  const handleApprove = async (poId, action) => {
    try {
      const response = await fetch(`${API_BASE_SIMPLE}?action=approve_purchase_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_header_id: poId,
          approved_by: currentUser.emp_id,
          approval_status: action,
          approval_notes: action === 'approved' ? 'Approved by admin' : 'Rejected by admin'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Purchase Order ${action === 'approved' ? 'approved' : 'rejected'} successfully!`);
        fetchPurchaseOrders(); // Refresh the list
      } else {
        toast.error(result.error || `Error ${action}ing purchase order`);
      }
    } catch (error) {
      toast.error(`Error ${action}ing purchase order`);
      console.error('Error:', error);
    }
  };

  const handleUpdateDelivery = async (poId, status) => {
    try {
      const response = await fetch(`${API_BASE_SIMPLE}?action=update_delivery_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_header_id: poId,
          delivery_status: status,
          actual_delivery_date: status === 'delivered' ? new Date().toISOString().split('T')[0] : null
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Delivery status updated to ${status}!`);
        fetchPurchaseOrders(); // Refresh the list
      } else {
        toast.error(result.error || 'Error updating delivery status');
      }
    } catch (error) {
      toast.error('Error updating delivery status');
      console.error('Error:', error);
    }
  };

  const viewDetails = async (poId) => {
    try {
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedPO(data);
        setShowDetails(true);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Error loading purchase order details');
    }
  };

  // Receive Items functions
  const fetchReceivingList = async () => {
    try {
      const response = await fetch(`${API_BASE_SIMPLE}?action=receiving_list`);
      const data = await response.json();
      if (data.success) {
        setReceivingList(data.data);
      } else {
        toast.error('Failed to load receiving list');
      }
    } catch (error) {
      console.error('Error fetching receiving list:', error);
      toast.error('Error loading receiving list');
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleReceive = async (poId) => {
    const mapItems = (details = []) =>
      details.map((detail) => ({
        purchase_dtl_id: detail.purchase_dtl_id,
        product_id: detail.product_id,
        product_name: detail.product_name,
        ordered_qty: Number(detail.quantity) || 0,
        received_qty: Number(detail.quantity) || 0
      }));

    try {
      // Try the simple API first
      let response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
      let data = await response.json();

      if (!data?.success) {
        // Fallback to full API if simple fails
        response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
        data = await response.json();
      }

      if (data?.success) {
        const normalizedDetails = (data.details || []).map((d) => ({
          ...d,
          product_name: d.product_name || d.item_name || d.name || d.searchTerm || d.product || 'Unknown Item'
        }));
        setSelectedPO({ ...data, details: normalizedDetails });
        setReceiveFormData({
          delivery_receipt_no: "",
          notes: "",
          items: mapItems(normalizedDetails),
        });
        setShowReceiveForm(true);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Error loading purchase order details');
    }
  };

  const handleReceiveInputChange = (e) => {
    const { name, value } = e.target;
    setReceiveFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...receiveFormData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setReceiveFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleSubmitReceive = async (e) => {
    e.preventDefault();
    
    if (!receiveFormData.delivery_receipt_no.trim()) {
      toast.error("Please enter delivery receipt number");
      return;
    }

    const hasItems = receiveFormData.items.some(item => item.received_qty > 0);
    if (!hasItems) {
      toast.error("Please enter received quantities for at least one item");
      return;
    }

    try {
      const receiveData = {
        purchase_header_id: selectedPO.header.purchase_header_id,
        received_by: currentUser.emp_id,
        delivery_receipt_no: receiveFormData.delivery_receipt_no,
        notes: receiveFormData.notes,
        items: receiveFormData.items
          .filter(item => (parseInt(item.received_qty) || 0) > 0)
          .map(item => ({
            purchase_dtl_id: item.purchase_dtl_id,
            product_id: item.product_id,
            received_qty: parseInt(item.received_qty) || 0
          }))
      };

      const response = await fetch(`${API_BASE}?action=receive_items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiveData)
      });

      // Try to parse JSON; if it fails (even if content-type says JSON), fallback
      let result;
      try {
        result = await response.clone().json();
      } catch (parseErr) {
        const raw = await response.text();
        console.warn('Non-JSON response from receive_items. Falling back. Raw:', raw);
        // Fallback: use simplified endpoint to at least record quantities
        const fallback = {
          purchase_header_id: receiveData.purchase_header_id,
          items: receiveData.items.map(i => ({
            purchase_dtl_id: i.purchase_dtl_id,
            received_qty: i.received_qty,
            missing_qty: 0
          }))
        };
        const fbRes = await fetch(`${API_BASE_SIMPLE}?action=update_received_quantities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallback)
        });
        let fbJson;
        try {
          fbJson = await fbRes.json();
        } catch (e) {
          fbJson = { success: false };
        }
        if (!fbJson.success) throw new Error('Fallback receive failed');
        result = { success: true, receiving_id: fbJson.receiving_id || 0 };
      }
      
      if (result.success) {
        toast.success(`Items received successfully! Receiving ID: ${result.receiving_id}`);
        setShowReceiveForm(false);
        setSelectedPO(null);
        setReceiveFormData({
          delivery_receipt_no: "",
          notes: "",
          items: []
        });
        // Move to Receive Items page and refresh lists
        setActiveTab('receive');
        fetchReceivingList();
        // Keep PO as 'approved' after receiving from Approved to avoid reverting to 'complete'
        try {
          await updatePOStatus(receiveData.purchase_header_id, 'approved');
          // Optimistically remove from the current Approved list
          setPurchaseOrders((prev) => prev.filter((po) => po.purchase_header_id !== receiveData.purchase_header_id));
          await fetchPurchaseOrders(poFilter);
          await fetchAllPurchaseOrders();
        } catch (err) {
          console.warn('Could not update PO status after receiving:', err);
        }
      } else {
        toast.error(result.error || "Error receiving items");
      }
    } catch (error) {
      toast.error("Error receiving items");
      console.error('Error:', error);
    }
  };



  const handleReceiveItems = async (poId) => {
    try {
      // Get PO details for receive items
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedPOForReceive(data);
        
        // Initialize form data with current received quantities
        const initialFormData = {};
        data.details.forEach(item => {
          initialFormData[item.purchase_dtl_id] = item.received_qty || 0;
        });
        setReceiveItemsFormData(initialFormData);
        setShowReceiveItemsForm(true);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Error loading purchase order details');
    }
  };





  const handleSubmitReceiveItems = async (e) => {
    e.preventDefault();
    
    try {
      // Calculate if delivery is complete or partial
      let isComplete = true;
      let hasPartial = false;
      
      selectedPOForReceive.details.forEach(item => {
        const receivedQty = parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0;
        const orderedQty = parseInt(item.quantity) || 0;
        
        if (receivedQty < orderedQty) {
          isComplete = false;
          if (receivedQty > 0) {
            hasPartial = true;
          }
        }
      });
      
      // Prepare the data to send
      const receiveData = {
        purchase_header_id: selectedPOForReceive.header.purchase_header_id,
        items: selectedPOForReceive.details.map(item => ({
          purchase_dtl_id: item.purchase_dtl_id,
          received_qty: parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0,
          missing_qty: Math.max(0, (parseInt(item.quantity) || 0) - (parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0))
        }))
      };
      
      const response = await fetch(`${API_BASE_SIMPLE}?action=update_received_quantities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiveData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Determine status based on delivery completeness and prevent downgrading from approved
        const currentStatus = selectedPOForReceive.header.status;
        let newStatus = 'delivered';

        // If already approved, keep it approved regardless of quantities
        if (currentStatus === 'approved') {
          newStatus = 'approved';
        } else if (isComplete) {
          // Mark as complete when everything is fully received. Approval is manual.
          newStatus = 'complete';
          toast.success('✅ Complete delivery! All items received.');
        } else if (hasPartial) {
          newStatus = 'partial_delivery';
          toast.warning('⚠️ Partial delivery! Some items received, some missing.');
        } else {
          toast.info('📦 No items received yet.');
        }

        // Update PO status only if it changes and is not delivered → lower status
        if (newStatus !== 'delivered' && newStatus !== currentStatus) {
          await updatePOStatus(selectedPOForReceive.header.purchase_header_id, newStatus);
        }
        
        toast.success('Received quantities updated successfully!');
        setShowReceiveItemsForm(false);
        setSelectedPOForReceive(null);
        setReceiveItemsFormData({});
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
      } else {
        toast.error(result.error || 'Failed to update received quantities');
      }
    } catch (error) {
      console.error('Error updating received quantities:', error);
      toast.error('Error updating received quantities');
    }
  };



  // Partial Delivery Management functions
  const handleUpdatePartialDelivery = async (poId) => {
    try {
      // Get PO details for partial delivery update
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedPOForPartialDelivery(data);
        setPartialDeliveryFormData({
          items: data.details.map(detail => ({
            purchase_dtl_id: detail.purchase_dtl_id,
            product_name: detail.product_name,
            ordered_qty: detail.quantity,
            received_qty: detail.received_qty || 0,
            missing_qty: detail.missing_qty || detail.quantity
          }))
        });
        setShowPartialDeliveryForm(true);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Error loading purchase order details');
    }
  };

  const handlePartialDeliveryInputChange = (index, field, value) => {
    const updatedItems = [...partialDeliveryFormData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: parseInt(value) || 0
    };
    
    // Recalculate missing quantity
    updatedItems[index].missing_qty = Math.max(0, updatedItems[index].ordered_qty - updatedItems[index].received_qty);
    
    setPartialDeliveryFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleSubmitPartialDelivery = async (e) => {
    e.preventDefault();
    
    const hasItems = partialDeliveryFormData.items.some(item => item.received_qty > 0);
    if (!hasItems) {
      toast.error("Please enter received quantities for at least one item");
      return;
    }

    try {
      const partialDeliveryData = {
        purchase_header_id: selectedPOForPartialDelivery.header.purchase_header_id,
        items: partialDeliveryFormData.items
      };

      const response = await fetch(`${API_BASE_SIMPLE}?action=update_partial_delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partialDeliveryData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Partial delivery updated successfully! New status: ${result.new_status}`);
        setShowPartialDeliveryForm(false);
        setSelectedPOForPartialDelivery(null);
        setPartialDeliveryFormData({ items: [] });
        fetchPurchaseOrders(poFilter); // Refresh the current filter
        fetchAllPurchaseOrders(); // Refresh all orders for counts
      } else {
        toast.error(result.error || "Error updating partial delivery");
      }
    } catch (error) {
      toast.error("Error updating partial delivery");
      console.error('Error:', error);
    }
  };

  // Loading states
  if ((activeTab === 'create' && loading) || (activeTab === 'list' && poLoading) || (activeTab === 'receive' && receiveLoading)) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 inventory-surface min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Purchase Order Management</h1>
          <p className="text-gray-600">Create, manage, and receive purchase orders</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="inventory-card rounded-3xl p-6">
        <div className="flex justify-between items-center">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'create'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              Create Purchase Order
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              Purchase Orders
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'receive'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package className="h-4 w-4" />
              Receive Items
            </button>
          </nav>
        </div>
      </div>

      {/* Create Purchase Order Tab */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="inventory-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-blue-500" />
              <h3 className="text-xl font-semibold text-gray-900">Order Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium inventory-muted mb-2">
                  Supplier *
                </label>
                <select
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 inventory-select"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier_name} - {supplier.supplier_contact}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium inventory-muted mb-2">
                  Order Date
                </label>
                <input
                  type="date"
                  name="orderDate"
                  value={formData.orderDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 inventory-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium inventory-muted mb-2">
                  Expected Delivery
                </label>
                <input
                  type="date"
                  name="expectedDelivery"
                  value={formData.expectedDelivery}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 inventory-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium inventory-muted mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 inventory-textarea"
                  placeholder="Additional notes for this order..."
                />
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-green-500" />
                <h3 className="text-xl font-semibold text-gray-900">Products</h3>
              </div>
              <button
                type="button"
                onClick={addProduct}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FaPlus className="h-4 w-4" />
                Add Product
              </button>
            </div>

            {selectedProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No products added yet. Click Add `Product` to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProducts.map((product, index) => (
                  <div key={product.id} className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Unit Type
                         </label>
                         <div className="flex gap-4 mb-3">
                           <label className="flex items-center">
                             <input
                               type="radio"
                               name={`unitType-${product.id}`}
                               value="pieces"
                               checked={product.unitType === "pieces"}
                               onChange={(e) => updateProduct(index, 'unitType', e.target.value)}
                               className="mr-2 text-blue-600 focus:ring-blue-500"
                             />
                             <span className="text-sm text-gray-700">Pieces</span>
                           </label>
                           <label className="flex items-center">
                             <input
                               type="radio"
                               name={`unitType-${product.id}`}
                               value="bulk"
                               checked={product.unitType === "bulk"}
                               onChange={(e) => updateProduct(index, 'unitType', e.target.value)}
                               className="mr-2 text-blue-600 focus:ring-blue-500"
                             />
                             <span className="text-sm text-gray-700">Bulk</span>
                           </label>
                         </div>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Product
                         </label>
                         <div className="relative product-dropdown">
                          <div className="relative">
                                                         <input
                               type="text"
                               placeholder="Enter product name..."
                               value={product.searchTerm || ''}
                               onChange={(e) => updateProduct(index, 'searchTerm', e.target.value)}
                               className="w-full px-3 py-2 pr-8 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-green-500"
                             />
                                                                                      <button
                               type="button"
                               onClick={() => {
                                 updateProduct(index, 'searchTerm', '');
                                 updateProduct(index, 'unitType', 'pieces');
                               }}
                               className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                             >
                               <FaTimes className="h-4 w-4" />
                             </button>
                           </div>
                        </div>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           {product.unitType === "bulk" ? "Bulk Quantity" : "Quantity"}
                         </label>
                         <input
                           type="number"
                           min="1"
                           value={product.quantity || ''}
                           onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                           placeholder={product.unitType === "bulk" ? "Enter bulk quantity" : "Enter quantity"}
                         />
                       </div>
                     </div>

                     <div className="flex justify-end mt-4">
                       <button
                         type="button"
                         onClick={() => removeProduct(index)}
                         className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                       >
                         <FaTrash className="h-4 w-4" />
                         Remove
                       </button>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          {selectedProducts.length > 0 && (
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="h-6 w-6 text-green-500" />
                <h3 className="text-xl font-semibold text-gray-900">Order Summary</h3>
              </div>
              <div className="flex justify-between items-center">
                                 <div className="space-y-2">
                   <p className="text-sm text-gray-600">Total Items: {selectedProducts.length}</p>
                   <p className="text-sm text-gray-600">Total Quantity: {selectedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)}</p>
                   <p className="text-sm text-gray-600">Unit Types: {selectedProducts.map(p => p.unitType).join(', ')}</p>
                   <p className="text-sm text-gray-600">
                     Products: {selectedProducts.map(() => '🆕 Custom').join(', ')}
                   </p>
                 </div>
                                     {/* Total calculation removed as requested */}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  supplier: "",
                  orderDate: "",
                  expectedDelivery: "",
                  notes: "",
       
                });
                setSelectedProducts([]);
              }}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <FaTimes className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaCheck className="h-4 w-4" />
              {loading ? "Creating..." : "Create Purchase Order"}
            </button>
          </div>
        </form>
      )}

      {/* Purchase Orders List Tab */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
            </div>

          </div>

          {/* PO Filters */}
          <div className="bg-white rounded-3xl shadow p-3">
            <div className="flex overflow-x-auto no-scrollbar gap-6 px-2">
              {[
                { key: 'delivered', label: 'Delivered' },
                { key: 'partial_delivery', label: 'Partial Delivery' },
                { key: 'complete', label: 'Complete' },
                { key: 'approved', label: 'Approved' },
                { key: 'return', label: 'Returns' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setPoFilter(f.key)}
                  className={`relative py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    poFilter === f.key ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>
                    {f.label}
                    <span className="ml-1 text-xs text-gray-400">({poCounts[f.key] ?? 0})</span>
                  </span>
                  {poFilter === f.key && (
                    <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full min-w-max">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider" style={{ color: '#1e40af' }}>
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider" style={{ color: '#1e40af' }}>
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider" style={{ color: '#1e40af' }}>
                      Date
                    </th>
                                         {/* Total Amount column removed as requested */}
                                         <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider" style={{ color: '#1e40af' }}>
                       Status
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider" style={{ color: '#1e40af' }}>
                       Actions
                     </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPurchaseOrders.map((po) => (
                    <tr
                      key={`po-${po.purchase_header_id}`}
                      className="hover:bg-blue-50 cursor-pointer group transition-all duration-200 hover:shadow-sm"
                      onClick={() => viewDetails(po.purchase_header_id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 group-hover:text-blue-700" style={{ color: '#1f2937' }}>
                        <div className="flex items-center gap-2">
                          <span>{po.po_number || `PO-${po.purchase_header_id}`}</span>
                          <FaEye className="h-3 w-3 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 group-hover:text-blue-700" style={{ color: '#1f2937' }}>
                        <div className="flex flex-col">
                          <span>{po.supplier_name}</span>
                          {po.products_summary && (
                            <span className="text-xs text-gray-500 truncate max-w-xs">{po.products_summary}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 group-hover:text-blue-700" style={{ color: '#1f2937' }}>
                        {new Date(po.date).toLocaleDateString()}
                      </td>
                                             {/* Total Amount display removed as requested */}
                                             <td className="px-6 py-4 whitespace-nowrap">
                         {getStatusBadge(po.status)}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {/* Actions menu with multiple options */}
                        <div className="flex items-center gap-2">
                          {/* View Details Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewDetails(po.purchase_header_id);
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            title="View Details"
                          >
                            <FaEye className="h-3 w-3" />
                          </button>
                                                                                {/* Dynamic Actions */}
                            {(() => { 
                              if (po.status === 'delivered') {
                                return (
                                  <div className="flex gap-2">

                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); handleReceiveItems(po.purchase_header_id); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                                      title="Input received quantities and save to database"
                                    >
                                      Received
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); updatePOStatus(po.purchase_header_id, 'return'); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                                      title="Return PO (Problem with delivery)"
                                    >
                                      Return
                                    </button>
                                  </div>
                                );
                              } else if (po.status === 'approved') {
                                // After approval, proceed with final receiving into inventory
                                return (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleReceive(po.purchase_header_id); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                                      title="Receive to inventory (with DR, batch, expiry)"
                                    >
                                      Received
                                    </button>
                                  </div>
                                );
                              } else if (po.status === 'partial_delivery') {
                                return (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); handleUpdatePartialDelivery(po.purchase_header_id); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                      title="Update when missing items arrive"
                                    >
                                      Update Delivery
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); handleReceiveItems(po.purchase_header_id); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                                      title="Input received quantities and save to database"
                                    >
                                      Received
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); updatePOStatus(po.purchase_header_id, 'return'); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                                      title="Return PO (Supplier failed to deliver)"
                                    >
                                      Return
                                    </button>
                                  </div>
                                );
                              } else if (po.status === 'complete') {
                                return (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); updatePOStatus(po.purchase_header_id, 'approved'); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                                      title="Approve PO (All items received)"
                                    >
                                      Approve
                                    </button>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receive Items Tab */}
      {activeTab === 'receive' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-900">Receive Items</h2>
            </div>

          </div>

          {/* Receiving List Table */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ color: '#374151' }}>
                      Receiving ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ color: '#374151' }}>
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ color: '#374151' }}>
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ color: '#374151' }}>
                      Received Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ color: '#374151' }}>
                      Received Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ color: '#374151' }}>
                      Status
                    </th>
                    
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receivingList.map((item) => (
                    <tr key={item.receiving_id || item.purchase_header_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800" style={{ color: '#1f2937' }}>
                        {item.receiving_id ? 
                          `RCV-${item.receiving_id.toString().padStart(6, '0')}` : 
                          `PO-${item.purchase_header_id.toString().padStart(6, '0')}`
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800" style={{ color: '#1f2937' }}>
                        {item.po_number || `PO-${item.purchase_header_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800" style={{ color: '#1f2937' }}>
                        {item.supplier_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800" style={{ color: '#1f2937' }}>
                        {item.receiving_date ? 
                          new Date(item.receiving_date).toLocaleDateString() : 
                          new Date(item.po_date).toLocaleDateString()}
                        {item.receiving_time && (
                          <div className="text-xs text-gray-500">
                            {item.receiving_time}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 max-w-xs" style={{ color: '#1f2937' }}>
                        <div className="truncate" title={item.received_items}>
                          {item.received_items || 'Ready to receive items'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.display_status === 'Complete' ? 'bg-green-100 text-green-800' :
                          item.display_status === 'Partial' ? 'bg-orange-100 text-orange-800' :
                          item.display_status === 'Ready' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.display_status || 'Received'}
                        </span>
                      </td>
                      
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order Details Modal */}
      {showDetails && selectedPO && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  Purchase Order Details - {selectedPO.header.po_number}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Supplier</p>
                  <p className="font-medium">{selectedPO.header.supplier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-medium">{new Date(selectedPO.header.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expected Delivery</p>
                  <p className="font-medium">
                    {selectedPO.header.expected_delivery_date ? 
                      new Date(selectedPO.header.expected_delivery_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                                 {/* Total Amount display removed as requested */}
              </div>

              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Order Items</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                                         <thead className="bg-gray-50">
                       <tr>
                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ordered Qty</th>
                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Received Qty</th>
                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Missing Qty</th>
                         <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {selectedPO.details.map((item, index) => (
                         <tr key={index}>
                           <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                           <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                           <td className="px-4 py-2 text-sm text-gray-900">{item.received_qty || 0}</td>
                           <td className="px-4 py-2 text-sm text-gray-900">{item.missing_qty || item.quantity}</td>
                           <td className="px-4 py-2 text-sm text-gray-900">
                             {item.missing_qty === 0 ? (
                               <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                 Complete
                               </span>
                             ) : item.received_qty > 0 ? (
                               <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                 Partial
                               </span>
                             ) : (
                               <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                 Pending
                               </span>
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>
                             </div>

               {/* Missing Items Requests Section */}
               {selectedPO.missing_requests && selectedPO.missing_requests.length > 0 && (
                 <div className="mb-6">
                   <h4 className="text-md font-medium text-gray-900 mb-3">Missing Items Requests</h4>
                   <div className="space-y-3">
                     {selectedPO.missing_requests.map((request, index) => (
                       <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                         <div className="flex justify-between items-start">
                           <div>
                             <p className="text-sm text-yellow-800">
                               <strong>Request Date:</strong> {new Date(request.request_date).toLocaleDateString()}
                             </p>
                             <p className="text-sm text-yellow-800">
                               <strong>Status:</strong> 
                               <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                 request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                 request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                 request.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                 'bg-red-100 text-red-800'
                               }`}>
                                 {request.status.replace('_', ' ').toUpperCase()}
                               </span>
                             </p>
                             <p className="text-sm text-yellow-800 mt-2">
                               <strong>Notes:</strong> {request.notes}
                             </p>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

             </div>
             <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Items Modal */}
      {showReceiveForm && selectedPO && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  Receive Items - {selectedPO.header.po_number}
                </h3>
                <button
                  onClick={() => setShowReceiveForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">

              <form id="receiveForm" onSubmit={handleSubmitReceive} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Receipt No. *
                    </label>
                    <input
                      type="text"
                      name="delivery_receipt_no"
                      value={receiveFormData.delivery_receipt_no}
                      onChange={handleReceiveInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      name="notes"
                      value={receiveFormData.notes}
                      onChange={handleReceiveInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Items to Receive</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ordered Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Received Qty</th>
                          {/* Unit Price column removed as requested */}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {receiveFormData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.ordered_qty}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max={item.ordered_qty}
                                value={item.received_qty}
                                onChange={(e) => handleItemChange(index, 'received_qty', parseInt(e.target.value))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </td>
                            {/* Unit Price display removed as requested */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowReceiveForm(false)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <FaTimes className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                form="receiveForm"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <FaCheck className="h-4 w-4" />
                Receive Items
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Receive Items Modal */}
      {showReceiveItemsForm && selectedPOForReceive && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  Receive Items - {selectedPOForReceive.header.po_number}
                </h3>
                <button
                  onClick={() => setShowReceiveItemsForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitReceiveItems} className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the actual quantities received for each item. The system will automatically check if delivery is complete or partial.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {selectedPOForReceive.details.map((item, index) => (
                    <div key={item.purchase_dtl_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product
                          </label>
                          <p className="text-sm text-gray-900">{item.product_name}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ordered Qty
                          </label>
                          <p className="text-sm text-gray-900">{item.quantity} {item.unit_type}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Received Qty *
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={receiveItemsFormData[item.purchase_dtl_id] || 0}
                            onChange={(e) => setReceiveItemsFormData({
                              ...receiveItemsFormData,
                              [item.purchase_dtl_id]: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                          </label>
                          <div className="text-sm">
                            {(() => {
                              const received = parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0;
                              const ordered = parseInt(item.quantity) || 0;
                              const missing = Math.max(0, ordered - received);
                              
                              if (received === 0) {
                                return <span className="text-gray-500">Not Received</span>;
                              } else if (received === ordered) {
                                return <span className="text-green-600 font-medium">✅ Complete</span>;
                              } else if (received > 0) {
                                return <span className="text-orange-600 font-medium">⚠️ Partial ({missing} missing)</span>;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowReceiveItemsForm(false)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <FaTimes className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <FaCheck className="h-4 w-4" />
                    Update Received Quantities
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Partial Delivery Management Modal */}
      {showPartialDeliveryForm && selectedPOForPartialDelivery && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  Partial Delivery Update - {selectedPOForPartialDelivery.header.po_number}
                </h3>
                <button
                  onClick={() => setShowPartialDeliveryForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitPartialDelivery} className="space-y-4">
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Items to Update</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ordered Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Received Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Missing Qty</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {partialDeliveryFormData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.ordered_qty}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max={item.ordered_qty}
                                value={item.received_qty}
                                onChange={(e) => handlePartialDeliveryInputChange(index, 'received_qty', parseInt(e.target.value))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.missing_qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPartialDeliveryForm(false)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <FaTimes className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <FaCheck className="h-4 w-4" />
                    Update Partial Delivery
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ToastContainer removed; it's provided globally in app/layout.js */}
    </div>
  );
}

export default CreatePurchaseOrder; 