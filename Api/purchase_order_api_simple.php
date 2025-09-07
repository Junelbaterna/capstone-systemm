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
            
        case 'approve_purchase_order':
            approvePurchaseOrder($conn);
            break;
            
        case 'reject_purchase_order':
            rejectPurchaseOrder($conn);
            break;
            
        case 'update_delivery_status':
            updateDeliveryStatus($conn);
            break;
            
        case 'request_missing_items':
            requestMissingItems($conn);
            break;
            
        case 'update_received_quantities':
            updateReceivedQuantities($conn);
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

        // Ensure product_name column exists on tbl_purchase_order_dtl (adds it transparently if missing)
        try {
            $checkCol = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'product_name'");
            if ($checkCol->rowCount() === 0) {
                $conn->exec("ALTER TABLE tbl_purchase_order_dtl ADD COLUMN product_name VARCHAR(255) NULL AFTER purchase_header_id");
            }
        } catch (Exception $e) {
            // Ignore if no privileges; inserts below will fallback if column still missing
        }
        
        // Insert purchase order header - automatically set to 'delivered' status (default after creation)
        $headerQuery = "INSERT INTO tbl_purchase_order_header 
                       (supplier_id, date, time, expected_delivery_date, total_amount, created_by, status, notes) 
                       VALUES (?, CURDATE(), CURTIME(), ?, 0.00, ?, 'delivered', ?)";
        
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
        
        // Insert purchase order details (store product_name when available)
        foreach ($input['products'] as $product) {
            $productName = $product['searchTerm'] ?? $product['product_name'] ?? $product['name'] ?? 'Product';

            // Try insert with product_name first; if it fails, fallback without the column
            try {
                $detailQuery = "INSERT INTO tbl_purchase_order_dtl 
                               (purchase_header_id, product_name, quantity, unit_type, received_qty, missing_qty) 
                               VALUES (?, ?, ?, ?, 0, 0)";
                $detailStmt = $conn->prepare($detailQuery);
                $detailStmt->execute([
                    $purchaseHeaderId,
                    $productName,
                    $product['quantity'],
                    $product['unit_type'] ?? 'pieces'
                ]);
            } catch (Exception $ignored) {
                // Fallback: legacy table without product_name column
                $detailQuery = "INSERT INTO tbl_purchase_order_dtl 
                               (purchase_header_id, quantity, unit_type, received_qty, missing_qty) 
                               VALUES (?, ?, ?, 0, 0)";
                $detailStmt = $conn->prepare($detailQuery);
                $detailStmt->execute([
                    $purchaseHeaderId,
                    $product['quantity'],
                    $product['unit_type'] ?? 'pieces'
                ]);
            }
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
        $status = $_GET['status'] ?? '';
        
        $query = "SELECT 
                    poh.purchase_header_id,
                    poh.po_number,
                    poh.date,
                    poh.expected_delivery_date,
                    poh.status,
                    s.supplier_name,
                    s.supplier_contact,
                    COALESCE(r.products_summary, '') AS products_summary
                  FROM tbl_purchase_order_header poh
                  JOIN tbl_supplier s ON poh.supplier_id = s.supplier_id
                  LEFT JOIN (
                    SELECT prh.purchase_header_id,
                           GROUP_CONCAT(prd.product_name SEPARATOR ', ') AS products_summary
                    FROM tbl_purchase_receiving_header prh
                    LEFT JOIN tbl_purchase_receiving_dtl prd ON prh.receiving_id = prd.receiving_id
                    GROUP BY prh.purchase_header_id
                  ) r ON r.purchase_header_id = poh.purchase_header_id";
        
        $params = [];
        
        // Add status filtering if provided
        if (!empty($status)) {
            switch ($status) {
                case 'delivered':
                    $query .= " WHERE poh.status = 'delivered'";
                    break;
                case 'partial_delivery':
                    $query .= " WHERE poh.status = 'partial_delivery'";
                    break;
                case 'complete':
                    $query .= " WHERE poh.status = 'complete'";
                    break;
                case 'approved':
                    // Show only approved POs that have NOT yet been received
                    $query .= " WHERE poh.status = 'approved' AND NOT EXISTS (SELECT 1 FROM tbl_purchase_receiving_header prh WHERE prh.purchase_header_id = poh.purchase_header_id)";
                    break;
                case 'return':
                    $query .= " WHERE poh.status = 'return'";
                    break;
                default:
                    // No additional filtering for other statuses
                    break;
            }
        }
        
        $query .= " ORDER BY poh.date DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
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
                           COALESCE(pod.product_name, 'Product') as product_name,
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
        //     $requestsQuery = "SELECT 
        //                        mir.*,
        //                        e.Fname as requested_by_name
        //                      FROM tbl_missing_items_requests mir
        //                      JOIN tbl_employee e ON mir.requested_by = e.emp_id
        //                      WHERE mir.purchase_header_id = ?
        //                      ORDER BY mir.request_date DESC";
            
        //     $requestsStmt = $conn->prepare($requestsQuery);
        //     $requestsStmt->execute([$poId]);
        //     $missingRequests = $requestsStmt->fetchAll(PDO::FETCH_ASSOC);
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
        
        $validStatuses = ['delivered', 'partial_delivery', 'complete', 'approved', 'return'];
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
        
        // If status is being changed to 'approved', log to approval table
        if ($input['status'] === 'approved') {
            $approvalQuery = "INSERT INTO tbl_purchase_order_approval 
                             (purchase_header_id, approved_by, approval_date, approval_status, approval_notes) 
                             VALUES (?, ?, NOW(), 'approved', ?)";
            $approvalStmt = $conn->prepare($approvalQuery);
            $approvalStmt->execute([
                $input['purchase_header_id'],
                $input['approved_by'] ?? 21, // Default user ID if not provided
                $input['approval_notes'] ?? "Purchase order approved via status update"
            ]);
        }
        
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
        
        // Update PO status to partial_delivery
        $updateQuery = "UPDATE tbl_purchase_order_header SET status = 'partial_delivery' WHERE purchase_header_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute([$input['purchase_header_id']]);
        
        // Log the status change (commented out since table doesn't exist)
        // $logQuery = "INSERT INTO tbl_po_delivery_tracking 
        //              (purchase_header_id, status_from, status_to, changed_by, notes) 
        //              VALUES (?, 'delivered', 'partial_delivery', ?, ?)";
        // $logStmt = $conn->prepare($logQuery);
        // $logStmt->execute([
        //     $input['purchase_header_id'],
        //     $input['requested_by'],
        //     "Missing items requested: {$input['notes']}"
        // ]);
        
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

function updateReceivedQuantities($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['purchase_header_id']) || !isset($input['items'])) {
            throw new Exception('Purchase order ID and items are required');
        }
        
        $conn->beginTransaction();
        
        // Get PO details for product information
        $poQuery = "SELECT pod.purchase_dtl_id, pod.quantity, pod.unit_type, 'Product' as product_name
                   FROM tbl_purchase_order_dtl pod
                   WHERE pod.purchase_header_id = ?";
        $poStmt = $conn->prepare($poQuery);
        $poStmt->execute([$input['purchase_header_id']]);
        $poDetails = $poStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Create a lookup array for PO details
        $poDetailsLookup = [];
        foreach ($poDetails as $detail) {
            $poDetailsLookup[$detail['purchase_dtl_id']] = $detail;
        }
        
        // Update each item's received and missing quantities
        foreach ($input['items'] as $item) {
            $updateQuery = "UPDATE tbl_purchase_order_dtl 
                           SET received_qty = ?, missing_qty = ? 
                           WHERE purchase_dtl_id = ? AND purchase_header_id = ?";
            
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->execute([
                $item['received_qty'],
                $item['missing_qty'],
                $item['purchase_dtl_id'],
                $input['purchase_header_id']
            ]);
            
            // Save to tbl_receive if received_qty > 0
            if ($item['received_qty'] > 0 && isset($poDetailsLookup[$item['purchase_dtl_id']])) {
                $poDetail = $poDetailsLookup[$item['purchase_dtl_id']];
                
                // Determine status
                $status = 'completed';
                if ($item['received_qty'] == $poDetail['quantity']) {
                    $status = 'completed';
                } elseif ($item['received_qty'] > 0) {
                    $status = 'partial';
                }
                
                // Create receiving header if it doesn't exist
                $headerCheckQuery = "SELECT receiving_id FROM tbl_purchase_receiving_header WHERE purchase_header_id = ?";
                $headerCheckStmt = $conn->prepare($headerCheckQuery);
                $headerCheckStmt->execute([$input['purchase_header_id']]);
                $existingHeader = $headerCheckStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$existingHeader) {
                    $headerQuery = "INSERT INTO tbl_purchase_receiving_header 
                                   (purchase_header_id, receiving_date, receiving_time, received_by, status) 
                                   VALUES (?, CURDATE(), CURTIME(), ?, ?)";
                    $headerStmt = $conn->prepare($headerQuery);
                    $headerStmt->execute([
                        $input['purchase_header_id'],
                        $input['received_by'] ?? 21,
                        $status
                    ]);
                    $receivingId = $conn->lastInsertId();
                } else {
                    $receivingId = $existingHeader['receiving_id'];
                }
                
                // Insert into receiving details (without unit price; adapt to available columns)
                $columns = [];
                try {
                    $colStmt = $conn->query("SHOW COLUMNS FROM tbl_purchase_receiving_dtl");
                    $columns = array_map(function($r){ return $r['Field']; }, $colStmt->fetchAll(PDO::FETCH_ASSOC));
                } catch (Exception $ignore) {}

                $hasProductName = in_array('product_name', $columns);
                $hasProductId   = in_array('product_id', $columns);
                $hasNotes       = in_array('notes', $columns);

                $insertCols = ['receiving_id'];
                $values = [$receivingId];
                if ($hasProductName) { $insertCols[] = 'product_name'; $values[] = $poDetail['product_name']; }
                if ($hasProductId)   { $insertCols[] = 'product_id';   $values[] = $poDetail['product_id'] ?? 0; }
                $insertCols[] = 'ordered_qty'; $values[] = $poDetail['quantity'];
                $insertCols[] = 'received_qty'; $values[] = $item['received_qty'];
                if ($hasNotes) { $insertCols[] = 'notes'; $values[] = "Received: {$item['received_qty']}, Missing: {$item['missing_qty']}, Status: {$status}"; }

                $placeholders = implode(', ', array_fill(0, count($insertCols), '?'));
                $receiveQuery = 'INSERT INTO tbl_purchase_receiving_dtl (' . implode(', ', $insertCols) . ') VALUES (' . $placeholders . ')';
                $receiveStmt = $conn->prepare($receiveQuery);
                $receiveStmt->execute($values);
            }
        }
        
        // Determine new PO status based on delivery completeness
        // Check current PO status first
        $currentStatusQuery = "SELECT status FROM tbl_purchase_order_header WHERE purchase_header_id = ?";
        $currentStatusStmt = $conn->prepare($currentStatusQuery);
        $currentStatusStmt->execute([$input['purchase_header_id']]);
        $currentStatus = $currentStatusStmt->fetchColumn();
        
        // Calculate totals
        $totalReceived = 0;
        $totalMissing = 0;
        foreach ($input['items'] as $item) {
            $totalReceived += $item['received_qty'];
            $totalMissing += $item['missing_qty'];
        }
        
        // Determine new PO status based on received quantities
        $newStatus = $currentStatus; // Keep current status by default
        
        // Only update status if PO is not already approved
        if ($currentStatus !== 'approved') {
            if ($totalMissing > 0 && $totalReceived > 0) {
                // Some items received, some missing = partial delivery
                $newStatus = 'partial_delivery';
            } elseif ($totalMissing === 0 && $totalReceived > 0) {
                // All items received = complete
                $newStatus = 'complete';
            } elseif ($totalReceived === 0) {
                // Nothing received yet = still delivered (waiting for delivery)
                $newStatus = 'delivered';
            }
        }
        
        // Update PO status only if it changed
        if ($newStatus !== $currentStatus) {
            $statusQuery = "UPDATE tbl_purchase_order_header SET status = ? WHERE purchase_header_id = ?";
            $statusStmt = $conn->prepare($statusQuery);
            $statusStmt->execute([$newStatus, $input['purchase_header_id']]);
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Received quantities updated successfully and saved to receiving tables',
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
        // Check current PO status first
        $currentStatusQuery = "SELECT status FROM tbl_purchase_order_header WHERE purchase_header_id = ?";
        $currentStatusStmt = $conn->prepare($currentStatusQuery);
        $currentStatusStmt->execute([$input['purchase_header_id']]);
        $currentStatus = $currentStatusStmt->fetchColumn();
        
        // Determine new PO status based on received quantities
        $newStatus = $currentStatus; // Keep current status by default
        
        // Only update status if PO is not already approved
        if ($currentStatus !== 'approved') {
            if ($totalMissing > 0 && $totalReceived > 0) {
                // Some items received, some missing = partial delivery
                $newStatus = 'partial_delivery';
            } elseif ($totalMissing === 0 && $totalReceived > 0) {
                // All items received = complete
                $newStatus = 'complete';
            } elseif ($totalReceived === 0) {
                // Nothing received yet = still delivered (waiting for delivery)
                $newStatus = 'delivered';
            }
        }
        
        // Update PO status only if it changed
        if ($newStatus !== $currentStatus) {
            $statusQuery = "UPDATE tbl_purchase_order_header SET status = ? WHERE purchase_header_id = ?";
            $statusStmt = $conn->prepare($statusQuery);
            $statusStmt->execute([$newStatus, $input['purchase_header_id']]);
        }
        
        // Log the status change if it changed (commented out since table doesn't exist)
        if ($newStatus !== 'delivered') {
            // $logQuery = "INSERT INTO tbl_po_delivery_tracking 
            //              (purchase_header_id, status_from, status_to, changed_by, notes) 
            //              VALUES (?, 'delivered', ?, ?, ?)";
            // $logStmt = $conn->prepare($logQuery);
            // $logStmt->execute([
            //     $input['purchase_header_id'],
            //     $newStatus,
            //     $input['changed_by'] ?? 21,
            //     "Partial delivery updated: $totalReceived received, $totalMissing missing"
            // ]);
        }
        
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
    
    // try {
    //     $poId = $_GET['po_id'] ?? null;
        
    //     $query = "SELECT 
    //                 mir.*,
    //                 poh.po_number,
    //                 s.supplier_name,
    //                 e.Fname as requested_by_name,
    //                 COALESCE(e2.Fname, '') as resolved_by_name
    //               FROM tbl_missing_items_requests mir
    //               JOIN tbl_purchase_order_header poh ON mir.purchase_header_id = poh.purchase_header_id
    //               JOIN tbl_supplier s ON poh.supplier_id = s.supplier_id
    //               JOIN tbl_employee e ON mir.requested_by = e.emp_id
    //               LEFT JOIN tbl_employee e2 ON mir.resolved_by = e2.emp_id";
        
    //     $params = [];
    //     if ($poId) {
    //         $query .= " WHERE mir.purchase_header_id = ?";
    //     $params[] = $poId;
    //     }
        
    //     $query .= " ORDER BY mir.request_date DESC";
        
    //     $stmt = $conn->prepare($query);
    //     $stmt->execute($params);
    //     $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    //     echo json_encode(['success' => true, 'data' => $requests]);
        
    // } catch (Exception $e) {
    //     echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    // }
}

