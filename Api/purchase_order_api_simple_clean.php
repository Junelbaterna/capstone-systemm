<?php
// Enable CORS for development - Fixed for React frontend
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database connection
require_once 'conn.php';

// Get action from query parameter
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'test':
            echo json_encode(['success' => true, 'message' => 'API is working', 'timestamp' => date('Y-m-d H:i:s')]);
            break;
            
        case 'suppliers':
            getSuppliers($conn);
            break;
            
        case 'create_purchase_order':
            createPurchaseOrder($conn);
            break;
            
        case 'purchase_orders':
            getPurchaseOrders($conn);
            break;
            
        case 'purchase_order_details':
            getPurchaseOrderDetails($conn);
            break;
            
        case 'update_po_status':
            updatePOStatus($conn);
            break;
            
        case 'request_missing_items':
            requestMissingItems($conn);
            break;
            
        case 'update_partial_delivery':
            updatePartialDelivery($conn);
            break;
            
        case 'missing_items_requests':
            getMissingItemsRequests($conn);
            break;
            
        case 'receiving_list':
            getReceivingList($conn);
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function getSuppliers($conn) {
    try {
        $stmt = $conn->prepare("SELECT supplier_id, supplier_name, supplier_contact FROM tbl_supplier WHERE status = 'active' ORDER BY supplier_name");
        $stmt->execute();
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $suppliers]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function createPurchaseOrder($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid input data');
        }
        
        $required_fields = ['supplier_id', 'created_by', 'products'];
        foreach ($required_fields as $field) {
            if (!isset($input[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }
        
        $conn->beginTransaction();
        
        // Insert purchase order header - automatically set to 'unpaid' status
        $headerQuery = "INSERT INTO tbl_purchase_order_header 
                       (supplier_id, date, time, expected_delivery_date, total_amount, created_by, status, notes) 
                       VALUES (?, CURDATE(), CURTIME(), ?, 0.00, ?, 'unpaid', ?)";
        
        $headerStmt = $conn->prepare($headerQuery);
        $headerStmt->execute([
            $input['supplier_id'],
            $input['expected_delivery_date'] ?? null,
            $input['created_by'],
            $input['notes'] ?? null
        ]);
        
        $purchaseHeaderId = $conn->lastInsertId();
        
        // Generate PO number
        $poNumber = 'PO-' . str_pad($purchaseHeaderId, 6, '0', STR_PAD_LEFT);
        $conn->prepare("UPDATE tbl_purchase_order_header SET po_number = ? WHERE purchase_header_id = ?")->execute([$poNumber, $purchaseHeaderId]);
        
        // Insert purchase order details
        foreach ($input['products'] as $product) {
            $detailQuery = "INSERT INTO tbl_purchase_order_dtl 
                           (purchase_header_id, quantity, unit_type, price, received_qty, missing_qty) 
                           VALUES (?, ?, ?, 0.00, 0, ?)";
            
            $detailStmt = $conn->prepare($detailQuery);
            $detailStmt->execute([
                $purchaseHeaderId,
                $product['quantity'],
                $product['unit_type'] ?? 'pieces',
                $product['quantity'] // missing_qty starts equal to ordered quantity
            ]);
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Purchase order created successfully',
            'po_number' => $poNumber,
            'purchase_header_id' => $purchaseHeaderId
        ]);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function getPurchaseOrders($conn) {
    try {
        $query = "SELECT 
                    poh.purchase_header_id,
                    poh.po_number,
                    poh.date,
                    poh.expected_delivery_date,
                    poh.status,
                    s.supplier_name,
                    s.supplier_contact
                  FROM tbl_purchase_order_header poh
                  JOIN tbl_supplier s ON poh.supplier_id = s.supplier_id
                  ORDER BY poh.date DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $purchaseOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $purchaseOrders]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function getPurchaseOrderDetails($conn) {
    try {
        $poId = $_GET['po_id'] ?? null;
        if (!$poId) {
            throw new Exception('Purchase order ID is required');
        }
        
        // Get header information
        $headerQuery = "SELECT 
                         poh.*,
                         s.supplier_name,
                         s.supplier_contact
                       FROM tbl_purchase_order_header poh
                       JOIN tbl_supplier s ON poh.supplier_id = s.supplier_id
                       WHERE poh.purchase_header_id = ?";
        
        $headerStmt = $conn->prepare($headerQuery);
        $headerStmt->execute([$poId]);
        $header = $headerStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$header) {
            throw new Exception('Purchase order not found');
        }
        
        // Get details with actual column access for partial delivery tracking
        $detailsQuery = "SELECT 
                           pod.purchase_dtl_id,
                           pod.purchase_header_id,
                           'Product' as product_name,
                           pod.quantity,
                           pod.unit_type,
                           pod.received_qty,
                           pod.missing_qty
                         FROM tbl_purchase_order_dtl pod
                         WHERE pod.purchase_header_id = ?";
        
        $detailsStmt = $conn->prepare($detailsQuery);
        $detailsStmt->execute([$poId]);
        $details = $detailsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get missing items requests
        $missingRequests = [];
        try {
            $requestsQuery = "SELECT 
                               mir.*,
                               e.Fname as requested_by_name
                             FROM tbl_missing_items_requests mir
                             JOIN tbl_employee e ON mir.requested_by = e.emp_id
                             WHERE mir.purchase_header_id = ?
                             ORDER BY mir.request_date DESC";
            
            $requestsStmt = $conn->prepare($requestsQuery);
            $requestsStmt->execute([$poId]);
            $missingRequests = $requestsStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            // Table doesn't exist, return empty array
            $missingRequests = [];
        }
        
        echo json_encode([
            'success' => true,
            'header' => $header,
            'details' => $details,
            'missing_requests' => $missingRequests
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function updatePOStatus($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['purchase_header_id']) || !isset($input['status'])) {
            throw new Exception('Purchase order ID and status are required');
        }
        
        $validStatuses = ['unpaid', 'to_ship', 'shipped', 'to_review', 'return', 'delivered', 'partial_delivery', 'pending_fulfillment', 'complete'];
        if (!in_array($input['status'], $validStatuses)) {
            throw new Exception('Invalid status');
        }
        
        $conn->beginTransaction();
        
        // Get current status
        $currentStatusQuery = "SELECT status FROM tbl_purchase_order_header WHERE purchase_header_id = ?";
        $currentStatusStmt = $conn->prepare($currentStatusQuery);
        $currentStatusStmt->execute([$input['purchase_header_id']]);
        $currentStatus = $currentStatusStmt->fetchColumn();
        
        // Update status
        $updateQuery = "UPDATE tbl_purchase_order_header SET status = ? WHERE purchase_header_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute([$input['status'], $input['purchase_header_id']]);
        
        $conn->commit();
        
        echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function requestMissingItems($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['purchase_header_id']) || !isset($input['requested_by']) || !isset($input['notes'])) {
            throw new Exception('Purchase order ID, requested by, and notes are required');
        }
        
        $conn->beginTransaction();
        
        // Create missing items request
        $requestQuery = "INSERT INTO tbl_missing_items_requests 
                        (purchase_header_id, requested_by, notes, status) 
                        VALUES (?, ?, ?, 'pending')";
        
        $requestStmt = $conn->prepare($requestQuery);
        $requestStmt->execute([
            $input['purchase_header_id'],
            $input['requested_by'],
            $input['notes']
        ]);
        
        $requestId = $conn->lastInsertId();
        
        // Update PO status to pending_fulfillment
        $updateQuery = "UPDATE tbl_purchase_order_header SET status = 'pending_fulfillment' WHERE purchase_header_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute([$input['purchase_header_id']]);
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Missing items request created successfully',
            'request_id' => $requestId
        ]);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function updatePartialDelivery($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['purchase_header_id']) || !isset($input['items'])) {
            throw new Exception('Purchase order ID and items are required');
        }
        
        $conn->beginTransaction();
        
        $totalItems = 0;
        $totalReceived = 0;
        $totalMissing = 0;
        
        // Update each item's received and missing quantities
        foreach ($input['items'] as $item) {
            if (!isset($item['purchase_dtl_id']) || !isset($item['received_qty'])) {
                continue;
            }
            
            $missingQty = max(0, $item['ordered_qty'] - $item['received_qty']);
            
            // Update the actual received_qty and missing_qty columns
            $updateQuery = "UPDATE tbl_purchase_order_dtl 
                           SET received_qty = ?, missing_qty = ? 
                           WHERE purchase_dtl_id = ?";
            
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->execute([
                $item['received_qty'],
                $missingQty,
                $item['purchase_dtl_id']
            ]);
            
            $totalItems++;
            $totalReceived += $item['received_qty'];
            $totalMissing += $missingQty;
        }
        
        // Determine new PO status based on delivery completeness
        $newStatus = 'delivered';
        if ($totalMissing > 0 && $totalReceived > 0) {
            $newStatus = 'partial_delivery';
        } elseif ($totalMissing === 0) {
            $newStatus = 'complete';
        }
        
        // Update PO status
        $statusQuery = "UPDATE tbl_purchase_order_header SET status = ? WHERE purchase_header_id = ?";
        $statusStmt = $conn->prepare($statusQuery);
        $statusStmt->execute([$newStatus, $input['purchase_header_id']]);
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Partial delivery updated successfully',
            'new_status' => $newStatus,
            'total_received' => $totalReceived,
            'total_missing' => $totalMissing
        ]);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function getMissingItemsRequests($conn) {
    try {
        $poId = $_GET['po_id'] ?? null;
        
        $query = "SELECT 
                    mir.*,
                    poh.po_number,
                    s.supplier_name,
                    e.Fname as requested_by_name,
                    COALESCE(e2.Fname, '') as resolved_by_name
                  FROM tbl_missing_items_requests mir
                  JOIN tbl_purchase_order_header poh ON mir.purchase_header_id = poh.purchase_header_id
                  JOIN tbl_supplier s ON poh.supplier_id = s.supplier_id
                  JOIN tbl_employee e ON mir.requested_by = e.emp_id
                  LEFT JOIN tbl_employee e2 ON mir.resolved_by = e.emp_id";
        
        $params = [];
        if ($poId) {
            $query .= " WHERE mir.purchase_header_id = ?";
            $params[] = $poId;
        }
        
        $query .= " ORDER BY mir.request_date DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $requests]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function getReceivingList($conn) {
    try {
        $query = "SELECT 
                    poh.purchase_header_id,
                    poh.po_number,
                    poh.date,
                    poh.expected_delivery_date,
                    poh.status,
                    s.supplier_name,
                    s.supplier_contact
                  FROM tbl_purchase_order_header poh
                  JOIN tbl_supplier s ON poh.supplier_id = s.supplier_id
                  WHERE poh.status IN ('unpaid', 'to_ship', 'shipped', 'delivered', 'partial_delivery')
                  ORDER BY poh.expected_delivery_date ASC, poh.date DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $receivingList = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $receivingList]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