function getReceivingList($conn) {
    try {
        // Only show POs that have been received (hide pending/ready ones)
        $receivedQuery = "SELECT 
                    prh.receiving_id,
                    prh.purchase_header_id,
                    prh.receiving_date,
                    prh.receiving_time,
                    prh.received_by,
                    prh.delivery_receipt_no,
                    prh.status as receiving_status,
                    prh.notes as receiving_notes,
                    poh.po_number,
                    poh.date as po_date,
                    poh.expected_delivery_date,
                    poh.status as po_status,
                    s.supplier_name,
                    s.supplier_contact,
                    GROUP_CONCAT(
                        CONCAT(
                            COALESCE(prd.product_name, 'Product'), 
                            ' (Ordered: ', prd.ordered_qty, 
                            ', Received: ', prd.received_qty, 
                            ')'
                        ) 
                        SEPARATOR ', '
                    ) as received_items,
                    'Received' as display_status
                  FROM tbl_purchase_receiving_header prh
                  JOIN tbl_purchase_order_header poh ON prh.purchase_header_id = poh.purchase_header_id
                  JOIN tbl_supplier s ON poh.supplier_id = s.supplier_id
                  LEFT JOIN tbl_purchase_receiving_dtl prd ON prh.receiving_id = prd.receiving_id
                  GROUP BY prh.receiving_id
                  ORDER BY prh.receiving_date DESC, prh.receiving_time DESC";
        
        $receivedStmt = $conn->prepare($receivedQuery);
        $receivedStmt->execute();
        $receivedItems = $receivedStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $receivedItems]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function approvePurchaseOrder($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['purchase_header_id']) || !isset($input['approved_by'])) {
            throw new Exception('Purchase order ID and approved by are required');
        }
        
        $conn->beginTransaction();
        
        // Update PO status to approved
        $updateQuery = "UPDATE tbl_purchase_order_header SET status = 'approved' WHERE purchase_header_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute([$input['purchase_header_id']]);
        
        // Insert approval record
        $approvalQuery = "INSERT INTO tbl_purchase_order_approval 
                         (purchase_header_id, approved_by, approval_date, approval_status, approval_notes) 
                         VALUES (?, ?, NOW(), 'approved', ?)";
        $approvalStmt = $conn->prepare($approvalQuery);
        $approvalStmt->execute([
            $input['purchase_header_id'],
            $input['approved_by'],
            $input['approval_notes'] ?? 'Purchase order approved'
        ]);
        
        $conn->commit();
        
        echo json_encode(['success' => true, 'message' => 'Purchase order approved successfully']);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function rejectPurchaseOrder($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['purchase_header_id']) || !isset($input['rejected_by'])) {
            throw new Exception('Purchase order ID and rejected by are required');
        }
        
        $conn->beginTransaction();
        
        // Update PO status to return
        $updateQuery = "UPDATE tbl_purchase_order_header SET status = 'return' WHERE purchase_header_id = ?";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute([$input['purchase_header_id']]);
        
        // Insert rejection record
        $rejectionQuery = "INSERT INTO tbl_purchase_order_approval 
                          (purchase_header_id, approved_by, approval_date, approval_status, approval_notes) 
                          VALUES (?, ?, NOW(), 'rejected', ?)";
        $rejectionStmt = $conn->prepare($rejectionQuery);
        $rejectionStmt->execute([
            $input['purchase_header_id'],
            $input['rejected_by'],
            $input['rejection_notes'] ?? 'Purchase order rejected'
        ]);
        
        $conn->commit();
        
        echo json_encode(['success' => true, 'message' => 'Purchase order rejected successfully']);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function updateDeliveryStatus($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['purchase_header_id']) || !isset($input['delivery_status'])) {
            throw new Exception('Purchase order ID and delivery status are required');
        }
        
        $validStatuses = ['pending', 'in_transit', 'delivered', 'partial', 'cancelled'];
        if (!in_array($input['delivery_status'], $validStatuses)) {
            throw new Exception('Invalid delivery status');
        }
        
        $conn->beginTransaction();
        
        // Update or insert delivery record
        $checkQuery = "SELECT delivery_id FROM tbl_purchase_order_delivery WHERE purchase_header_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->execute([$input['purchase_header_id']]);
        
        if ($checkStmt->rowCount() > 0) {
            // Update existing delivery record
            $updateQuery = "UPDATE tbl_purchase_order_delivery 
                           SET delivery_status = ?, 
                               actual_delivery_date = ?,
                               delivery_notes = ?,
                               updated_at = NOW()
                           WHERE purchase_header_id = ?";
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->execute([
                $input['delivery_status'],
                $input['actual_delivery_date'] ?? null,
                $input['delivery_notes'] ?? null,
                $input['purchase_header_id']
            ]);
        } else {
            // Insert new delivery record
            $insertQuery = "INSERT INTO tbl_purchase_order_delivery 
                           (purchase_header_id, expected_delivery_date, actual_delivery_date, delivery_status, delivery_notes) 
                           VALUES (?, ?, ?, ?, ?)";
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->execute([
                $input['purchase_header_id'],
                $input['expected_delivery_date'] ?? null,
                $input['actual_delivery_date'] ?? null,
                $input['delivery_status'],
                $input['delivery_notes'] ?? null
            ]);
        }
        
        // Update PO status based on delivery status
        $poStatus = 'delivered'; // Default status
        if ($input['delivery_status'] === 'delivered') {
            $poStatus = 'delivered';
        } elseif ($input['delivery_status'] === 'partial') {
            $poStatus = 'partial_delivery';
        } elseif ($input['delivery_status'] === 'cancelled') {
            $poStatus = 'return';
        }
        
        $poUpdateQuery = "UPDATE tbl_purchase_order_header SET status = ? WHERE purchase_header_id = ?";
        $poUpdateStmt = $conn->prepare($poUpdateQuery);
        $poUpdateStmt->execute([$poStatus, $input['purchase_header_id']]);
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Delivery status updated successfully',
            'new_po_status' => $poStatus
        ]);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
