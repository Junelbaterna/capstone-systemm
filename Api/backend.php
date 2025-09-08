<?php
// Start output buffering to prevent unwanted output
ob_start();

session_start();

// CORS and content-type headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Disable error display to prevent HTML in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Log errors to a file for debugging
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

// Helper function to get stock status based on quantity
function getStockStatus($quantity, $lowStockThreshold = 10) {
    $qty = intval($quantity);
    if ($qty <= 0) {
        return 'out of stock';
    } elseif ($qty <= $lowStockThreshold) {
        return 'low stock';
    } else {
        return 'in stock';
    }
}

// Helper function to get stock status SQL case statement
function getStockStatusSQL($quantityField, $lowStockThreshold = 10) {
    return "CASE 
        WHEN {$quantityField} <= 0 THEN 'out of stock'
        WHEN {$quantityField} <= {$lowStockThreshold} THEN 'low stock'
        ELSE 'in stock'
    END";
}

// Database connection using PDO
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection error: " . $e->getMessage()
    ]);
    exit;
}

// Clear any output that might have been generated
ob_clean();

// Read and decode incoming JSON request
$rawData = file_get_contents("php://input");
error_log("Raw input: " . $rawData);

$data = json_decode($rawData, true);

// Check if JSON is valid
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON decode error: " . json_last_error_msg());
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON input: " . json_last_error_msg(),
        "raw" => $rawData
    ]);
    exit;
}

// Check if 'action' is set
if (!isset($data['action'])) {
    echo json_encode([
        "success" => false,
        "message" => "Missing action"
    ]);
    exit;
}

// Action handler
$action = $data['action'];
error_log("Processing action: " . $action);

try {
    switch ($action) {
    case 'test_connection':
        echo json_encode([
            "success" => true,
            "message" => "API connection successful",
            "timestamp" => date('Y-m-d H:i:s'),
            "database" => "Connected to enguio2 database"
        ]);
        break;
    
    case 'check_table_structure':
        try {
            $stmt = $conn->prepare("DESCRIBE tbl_product");
            $stmt->execute();
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "columns" => $columns
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
        
    case 'debug_brands_suppliers':
        try {
            // Get all brands
            $brandStmt = $conn->prepare("SELECT * FROM tbl_brand ORDER BY brand_id");
            $brandStmt->execute();
            $brands = $brandStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get all suppliers
            $supplierStmt = $conn->prepare("SELECT * FROM tbl_supplier ORDER BY supplier_id");
            $supplierStmt->execute();
            $suppliers = $supplierStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get existing products
            $productStmt = $conn->prepare("SELECT product_id, product_name, brand_id, supplier_id FROM tbl_product ORDER BY product_id");
            $productStmt->execute();
            $products = $productStmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "brands" => $brands,
                "suppliers" => $suppliers,
                "products" => $products,
                "brand_count" => count($brands),
                "supplier_count" => count($suppliers),
                "will_use_brand_id" => count($brands) > 0 ? $brands[0]['brand_id'] : null,
                "will_use_supplier_id" => count($suppliers) > 0 ? $suppliers[0]['supplier_id'] : null
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
        
    case 'clear_brands':
        try {
            // Update existing products to have NULL brand_id
            $updateStmt = $conn->prepare("UPDATE tbl_product SET brand_id = NULL WHERE brand_id IS NOT NULL");
            $updateStmt->execute();
            $updatedProducts = $updateStmt->rowCount();
            
            // Clear the brand table
            $deleteStmt = $conn->prepare("DELETE FROM tbl_brand");
            $deleteStmt->execute();
            $deletedBrands = $deleteStmt->rowCount();
            
            // Reset auto-increment
            $conn->exec("ALTER TABLE tbl_brand AUTO_INCREMENT = 1");
            
            echo json_encode([
                "success" => true,
                "message" => "Brands table cleared successfully",
                "updated_products" => $updatedProducts,
                "deleted_brands" => $deletedBrands
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'add_employee':
        try {
            // Extract and sanitize input data
            $fname = isset($data['fname'])&& !empty($data['fname']) ? trim($data['fname']) : '';
            $mname = isset($data['mname']) && !empty($data['mname'])? trim($data['mname']) : '';
            $lname = isset($data['lname']) && !empty($data['lname'])? trim($data['lname']) : '';
            $email = isset($data['email']) ? trim($data['email']) : '';
            $contact = isset($data['contact_num']) ? trim($data['contact_num']) : '';
            $role_id = isset($data['role_id']) ? trim($data['role_id']) : '';
            $shift_id = isset($data['shift_id']) && $data['shift_id'] !== null && $data['shift_id'] !== '' ? (int)$data['shift_id'] : null;
            $username = isset($data['username']) ? trim($data['username']) : '';
            $password = isset($data['password']) ? trim($data['password']) : '';
            $age = isset($data['age']) ? trim($data['age']) : '';
            $address = isset($data['address']) ? trim($data['address']) : '';
            $status = isset($data['status']) ? trim($data['status']) : 'Active';
            $gender = isset($data['gender']) ? trim($data['gender']) : '';
            $birthdate = isset($data['birthdate']) ? trim($data['birthdate']) : '';

            // Only require shift_id for cashier (3) and pharmacist (2)
            if (($role_id == 2 || $role_id == 3) && empty($shift_id)) {
                echo json_encode(["success" => false, "message" => "Shift is required."]);
                exit;
            }

            // Hash the password
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

            // Prepare the SQL statement
            $stmt = $conn->prepare("
                INSERT INTO tbl_employee (
                    Fname, Mname, Lname, email, contact_num, role_id, shift_id,
                    username, password, age, address, status,gender,birthdate
                ) VALUES (
                    :fname, :mname, :lname, :email, :contact_num, :role_id, :shift_id,
                    :username, :password, :age, :address, :status, :gender, :birthdate
                )
            ");

            // Bind parameters
            $stmt->bindParam(":fname", $fname, PDO::PARAM_STR);
            $stmt->bindParam(":mname", $mname, PDO::PARAM_STR);
            $stmt->bindParam(":lname", $lname, PDO::PARAM_STR);
            $stmt->bindParam(":email", $email, PDO::PARAM_STR);
            $stmt->bindParam(":contact_num", $contact, PDO::PARAM_STR);
            $stmt->bindParam(":role_id", $role_id, PDO::PARAM_INT);
            if ($shift_id !== null) {
                $stmt->bindValue(":shift_id", $shift_id, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(":shift_id", null, PDO::PARAM_NULL);
            }
            $stmt->bindParam(":username", $username, PDO::PARAM_STR);
            $stmt->bindParam(":password", $hashedPassword, PDO::PARAM_STR);
            $stmt->bindParam(":age", $age, PDO::PARAM_INT);
            $stmt->bindParam(":address", $address, PDO::PARAM_STR);
            $stmt->bindParam(":status", $status, PDO::PARAM_STR);
            $stmt->bindParam(":gender", $gender, PDO::PARAM_STR);
            $stmt->bindParam(":birthdate", $birthdate, PDO::PARAM_STR);

            // Execute the statement
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Employee added successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to add employee"]);
            }

        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
        }
        break;

        case 'login':
            try {
                $username = isset($data['username']) ? trim($data['username']) : '';
                $password = isset($data['password']) ? trim($data['password']) : '';
                $captcha = isset($data['captcha']) ? trim($data['captcha']) : '';
                $captchaAnswer = isset($data['captchaAnswer']) ? trim($data['captchaAnswer']) : '';
    
                // Validate inputs
                if (empty($username) || empty($password)) {
                    echo json_encode(["success" => false, "message" => "Username and password are required"]);
                    exit;
                }
    
                // Verify captcha
                if (empty($captcha) || empty($captchaAnswer) || $captcha !== $captchaAnswer) {
                    echo json_encode(["success" => false, "message" => "Invalid captcha"]);
                    exit;
                }
    
                // Check if user exists (regardless of status)
                $stmt = $conn->prepare("
                    SELECT e.emp_id, e.username, e.password, e.status, e.Fname, e.Lname, e.role_id, e.shift_id, r.role 
                    FROM tbl_employee e 
                    JOIN tbl_role r ON e.role_id = r.role_id 
                    WHERE e.username = :username
                ");
                $stmt->bindParam(":username", $username, PDO::PARAM_STR);
                $stmt->execute();
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
                // If user exists but is inactive, return a specific message
                if ($user && strcasecmp($user['status'] ?? '', 'Active') !== 0) {
                    echo json_encode(["success" => false, "message" => "User is inactive. Please contact the administrator."]);
                    break;
                }
    
                // Check password - handle both hashed and plain text passwords
                $passwordValid = false;
                if ($user) {
                    // First try to verify as hashed password
                    if (password_verify($password, $user['password'])) {
                        $passwordValid = true;
                    } 
                    // If that fails, check if it's a plain text password (for backward compatibility)
                    elseif ($password === $user['password']) {
                        $passwordValid = true;
                    }
                }
    
                if ($user && $passwordValid) {
                    // Start session and store user data
                    session_start();
                    $_SESSION['user_id'] = $user['emp_id'];
                    $_SESSION['username'] = $user['username'];
                    $_SESSION['role'] = $user['role'];
                    $_SESSION['full_name'] = $user['Fname'] . ' ' . $user['Lname'];
    
                    // Log login activity to tbl_login
                    try {
                        $loginStmt = $conn->prepare("
                            INSERT INTO tbl_login (emp_id, role_id, username, login_time, login_date, ip_address) 
                            VALUES (:emp_id, :role_id, :username, NOW(), CURDATE(), :ip_address)
                        ");
                        
                        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
                        
                        $loginStmt->bindParam(':emp_id', $user['emp_id'], PDO::PARAM_INT);
                        $loginStmt->bindParam(':role_id', $user['role_id'], PDO::PARAM_INT);
                        $loginStmt->bindParam(':username', $user['username'], PDO::PARAM_STR);
                        $loginStmt->bindParam(':ip_address', $ip_address, PDO::PARAM_STR);
                        
                        $loginStmt->execute();
                        
                        // Store login_id in session for logout tracking
                        $_SESSION['login_id'] = $conn->lastInsertId();
                        $login_id_inserted = $_SESSION['login_id'];
                        
                    } catch (Exception $loginLogError) {
                        error_log("Login logging error: " . $loginLogError->getMessage());
                        // Continue with login even if logging fails
                    }
    
                    // Terminal/location handling: prefer explicit route, else infer from role
                    $route = strtolower(trim($data['route'] ?? ''));
                    $location_label = null;
                    $terminal_name = null;
                    if ($route !== '') {
                        if (strpos($route, 'pos_convenience') !== false) { $location_label = 'convenience'; $terminal_name = 'Convenience POS'; }
                        elseif (strpos($route, 'pos_pharmacy') !== false) { $location_label = 'pharmacy'; $terminal_name = 'Pharmacy POS'; }
                        elseif (strpos($route, 'inventory_con') !== false) { $location_label = 'inventory'; $terminal_name = 'Inventory Terminal'; }
                        elseif (strpos($route, 'admin') !== false) { $location_label = 'admin'; $terminal_name = 'Admin Terminal'; }
                    }
                    if (!$terminal_name) {
                        $roleLower = strtolower((string)($user['role'] ?? ''));
                        if (strpos($roleLower, 'cashier') !== false || strpos($roleLower, 'pos') !== false) { $location_label = 'convenience'; $terminal_name = 'Convenience POS'; }
                        elseif (strpos($roleLower, 'pharmacist') !== false) { $location_label = 'pharmacy'; $terminal_name = 'Pharmacy POS'; }
                        elseif (strpos($roleLower, 'inventory') !== false) { $location_label = 'inventory'; $terminal_name = 'Inventory Terminal'; }
                        else { $location_label = 'admin'; $terminal_name = 'Admin Terminal'; }
                    }
    
                    $terminal_id = null;
                    if ($terminal_name) {
                        try {
                            // Ensure terminal exists and update shift
                            $termSel = $conn->prepare("SELECT terminal_id, shift_id FROM tbl_pos_terminal WHERE terminal_name = :name LIMIT 1");
                            $termSel->execute([':name' => $terminal_name]);
                            $term = $termSel->fetch(PDO::FETCH_ASSOC);
                            $user_shift_id = $user['shift_id'] ?? null;
                            if ($term) {
                                $terminal_id = (int)$term['terminal_id'];
                                if ($user_shift_id && (int)$term['shift_id'] !== (int)$user_shift_id) {
                                    $upd = $conn->prepare("UPDATE tbl_pos_terminal SET shift_id = :shift WHERE terminal_id = :tid");
                                    $upd->execute([':shift' => $user_shift_id, ':tid' => $terminal_id]);
                                }
                            } else {
                                $ins = $conn->prepare("INSERT INTO tbl_pos_terminal (terminal_name, shift_id) VALUES (:name, :shift)");
                                $ins->execute([':name' => $terminal_name, ':shift' => $user_shift_id]);
                                $terminal_id = (int)$conn->lastInsertId();
                            }
    
                            // Optionally annotate login row with location/terminal if columns exist
                            if (!empty($login_id_inserted)) {
                                try {
                                    $tryUpd = $conn->prepare("UPDATE tbl_login SET location = :loc WHERE login_id = :lid");
                                    $tryUpd->execute([':loc' => $location_label, ':lid' => $login_id_inserted]);
                                } catch (Exception $ignore) {}
                                try {
                                    $tryUpd2 = $conn->prepare("UPDATE tbl_login SET terminal_id = :tid WHERE login_id = :lid");
                                    $tryUpd2->execute([':tid' => $terminal_id, ':lid' => $login_id_inserted]);
                                } catch (Exception $ignore) {}
                                try {
                                    $tryUpd3 = $conn->prepare("UPDATE tbl_login SET shift_id = :sid WHERE login_id = :lid");
                                    $tryUpd3->execute([':sid' => $user_shift_id, ':lid' => $login_id_inserted]);
                                } catch (Exception $ignore) {}
                            }
                        } catch (Exception $terminalError) {
                            error_log('Terminal handling error: ' . $terminalError->getMessage());
                        }
                    }
    
                    echo json_encode([
                        "success" => true,
                        "message" => "Login successful",
                        "role" => $user['role'],
                        "user_id" => $user['emp_id'],
                        "full_name" => $user['Fname'] . ' ' . $user['Lname'],
                        "terminal_id" => $terminal_id,
                        "terminal_name" => $terminal_name,
                        "location" => $location_label,
                        "shift_id" => $user['shift_id'] ?? null
                    ]);
                } else {
                    echo json_encode(["success" => false, "message" => "Invalid username or password"]);
                }
    
            } catch (Exception $e) {
                echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
            }
            break;
        try {
            $username = isset($data['username']) ? trim($data['username']) : '';
            $password = isset($data['password']) ? trim($data['password']) : '';
            $captcha = isset($data['captcha']) ? trim($data['captcha']) : '';
            $captchaAnswer = isset($data['captchaAnswer']) ? trim($data['captchaAnswer']) : '';

            // Validate inputs
            if (empty($username) || empty($password)) {
                echo json_encode(["success" => false, "message" => "Username and password are required"]);
                exit;
            }

            // Verify captcha
            if (empty($captcha) || empty($captchaAnswer) || $captcha !== $captchaAnswer) {
                echo json_encode(["success" => false, "message" => "Invalid captcha"]);
                exit;
            }

            // Check if user exists (regardless of status)
            $stmt = $conn->prepare("
                SELECT e.emp_id, e.username, e.password, e.status, e.Fname, e.Lname, e.role_id, e.shift_id, r.role 
                FROM tbl_employee e 
                JOIN tbl_role r ON e.role_id = r.role_id 
                WHERE e.username = :username
            ");
            $stmt->bindParam(":username", $username, PDO::PARAM_STR);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            // If user exists but is inactive, return a specific message
            if ($user && strcasecmp($user['status'] ?? '', 'Active') !== 0) {
                echo json_encode(["success" => false, "message" => "User is inactive. Please contact the administrator."]);
                break;
            }

            // Check password - handle both hashed and plain text passwords
            $passwordValid = false;
            if ($user) {
                // First try to verify as hashed password
                if (password_verify($password, $user['password'])) {
                    $passwordValid = true;
                } 
                // If that fails, check if it's a plain text password (for backward compatibility)
                elseif ($password === $user['password']) {
                    $passwordValid = true;
                }
            }

            if ($user && $passwordValid) {
                // Start session and store user data
                session_start();
                $_SESSION['user_id'] = $user['emp_id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['full_name'] = $user['Fname'] . ' ' . $user['Lname'];

                // Log login activity to tbl_login
                try {
                    $loginStmt = $conn->prepare("
                        INSERT INTO tbl_login (emp_id, role_id, username, login_time, login_date, ip_address) 
                        VALUES (:emp_id, :role_id, :username, NOW(), CURDATE(), :ip_address)
                    ");
                    
                    $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
                    
                    $loginStmt->bindParam(':emp_id', $user['emp_id'], PDO::PARAM_INT);
                    $loginStmt->bindParam(':role_id', $user['role_id'], PDO::PARAM_INT);
                    $loginStmt->bindParam(':username', $user['username'], PDO::PARAM_STR);
                    $loginStmt->bindParam(':ip_address', $ip_address, PDO::PARAM_STR);
                    
                    $loginStmt->execute();
                    
                    // Store login_id in session for logout tracking
                    $_SESSION['login_id'] = $conn->lastInsertId();
                    $login_id_inserted = $_SESSION['login_id'];
                    
                } catch (Exception $loginLogError) {
                    error_log("Login logging error: " . $loginLogError->getMessage());
                    // Continue with login even if logging fails
                }

                // Terminal/location handling: prefer explicit route, else infer from role
                $route = strtolower(trim($data['route'] ?? ''));
                $location_label = null;
                $terminal_name = null;
                if ($route !== '') {
                    if (strpos($route, 'pos_convenience') !== false) { $location_label = 'convenience'; $terminal_name = 'Convenience POS'; }
                    elseif (strpos($route, 'pos_pharmacy') !== false) { $location_label = 'pharmacy'; $terminal_name = 'Pharmacy POS'; }
                    elseif (strpos($route, 'inventory_con') !== false) { $location_label = 'inventory'; $terminal_name = 'Inventory Terminal'; }
                    elseif (strpos($route, 'admin') !== false) { $location_label = 'admin'; $terminal_name = 'Admin Terminal'; }
                }
                if (!$terminal_name) {
                    $roleLower = strtolower((string)($user['role'] ?? ''));
                    if (strpos($roleLower, 'cashier') !== false || strpos($roleLower, 'pos') !== false) { $location_label = 'convenience'; $terminal_name = 'Convenience POS'; }
                    elseif (strpos($roleLower, 'pharmacist') !== false) { $location_label = 'pharmacy'; $terminal_name = 'Pharmacy POS'; }
                    elseif (strpos($roleLower, 'inventory') !== false) { $location_label = 'inventory'; $terminal_name = 'Inventory Terminal'; }
                    else { $location_label = 'admin'; $terminal_name = 'Admin Terminal'; }
                }

                $terminal_id = null;
                if ($terminal_name) {
                    try {
                        // Ensure terminal exists and update shift
                        $termSel = $conn->prepare("SELECT terminal_id, shift_id FROM tbl_pos_terminal WHERE terminal_name = :name LIMIT 1");
                        $termSel->execute([':name' => $terminal_name]);
                        $term = $termSel->fetch(PDO::FETCH_ASSOC);
                        $user_shift_id = $user['shift_id'] ?? null;
                        if ($term) {
                            $terminal_id = (int)$term['terminal_id'];
                            if ($user_shift_id && (int)$term['shift_id'] !== (int)$user_shift_id) {
                                $upd = $conn->prepare("UPDATE tbl_pos_terminal SET shift_id = :shift WHERE terminal_id = :tid");
                                $upd->execute([':shift' => $user_shift_id, ':tid' => $terminal_id]);
                            }
                        } else {
                            $ins = $conn->prepare("INSERT INTO tbl_pos_terminal (terminal_name, shift_id) VALUES (:name, :shift)");
                            $ins->execute([':name' => $terminal_name, ':shift' => $user_shift_id]);
                            $terminal_id = (int)$conn->lastInsertId();
                        }

                        // Optionally annotate login row with location/terminal if columns exist
                        if (!empty($login_id_inserted)) {
                            try {
                                $tryUpd = $conn->prepare("UPDATE tbl_login SET location = :loc WHERE login_id = :lid");
                                $tryUpd->execute([':loc' => $location_label, ':lid' => $login_id_inserted]);
                            } catch (Exception $ignore) {}
                            try {
                                $tryUpd2 = $conn->prepare("UPDATE tbl_login SET terminal_id = :tid WHERE login_id = :lid");
                                $tryUpd2->execute([':tid' => $terminal_id, ':lid' => $login_id_inserted]);
                            } catch (Exception $ignore) {}
                            try {
                                $tryUpd3 = $conn->prepare("UPDATE tbl_login SET shift_id = :sid WHERE login_id = :lid");
                                $tryUpd3->execute([':sid' => $user_shift_id, ':lid' => $login_id_inserted]);
                            } catch (Exception $ignore) {}
                        }
                    } catch (Exception $terminalError) {
                        error_log('Terminal handling error: ' . $terminalError->getMessage());
                    }
                }

                echo json_encode([
                    "success" => true,
                    "message" => "Login successful",
                    "role" => $user['role'],
                    "user_id" => $user['emp_id'],
                    "full_name" => $user['Fname'] . ' ' . $user['Lname'],
                    "terminal_id" => $terminal_id,
                    "terminal_name" => $terminal_name,
                    "location" => $location_label,
                    "shift_id" => $user['shift_id'] ?? null
                ]);
            } else {
                echo json_encode(["success" => false, "message" => "Invalid username or password"]);
            }

        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
        }
        break;

    case 'logout':
        try {
            if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
            }

            $empId = $_SESSION['user_id'] ?? null;
            $loginId = $_SESSION['login_id'] ?? null;
            // Fallback to client-provided emp_id when session cookies aren't present (CORS, different port, etc.)
            if (!$empId && isset($data['emp_id'])) {
                $empId = intval($data['emp_id']);
            }

            try {
                $updated = 0;
                if ($loginId && $empId) {
                    // Update the known session login row
                    $logoutStmt = $conn->prepare("UPDATE tbl_login SET logout_time = CURTIME(), logout_date = CURDATE() WHERE login_id = :login_id AND emp_id = :emp_id");
                    $logoutStmt->bindParam(':login_id', $loginId, PDO::PARAM_INT);
                    $logoutStmt->bindParam(':emp_id', $empId, PDO::PARAM_INT);
                    $logoutStmt->execute();
                    $updated = $logoutStmt->rowCount();
                    error_log('[logout] update by session login_id='.$loginId.' emp_id='.$empId.' affected='.$updated);
                }
                if ($updated === 0 && $empId) {
                    // Fallback: find the most recent OPEN login record for this employee
                    $findStmt = $conn->prepare("SELECT login_id FROM tbl_login WHERE emp_id = :emp_id AND (logout_time IS NULL OR logout_time = '00:00:00') ORDER BY login_id DESC LIMIT 1");
                    $findStmt->bindParam(':emp_id', $empId, PDO::PARAM_INT);
                    $findStmt->execute();
                    $row = $findStmt->fetch(PDO::FETCH_ASSOC);
                    if ($row && isset($row['login_id'])) {
                        $fallbackLogout = $conn->prepare("UPDATE tbl_login SET logout_time = CURTIME(), logout_date = CURDATE() WHERE login_id = :login_id");
                        $fallbackLogout->bindParam(':login_id', $row['login_id'], PDO::PARAM_INT);
                        $fallbackLogout->execute();
                        $updated = $fallbackLogout->rowCount();
                        error_log('[logout] update by open row login_id='.$row['login_id'].' affected='.$updated);
                    }
                }
                if ($updated === 0 && $empId) {
                    // Final fallback: update the most recent row for this employee
                    $findAny = $conn->prepare("SELECT login_id FROM tbl_login WHERE emp_id = :emp_id ORDER BY login_id DESC LIMIT 1");
                    $findAny->bindParam(':emp_id', $empId, PDO::PARAM_INT);
                    $findAny->execute();
                    $last = $findAny->fetch(PDO::FETCH_ASSOC);
                    if ($last && isset($last['login_id'])) {
                        $updAny = $conn->prepare("UPDATE tbl_login SET logout_time = CURTIME(), logout_date = CURDATE() WHERE login_id = :login_id");
                        $updAny->bindParam(':login_id', $last['login_id'], PDO::PARAM_INT);
                        $updAny->execute();
                        error_log('[logout] forced update latest login_id='.$last['login_id'].' affected='.$updAny->rowCount());
                    }
                }
                } catch (Exception $logoutLogError) {
                    error_log("Logout logging error: " . $logoutLogError->getMessage());
            }

            // Clear session only after writing logout record
            $_SESSION = [];
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
            }
            session_destroy();
            
            echo json_encode([
                'success' => true,
                'message' => 'Logout successful'
            ]);
            
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'An error occurred during logout: ' . $e->getMessage()]);
        }
        break;
    case 'register_terminal_route':
        try {
            if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
            $empId = $_SESSION['user_id'] ?? ($data['emp_id'] ?? null);
            $route = strtolower(trim($data['route'] ?? ''));
            if (!$empId || $route === '') {
                echo json_encode(['success' => false, 'message' => 'Missing emp_id or route']);
                break;
            }

            // Get employee shift
            $emp = null;
            try {
                $st = $conn->prepare("SELECT shift_id, role_id FROM tbl_employee WHERE emp_id = :id LIMIT 1");
                $st->execute([':id' => $empId]);
                $emp = $st->fetch(PDO::FETCH_ASSOC);
            } catch (Exception $e) {}
            $user_shift_id = $emp['shift_id'] ?? null;

            // Map route → terminal/location
            $location_label = 'admin';
            $terminal_name = 'Admin Terminal';
            if (strpos($route, 'pos_convenience') !== false) { $location_label = 'convenience'; $terminal_name = 'Convenience POS'; }
            elseif (strpos($route, 'pos_pharmacy') !== false) { $location_label = 'pharmacy'; $terminal_name = 'Pharmacy POS'; }
            elseif (strpos($route, 'inventory_con') !== false) { $location_label = 'inventory'; $terminal_name = 'Inventory Terminal'; }
            elseif (strpos($route, 'admin') !== false) { $location_label = 'admin'; $terminal_name = 'Admin Terminal'; }

            // Ensure terminal exists and update shift
            $termSel = $conn->prepare("SELECT terminal_id, shift_id FROM tbl_pos_terminal WHERE terminal_name = :name LIMIT 1");
            $termSel->execute([':name' => $terminal_name]);
            $term = $termSel->fetch(PDO::FETCH_ASSOC);
            if ($term) {
                $terminal_id = (int)$term['terminal_id'];
                if ($user_shift_id && (int)$term['shift_id'] !== (int)$user_shift_id) {
                    $upd = $conn->prepare("UPDATE tbl_pos_terminal SET shift_id = :shift WHERE terminal_id = :tid");
                    $upd->execute([':shift' => $user_shift_id, ':tid' => $terminal_id]);
                }
            } else {
                $ins = $conn->prepare("INSERT INTO tbl_pos_terminal (terminal_name, shift_id) VALUES (:name, :shift)");
                $ins->execute([':name' => $terminal_name, ':shift' => $user_shift_id]);
                $terminal_id = (int)$conn->lastInsertId();
            }

            // Annotate most recent open login row
            try {
                $findStmt = $conn->prepare("SELECT login_id FROM tbl_login WHERE emp_id = :emp AND (logout_time IS NULL OR logout_time = '00:00:00') ORDER BY login_id DESC LIMIT 1");
                $findStmt->execute([':emp' => $empId]);
                $row = $findStmt->fetch(PDO::FETCH_ASSOC);
                if ($row && isset($row['login_id'])) {
                    try { $upd1 = $conn->prepare("UPDATE tbl_login SET terminal_id = :tid WHERE login_id = :lid"); $upd1->execute([':tid' => $terminal_id, ':lid' => $row['login_id']]); } catch (Exception $e) {}
                    try { $upd2 = $conn->prepare("UPDATE tbl_login SET location = :loc WHERE login_id = :lid"); $upd2->execute([':loc' => $location_label, ':lid' => $row['login_id']]); } catch (Exception $e) {}
                    try { if ($user_shift_id) { $upd3 = $conn->prepare("UPDATE tbl_login SET shift_id = :sid WHERE login_id = :lid"); $upd3->execute([':sid' => $user_shift_id, ':lid' => $row['login_id']]); } } catch (Exception $e) {}
                }
            } catch (Exception $e) {}

            echo json_encode(['success' => true, 'data' => [
                'terminal_id' => $terminal_id,
                'terminal_name' => $terminal_name,
                'location' => $location_label,
                'shift_id' => $user_shift_id
            ]]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
        break;
    case 'get_login_activity':
        try {
            $limit = isset($data['limit']) ? intval($data['limit']) : 200;
            $search = isset($data['search']) ? trim($data['search']) : '';
            $date_from = isset($data['date_from']) ? trim($data['date_from']) : '';
            $date_to = isset($data['date_to']) ? trim($data['date_to']) : '';

            $clauses = [];
            $params = [];

            if ($search !== '') {
                $clauses[] = '(l.username LIKE ? OR e.Fname LIKE ? OR e.Lname LIKE ?)';
                $term = "%$search%";
                $params[] = $term; $params[] = $term; $params[] = $term;
            }
            if ($date_from !== '') { $clauses[] = 'l.login_date >= ?'; $params[] = $date_from; }
            if ($date_to !== '') { $clauses[] = 'l.login_date <= ?'; $params[] = $date_to; }

            $whereSql = count($clauses) ? ('WHERE ' . implode(' AND ', $clauses)) : '';

            $sql = "
                SELECT 
                    l.login_id, l.emp_id, l.role_id, l.username,
                    l.login_time, l.login_date, l.logout_time, l.logout_date,
                    l.ip_address,
                    e.Fname, e.Lname, r.role,
                    -- Compute terminal/location label without requiring extra columns
                    CASE 
                        WHEN LOWER(r.role) LIKE '%admin%' THEN 'Admin Terminal'
                        WHEN LOWER(r.role) LIKE '%cashier%' OR LOWER(r.role) LIKE '%pos%' THEN 'Convenience POS'
                        WHEN LOWER(r.role) LIKE '%pharmacist%' THEN 'Pharmacy POS'
                        WHEN LOWER(r.role) LIKE '%inventory%' THEN 'Inventory Terminal'
                        ELSE 'Admin Terminal'
                    END AS terminal_name
                FROM tbl_login l
                LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id
                LEFT JOIN tbl_role r ON l.role_id = r.role_id
                $whereSql
                ORDER BY l.login_id DESC
                LIMIT $limit
            ";

            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $rowCount = is_array($rows) ? count($rows) : 0;
            
            // If no rows, try a fallback simple query (helps diagnose join/data issues)
            $fallback = [];
            if ($rowCount === 0) {
                $fb = $conn->prepare("SELECT * FROM tbl_login ORDER BY login_id DESC LIMIT 5");
                $fb->execute();
                $fallback = $fb->fetchAll(PDO::FETCH_ASSOC);
            }

            // Debug: log how many rows were found
            error_log('[get_login_activity] rows=' . $rowCount . ', fallback=' . count($fallback));

            echo json_encode(['success' => true, 'data' => $rows, 'fallback' => $fallback]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage(), 'data' => []]);
        }
        break;

    case 'get_login_activity_count':
        try {
            // Count today's logins and logouts (each recorded row counts once; rows with today's logout but older login also counted)
            $stmt = $conn->prepare("SELECT 
                    SUM(CASE WHEN login_date = CURDATE() THEN 1 ELSE 0 END) AS logins_today,
                    SUM(CASE WHEN logout_date = CURDATE() THEN 1 ELSE 0 END) AS logouts_today
                FROM tbl_login");
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['logins_today' => 0, 'logouts_today' => 0];
            $total = (int)$row['logins_today'] + (int)$row['logouts_today'];
            echo json_encode(['success' => true, 'data' => ['logins_today' => (int)$row['logins_today'], 'logouts_today' => (int)$row['logouts_today'], 'total' => $total]]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage(), 'data' => ['logins_today' => 0, 'logouts_today' => 0, 'total' => 0]]);
        }
        break;
    // --- Activity Logs: write and read generic system activities ---
    case 'log_activity':
        try {
            // Ensure table exists (idempotent)
            $conn->exec("CREATE TABLE IF NOT EXISTS tbl_activity_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                username VARCHAR(255) NULL,
                role VARCHAR(100) NULL,
                activity_type VARCHAR(100) NOT NULL,
                activity_description TEXT NULL,
                table_name VARCHAR(255) NULL,
                record_id INT NULL,
                date_created DATE NOT NULL,
                time_created TIME NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            $user_id = isset($data['user_id']) ? $data['user_id'] : null;
            $username = isset($data['username']) ? trim($data['username']) : null;
            $role = isset($data['role']) ? trim($data['role']) : null;
            $activity_type = isset($data['activity_type']) ? trim($data['activity_type']) : '';
            $activity_description = isset($data['description']) ? trim($data['description']) : null;
            $table_name = isset($data['table_name']) ? trim($data['table_name']) : null;
            $record_id = isset($data['record_id']) ? $data['record_id'] : null;

            if ($activity_type === '') {
                echo json_encode(["success" => false, "message" => "activity_type is required"]);
                break;
            }

            $date_created = date('Y-m-d');
            $time_created = date('H:i:s');

            $stmt = $conn->prepare("INSERT INTO tbl_activity_log (user_id, username, role, activity_type, activity_description, table_name, record_id, date_created, time_created) VALUES (:user_id, :username, :role, :activity_type, :activity_description, :table_name, :record_id, :date_created, :time_created)");
            $stmt->bindValue(':user_id', $user_id !== null && $user_id !== '' ? $user_id : null, $user_id !== null && $user_id !== '' ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $stmt->bindValue(':username', $username !== null && $username !== '' ? $username : null, $username !== null && $username !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':role', $role !== null && $role !== '' ? $role : null, $role !== null && $role !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindParam(':activity_type', $activity_type, PDO::PARAM_STR);
            $stmt->bindValue(':activity_description', $activity_description !== null && $activity_description !== '' ? $activity_description : null, $activity_description !== null && $activity_description !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':table_name', $table_name !== null && $table_name !== '' ? $table_name : null, $table_name !== null && $table_name !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':record_id', $record_id !== null && $record_id !== '' ? $record_id : null, $record_id !== null && $record_id !== '' ? PDO::PARAM_INT : PDO::PARAM_NULL);
            $stmt->bindParam(':date_created', $date_created, PDO::PARAM_STR);
            $stmt->bindParam(':time_created', $time_created, PDO::PARAM_STR);
            $stmt->execute();

            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Error logging activity: " . $e->getMessage()]);
        }
        break;

    case 'get_activity_logs':
        try {
            // Ensure table exists for safe reads
            $conn->exec("CREATE TABLE IF NOT EXISTS tbl_activity_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                username VARCHAR(255) NULL,
                role VARCHAR(100) NULL,
                activity_type VARCHAR(100) NOT NULL,
                activity_description TEXT NULL,
                table_name VARCHAR(255) NULL,
                record_id INT NULL,
                date_created DATE NOT NULL,
                time_created TIME NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            $limit = isset($data['limit']) ? max(1, intval($data['limit'])) : 200;
            $search = isset($data['search']) ? trim($data['search']) : '';
            $date_from = isset($data['date_from']) ? trim($data['date_from']) : '';
            $date_to = isset($data['date_to']) ? trim($data['date_to']) : '';

            $where = [];
            $params = [];
            if ($search !== '') {
                $where[] = "(username LIKE :s OR role LIKE :s OR activity_type LIKE :s OR activity_description LIKE :s)";
                $params[':s'] = '%' . $search . '%';
            }
            if ($date_from !== '') {
                $where[] = "date_created >= :df";
                $params[':df'] = $date_from;
            }
            if ($date_to !== '') {
                $where[] = "date_created <= :dt";
                $params[':dt'] = $date_to;
            }
            $whereSql = count($where) ? ('WHERE ' . implode(' AND ', $where)) : '';

            $sql = "SELECT id, user_id, username, role, activity_type, activity_description, table_name, record_id, date_created, time_created, created_at FROM tbl_activity_log $whereSql ORDER BY created_at DESC, id DESC LIMIT :lim";
            $stmt = $conn->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "data" => $rows]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Error getting activity logs: " . $e->getMessage(), "data" => []]);
        }
        break;

    case 'get_all_logs':
        try {
            $limit = isset($data['limit']) ? max(1, intval($data['limit'])) : 500;
            $search = isset($data['search']) ? trim($data['search']) : '';
            $date_from = isset($data['date_from']) ? trim($data['date_from']) : '';
            $date_to = isset($data['date_to']) ? trim($data['date_to']) : '';

            // Ensure table exists and add sample data if empty
            $conn->exec("CREATE TABLE IF NOT EXISTS tbl_activity_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                username VARCHAR(255) NULL,
                role VARCHAR(100) NULL,
                activity_type VARCHAR(100) NOT NULL,
                activity_description TEXT NULL,
                table_name VARCHAR(255) NULL,
                record_id INT NULL,
                date_created DATE NOT NULL,
                time_created TIME NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
            
            // Check if table is empty and add sample data
            $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_activity_log");
            $countStmt->execute();
            $count = $countStmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($count == 0) {
                // Add sample data for testing
                $sampleData = [
                    ['STOCK_ADJUSTMENT_CREATED', 'Stock Addition: 100 units of Medicine ABC (Reason: New delivery)', 'admin', 'Admin'],
                    ['INVENTORY_TRANSFER_CREATED', 'Transfer created from Warehouse to Convenience Store: 5 products', 'inventory', 'Inventory'],
                    ['POS_SALE_SAVED', 'POS Sale completed: Transaction TXN-2024001 - ₱250.00 (CASH, 3 items) at Convenience POS', 'cashier', 'Cashier'],
                    ['WAREHOUSE_STOCK_UPDATED', 'Warehouse stock updated: Product ID 45, Quantity: 50, Batch: BTH-001', 'inventory', 'Inventory'],
                    ['USER_ACTIVATED', 'Activated user ezay (ID 1)', 'admin', 'Admin']
                ];
                
                $insertSample = $conn->prepare("INSERT INTO tbl_activity_log (activity_type, activity_description, username, role, date_created, time_created) VALUES (?, ?, ?, ?, CURDATE(), CURTIME())");
                foreach ($sampleData as $sample) {
                    $insertSample->execute($sample);
                }
            }

            // Fetch activity logs
            $paramsAct = [];
            $whereAct = [];
            if ($search !== '') {
                $whereAct[] = "(username LIKE :s OR role LIKE :s OR activity_type LIKE :s OR activity_description LIKE :s)";
                $paramsAct[':s'] = '%' . $search . '%';
            }
            if ($date_from !== '') { $whereAct[] = "date_created >= :df"; $paramsAct[':df'] = $date_from; }
            if ($date_to !== '') { $whereAct[] = "date_created <= :dt"; $paramsAct[':dt'] = $date_to; }
            $whereActSql = count($whereAct) ? ('WHERE ' . implode(' AND ', $whereAct)) : '';
            $stmtAct = $conn->prepare("SELECT date_created, time_created, username, role, activity_type AS action, activity_description AS description FROM tbl_activity_log $whereActSql ORDER BY created_at DESC, id DESC LIMIT :limAct");
            foreach ($paramsAct as $k => $v) { $stmtAct->bindValue($k, $v); }
            $limAct = min($limit, 300);
            $stmtAct->bindValue(':limAct', $limAct, PDO::PARAM_INT);
            $stmtAct->execute();
            $activity = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

            // Fetch inventory movement history
            $movementData = [];
            try {
                $paramsMovement = [];
                $whereMovement = [];
                if ($search !== '') {
                    $whereMovement[] = "(p.product_name LIKE :s OR p.barcode LIKE :s OR sm.created_by LIKE :s)";
                    $paramsMovement[':s'] = '%' . $search . '%';
                }
                if ($date_from !== '') { $whereMovement[] = "DATE(sm.movement_date) >= :df"; $paramsMovement[':df'] = $date_from; }
                if ($date_to !== '') { $whereMovement[] = "DATE(sm.movement_date) <= :dt"; $paramsMovement[':dt'] = $date_to; }
                $whereMovementSql = count($whereMovement) ? ('WHERE ' . implode(' AND ', $whereMovement)) : '';

                $stmtMovement = $conn->prepare("
                    SELECT 
                        DATE(sm.movement_date) as date_created,
                        TIME(sm.movement_date) as time_created,
                        sm.created_by as username,
                        'Inventory' as role,
                        CONCAT('STOCK_', UPPER(sm.movement_type)) as action,
                        CONCAT(
                            CASE sm.movement_type
                                WHEN 'IN' THEN '📦 Stock Added: '
                                WHEN 'OUT' THEN '📤 Stock Removed: '
                                ELSE '📊 Stock Movement: '
                            END,
                            sm.quantity, ' units of ', p.product_name,
                            CASE WHEN sm.notes IS NOT NULL THEN CONCAT(' (', sm.notes, ')') ELSE '' END
                        ) as description
                    FROM tbl_stock_movements sm
                    LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                    $whereMovementSql
                    ORDER BY sm.movement_date DESC
                    LIMIT :limMovement
                ");
                foreach ($paramsMovement as $k => $v) { $stmtMovement->bindValue($k, $v); }
                $limMovement = min($limit, 100);
                $stmtMovement->bindValue(':limMovement', $limMovement, PDO::PARAM_INT);
                $stmtMovement->execute();
                $movementData = $stmtMovement->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                // Continue even if movement data fails
                error_log("Movement data fetch failed: " . $e->getMessage());
            }

            // Fetch inventory transfer history
            $transferData = [];
            try {
                $paramsTransfer = [];
                $whereTransfer = [];
                if ($search !== '') {
                    $whereTransfer[] = "(th.transferred_by LIKE :s OR sl.location_name LIKE :s OR dl.location_name LIKE :s)";
                    $paramsTransfer[':s'] = '%' . $search . '%';
                }
                if ($date_from !== '') { $whereTransfer[] = "DATE(th.date) >= :df"; $paramsTransfer[':df'] = $date_from; }
                if ($date_to !== '') { $whereTransfer[] = "DATE(th.date) <= :dt"; $paramsTransfer[':dt'] = $date_to; }
                $whereTransferSql = count($whereTransfer) ? ('WHERE ' . implode(' AND ', $whereTransfer)) : '';

                $stmtTransfer = $conn->prepare("
                    SELECT 
                        DATE(th.date) as date_created,
                        TIME(th.date) as time_created,
                        th.transferred_by as username,
                        'Inventory' as role,
                        'INVENTORY_TRANSFER' as action,
                        CONCAT(
                            '🚛 Transfer #', th.transfer_header_id, ': ',
                            sl.location_name, ' → ', dl.location_name,
                            ' (Status: ', UPPER(th.status), ')'
                        ) as description
                    FROM tbl_transfer_header th
                    LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                    LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                    $whereTransferSql
                    ORDER BY th.date DESC
                    LIMIT :limTransfer
                ");
                foreach ($paramsTransfer as $k => $v) { $stmtTransfer->bindValue($k, $v); }
                $limTransfer = min($limit, 100);
                $stmtTransfer->bindValue(':limTransfer', $limTransfer, PDO::PARAM_INT);
                $stmtTransfer->execute();
                $transferData = $stmtTransfer->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                // Continue even if transfer data fails
                error_log("Transfer data fetch failed: " . $e->getMessage());
            }

            // Fetch login activity; materialize both login and logout as separate entries
            $paramsLogin = [];
            $whereLogin = [];
            if ($search !== '') {
                $whereLogin[] = "(l.username LIKE :s OR r.role_name LIKE :s OR e.Fname LIKE :s OR e.Lname LIKE :s)";
                $paramsLogin[':s'] = '%' . $search . '%';
            }
            if ($date_from !== '') { $whereLogin[] = "l.login_date >= :df"; $paramsLogin[':df'] = $date_from; }
            if ($date_to !== '') { $whereLogin[] = "l.login_date <= :dt"; $paramsLogin[':dt'] = $date_to; }
            $whereLoginSql = count($whereLogin) ? ('WHERE ' . implode(' AND ', $whereLogin)) : '';
            $stmtLogin = $conn->prepare("SELECT l.login_date, l.login_time, l.logout_date, l.logout_time, l.username, r.role_name AS role FROM tbl_login l LEFT JOIN tbl_role r ON l.role_id = r.role_id LEFT JOIN tbl_employee e ON l.emp_id = e.emp_id $whereLoginSql ORDER BY l.login_id DESC LIMIT :limLogin");
            foreach ($paramsLogin as $k => $v) { $stmtLogin->bindValue($k, $v); }
            $limLogin = min($limit, 500);
            $stmtLogin->bindValue(':limLogin', $limLogin, PDO::PARAM_INT);
            $stmtLogin->execute();
            $loginRows = $stmtLogin->fetchAll(PDO::FETCH_ASSOC);

            $logs = [];
            foreach ($loginRows as $lr) {
                // login record
                $logs[] = [
                    'login_date' => $lr['login_date'],
                    'login_time' => $lr['login_time'],
                    'username' => $lr['username'],
                    'role' => $lr['role'],
                    'log_activity' => 'login',
                    'description' => 'login'
                ];
                // logout record if present
                if (!empty($lr['logout_date']) && !empty($lr['logout_time'])) {
                    $logs[] = [
                        'login_date' => $lr['logout_date'],
                        'login_time' => $lr['logout_time'],
                        'username' => $lr['username'],
                        'role' => $lr['role'],
                        'log_activity' => 'logout',
                        'description' => 'logout'
                    ];
                }
            }

            // Normalize login logs to match the format of other logs
            foreach ($logs as &$log) {
                if (isset($log['login_date']) && !isset($log['date_created'])) {
                    $log['date_created'] = $log['login_date'];
                    $log['time_created'] = $log['login_time'];
                    $log['action'] = $log['log_activity'];
                    unset($log['login_date'], $log['login_time'], $log['log_activity']);
                }
            }

            // Merge all data sources: activity logs, movement data, transfer data, and login logs
            $allLogs = array_merge($activity, $movementData, $transferData, $logs);

            // Sort all logs by date/time descending
            usort($allLogs, function ($x, $y) {
                $dx = $x['date_created'] ?? '';
                $tx = $x['time_created'] ?? '';
                $dy = $y['date_created'] ?? '';
                $ty = $y['time_created'] ?? '';
                $sx = strtotime($dx . ' ' . $tx);
                $sy = strtotime($dy . ' ' . $ty);
                return $sy <=> $sx;
            });

            // Apply overall limit
            if (count($allLogs) > $limit) {
                $allLogs = array_slice($allLogs, 0, $limit);
            }

            echo json_encode(["success" => true, "data" => $allLogs]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Error getting all logs: " . $e->getMessage(), "data" => []]);
        }
        break;

    case 'generate_captcha':
        try {
            // Generate simple addition captcha only
            $num1 = rand(1, 15);
            $num2 = rand(1, 15);
            $answer = $num1 + $num2;
            
            $question = "What is $num1 + $num2?";
            
            // Ensure answer is always a number
            $answer = (int)$answer;
            
            // Log for debugging
            error_log("Captcha generated - Question: $question, Answer: $answer, Type: " . gettype($answer));
            
            echo json_encode([
                "success" => true,
                "question" => $question,
                "answer" => $answer
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Error generating captcha: " . $e->getMessage()
            ]);
        }
        break;
    case 'display_employee':
        try {
            $stmt = $conn->prepare("SELECT emp_id,Fname,Mname,Lname,email,contact_num,role_id,shift_id,username,age,address,status,gender,birthdate FROM tbl_employee");
            $stmt->execute();
            $employee = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($employee) {
                echo json_encode([
                    "success" => true,
                    "employees" => $employee
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "employees" => [],
                    "message" => "No employees found"
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "employees" => []
            ]);
        }
        break;

    case 'update_employee_status':
        try {
            $emp_id = isset($data['id']) ? trim($data['id']) : '';
            $newStatus = isset($data['status']) ? trim($data['status']) : '';

            $stmt = $conn->prepare("UPDATE tbl_employee SET status = :status WHERE emp_id = :id");
            $stmt->bindParam(":status", $newStatus, PDO::PARAM_STR);
            $stmt->bindParam(":id", $emp_id, PDO::PARAM_INT);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Status updated successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to update status"]);
            }
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;
        //convenience
    case 'add_convenience_product':
        try{
             $product_name = isset($data['product_name'])&& !empty($data['product_name']) ? trim($data['product_name']) : '';
            $category = isset($data['category']) && !empty($data['category'])? trim($data['category']) : '';
            $barcode = isset($data['barcode']) && !empty($data['barcode'])? trim($data['barcode']) : '';
            $description = isset($data['description']) && !empty($data['description']) ? trim($data['description']) : '';
            $expiration = isset($data['expiration']) && !empty($data['expiration']) ? trim($data['expiration']) : '';

            $quantity = isset($data['quantity']) && !empty($data['quantity']) ? trim($data['quantity']) : '';
            $unit_price = isset($data['unit_price']) && !empty($data['unit_price']) ? trim($data['unit_price']) : '';
            $brand = isset($data['brand_id']) && !empty($data['brand_id']) ? trim($data['brand_id']) : '';
           
           

            // Prepare the SQL statement
            $stmt = $conn->prepare("
                INSERT INTO tbl_product (
                    product_name, category, barcode, description, expiration, quantity, unit_price,
                    brand_id
                ) VALUES (
                    :product_name, :category, :barcode, :description, :expiration, :quantity, :unit_price,
                    :brand_id
                )
            ");

            // Bind parameters
            $stmt->bindParam(":product_name", $product_name, PDO::PARAM_STR);
            $stmt->bindParam(":category", $category, PDO::PARAM_STR);
            $stmt->bindParam(":barcode", $barcode, PDO::PARAM_STR);
            $stmt->bindParam(":description", $description, PDO::PARAM_STR);
            $stmt->bindParam(":expiration", $expiration, PDO::PARAM_STR);
            $stmt->bindParam(":quantity", $quantity, PDO::PARAM_INT);
            $stmt->bindParam(":unit_price", $unit_price, PDO::PARAM_INT);
            $stmt->bindParam(":brand_id", $brand, PDO::PARAM_STR);
           
            // Execute the statement
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Product added successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to add product"]);
            }

        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
        }
        break;
    //pharmacy
    case 'add_pharmacy_product':
        try{
            $product_name = isset($data['product_name'])&& !empty($data['product_name']) ? trim($data['product_name']) : '';
            $category = isset($data['category']) && !empty($data['category'])? trim($data['category']) : '';
            $barcode = isset($data['barcode']) && !empty($data['barcode'])? trim($data['barcode']) : '';
            $description = isset($data['description']) && !empty($data['description']) ? trim($data['description']) : '';
            $prescription = isset($data['prescription']) && !empty($data['prescription']) ? trim($data['prescription']) : '';
            $expiration = isset($data['expiration']) && !empty($data['expiration']) ? trim($data['expiration']) : '';
            $quantity = isset($data['quantity']) && !empty($data['quantity']) ? trim($data['quantity']) : '';
            $unit_price = isset($data['unit_price']) && !empty($data['unit_price']) ? trim($data['unit_price']) : '';
            $brand = isset($data['brand_id']) && !empty($data['brand_id']) ? trim($data['brand_id']) : '';
           
           

            // Prepare the SQL statement
            $stmt = $conn->prepare("
                INSERT INTO tbl_product (
                    product_name, category, barcode, description, prescription, expiration, quantity, unit_price,
                    brand_id
                ) VALUES (
                    :product_name, :category, :barcode, :description, :prescription, :expiration, :quantity, :unit_price,
                    :brand_id
                )
            ");

            // Bind parameters
            $stmt->bindParam(":product_name", $product_name, PDO::PARAM_STR);
            $stmt->bindParam(":category", $category, PDO::PARAM_STR);
            $stmt->bindParam(":barcode", $barcode, PDO::PARAM_STR);
            $stmt->bindParam(":description", $description, PDO::PARAM_STR);
            $stmt->bindParam(":prescription", $prescription, PDO::PARAM_STR);
            $stmt->bindParam(":expiration", $expiration, PDO::PARAM_STR);
            $stmt->bindParam(":quantity", $quantity, PDO::PARAM_INT);
            $stmt->bindParam(":unit_price", $unit_price, PDO::PARAM_INT);
            $stmt->bindParam(":brand_id", $brand, PDO::PARAM_STR);
           
            // Execute the statement
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Product added successfully"]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to add product"]);
            }

        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
        }
        break;
    //brand section
    case 'addBrand':
    try {
        $brand_name = isset($data['brand']) && !empty($data['brand']) ? trim($data['brand']) : '';

        // Validate input
        if (!$brand_name) {
            echo json_encode(["success" => false, "message" => "Brand name is required"]);
            exit;
        }

        // Check for duplicates
        $checkStmt = $conn->prepare("SELECT * FROM tbl_brand WHERE brand = :brand");
        $checkStmt->bindParam(":brand", $brand_name, PDO::PARAM_STR);
        $checkStmt->execute();
        if ($checkStmt->rowCount() > 0) {
            echo json_encode(["success" => false, "message" => "Brand already exists"]);
            exit;
        }

        // Insert new brand
        $stmt = $conn->prepare("INSERT INTO tbl_brand (brand) VALUES (:brand)");
        $stmt->bindParam(":brand", $brand_name, PDO::PARAM_STR);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Brand added successfully"]);
        } else {
            // Return specific database error
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . implode(", ", $stmt->errorInfo())
            ]);
        }
    } catch (Exception $e) {
        echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
    }
    break;
    case 'displayBrand':
        try {
            // Get all brands with their product count (without is_archived)
            $stmt = $conn->prepare("
                SELECT 
                    b.brand_id, 
                    b.brand, 
                    COUNT(p.product_id) AS product_count
                FROM tbl_brand b
                LEFT JOIN tbl_product p ON b.brand_id = p.brand_id
                GROUP BY b.brand_id, b.brand
                ORDER BY b.brand_id
            ");
            $stmt->execute();
            $brand = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
            if ($brand) {
                echo json_encode([
                    "success" => true,
                    "brand" => $brand
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "brand" => [],
                    "message" => "No brands found"
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "brand" => []
            ]);
        }
        break;
        
    case 'deleteBrand':  
        try {
            $brand_id = isset($data['brand_id']) ? intval($data['brand_id']) : 0;
            
            // Validate input
            if ($brand_id <= 0) {
                echo json_encode(["success" => false, "message" => "Invalid brand ID"]);
                break;
            }

            // Use prepared statement with proper DELETE syntax
            $stmt = $conn->prepare("DELETE FROM tbl_brand WHERE brand_id = :brand_id");
            $stmt->bindParam(":brand_id", $brand_id, PDO::PARAM_INT);
            
            if ($stmt->execute()) {
                echo json_encode([
                    "success" => true, 
                    "message" => "Brand deleted successfully"
                ]);
            } else {
                echo json_encode([
                    "success" => false, 
                    "message" => "Failed to delete brand"
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                "success" => false, 
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'add_brand':
        try {
            $brand_name = isset($data['brand_name']) ? trim($data['brand_name']) : '';
            
            if (empty($brand_name)) {
                echo json_encode(["success" => false, "message" => "Brand name is required"]);
                break;
            }
            
            // Check if brand already exists
            $checkStmt = $conn->prepare("SELECT brand_id FROM tbl_brand WHERE brand = ?");
            $checkStmt->execute([$brand_name]);
            $existingBrand = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingBrand) {
                echo json_encode([
                    "success" => true, 
                    "brand_id" => $existingBrand['brand_id'],
                    "message" => "Brand already exists"
                ]);
                break;
            }
            
            // Insert new brand
            $stmt = $conn->prepare("INSERT INTO tbl_brand (brand) VALUES (?)");
            $stmt->execute([$brand_name]);
            $brand_id = $conn->lastInsertId();
            
            echo json_encode([
                "success" => true, 
                "brand_id" => $brand_id,
                "message" => "Brand added successfully"
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false, 
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'add_product':
        try {
            // Extract and sanitize data
            $product_name = isset($data['product_name']) ? trim($data['product_name']) : '';
            $category = isset($data['category']) ? trim($data['category']) : '';
            $barcode = isset($data['barcode']) ? trim($data['barcode']) : '';
            $description = isset($data['description']) ? trim($data['description']) : '';
            $prescription = isset($data['prescription']) ? intval($data['prescription']) : 0;
            $bulk = isset($data['bulk']) ? intval($data['bulk']) : 0;
            $quantity = isset($data['quantity']) ? intval($data['quantity']) : 0;
            $unit_price = isset($data['unit_price']) ? floatval($data['unit_price']) : 0;
            $srp = isset($data['srp']) && $data['srp'] > 0 ? floatval($data['srp']) : 0; // SRP should be separate from unit_price
            $supplier_id = isset($data['supplier_id']) ? intval($data['supplier_id']) : 0;
            // Handle brand_id - allow NULL if not provided or empty
            $brand_id = null;
            error_log("DEBUG: Received brand_id: " . (isset($data['brand_id']) ? $data['brand_id'] : 'NOT_SET'));
            if (isset($data['brand_id']) && !empty($data['brand_id'])) {
                $brand_id = intval($data['brand_id']);
                error_log("DEBUG: Parsed brand_id: " . $brand_id);
                // Validate brand_id exists if provided
                $brandCheckStmt = $conn->prepare("SELECT brand_id FROM tbl_brand WHERE brand_id = ?");
                $brandCheckStmt->execute([$brand_id]);
                if (!$brandCheckStmt->fetch()) {
                    // If brand_id doesn't exist, set to NULL
                    error_log("DEBUG: Brand ID " . $brand_id . " not found in database, setting to NULL");
                    $brand_id = null;
                } else {
                    error_log("DEBUG: Brand ID " . $brand_id . " validated successfully");
                }
            } else {
                error_log("DEBUG: No brand_id provided or empty, setting to NULL");
            }
            
            $expiration = isset($data['expiration']) ? trim($data['expiration']) : null;
            $date_added = isset($data['date_added']) ? trim($data['date_added']) : date('Y-m-d');
            $status = isset($data['status']) ? trim($data['status']) : 'active';
            $stock_status = isset($data['stock_status']) ? trim($data['stock_status']) : 'in stock';
            $reference = isset($data['reference']) ? trim($data['reference']) : '';
            $entry_by = isset($data['entry_by']) ? trim($data['entry_by']) : 'admin';
            $order_no = isset($data['order_no']) ? trim($data['order_no']) : '';
            
            // Handle location_id - convert location name to ID if needed
            $location_id = null;
            if (isset($data['location_id'])) {
                $location_id = intval($data['location_id']);
            } elseif (isset($data['location'])) {
                // If location name is provided, find the location_id
                $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name = ?");
                $locStmt->execute([trim($data['location'])]);
                $location = $locStmt->fetch(PDO::FETCH_ASSOC);
                $location_id = $location ? $location['location_id'] : 2; // Default to warehouse (ID 2)
            } else {
                $location_id = 2; // Default to warehouse
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Create batch record first
            $batch_id = null;
            if ($reference) {
                $batchStmt = $conn->prepare("
                    INSERT INTO tbl_batch (
                        batch, supplier_id, location_id, entry_date, entry_time, 
                        entry_by, order_no
                    ) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?)
                ");
                $batchStmt->execute([$reference, $supplier_id, $location_id, $entry_by, $order_no]);
                $batch_id = $conn->lastInsertId();
            }
            
            // Prepare insert statement for product
            $stmt = $conn->prepare("
                INSERT INTO tbl_product (
                    product_name, category, barcode, description, prescription, bulk,
                    expiration, date_added, quantity, unit_price, srp, brand_id, supplier_id,
                    location_id, batch_id, status, stock_status
                ) VALUES (
                    :product_name, :category, :barcode, :description, :prescription, :bulk,
                    :expiration, :date_added, :quantity, :unit_price, :srp, :brand_id, :supplier_id,
                    :location_id, :batch_id, :status,  :stock_status
                )
            ");
    
            // Log the values being inserted
            error_log("DEBUG: Inserting product with brand_id: " . ($brand_id ?? 'NULL'));
            error_log("DEBUG: Product data: " . json_encode([
                'product_name' => $product_name,
                'category' => $category,
                'brand_id' => $brand_id,
                'supplier_id' => $supplier_id,
                'quantity' => $quantity,
                'unit_price' => $unit_price,
                'srp' => $srp
            ]));
            
            // Bind parameters
            $stmt->bindParam(':product_name', $product_name);
            $stmt->bindParam(':category', $category);
            $stmt->bindParam(':barcode', $barcode);
            $stmt->bindParam(':description', $description);
            $stmt->bindParam(':prescription', $prescription);
            $stmt->bindParam(':bulk', $bulk);
            $stmt->bindParam(':expiration', $expiration);
            $stmt->bindParam(':date_added', $date_added);
            $stmt->bindParam(':quantity', $quantity);
            $stmt->bindParam(':unit_price', $unit_price);
            $stmt->bindParam(':srp', $srp);
            $stmt->bindParam(':brand_id', $brand_id);
            $stmt->bindParam(':supplier_id', $supplier_id);
            $stmt->bindParam(':location_id', $location_id);
            $stmt->bindParam(':batch_id', $batch_id);
            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':stock_status', $stock_status);
    
            if ($stmt->execute()) {
                $product_id = $conn->lastInsertId();
                
                // FIFO: Create stock movement record for new stock
                if ($batch_id && $quantity > 0) {
                    $movementStmt = $conn->prepare("
                        INSERT INTO tbl_stock_movements (
                            product_id, batch_id, movement_type, quantity, remaining_quantity,
                            unit_cost, expiration_date, reference_no, created_by
                        ) VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?)
                    ");
                    $movementStmt->execute([
                        $product_id, $batch_id, $quantity, $quantity, 
                        $unit_price, $expiration, $reference, $entry_by
                    ]);
                    
                    // Create stock summary record with the new unit_cost and srp
                    $summaryStmt = $conn->prepare("
                        INSERT INTO tbl_stock_summary (
                            product_id, batch_id, available_quantity, unit_cost, srp,
                            expiration_date, batch_reference, total_quantity
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            available_quantity = available_quantity + VALUES(available_quantity),
                            total_quantity = total_quantity + VALUES(total_quantity),
                            unit_cost = VALUES(unit_cost),
                            srp = VALUES(srp),
                            last_updated = CURRENT_TIMESTAMP
                    ");
                    $summaryStmt->execute([
                        $product_id, $batch_id, $quantity, $unit_price, $srp,
                        $expiration, $reference, $quantity
                    ]);
                    
                    // Create FIFO stock entry if table exists
                    try {
                        $fifoStmt = $conn->prepare("
                            INSERT INTO tbl_fifo_stock (
                                product_id, batch_id, available_quantity, unit_cost, srp, expiration_date, batch_reference, entry_date, entry_by
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)
                        ");
                        
                        $fifoStmt->execute([
                            $product_id, $batch_id, $quantity, $unit_price, $srp, $expiration, $reference, $entry_by
                        ]);
                        
                        $fifo_created = true;
                    } catch (Exception $e) {
                        // FIFO table might not exist, continue without it
                        $fifo_created = false;
                    }
                }
                
                $conn->commit();
                echo json_encode([
                    "success" => true, 
                    "message" => "Product added successfully with FIFO tracking",
                    "fifo_stock_created" => $fifo_created ?? false
                ]);
            } else {
                $conn->rollback();
                echo json_encode(["success" => false, "message" => "Failed to add product"]);
            }
    
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'update_product':
        try {
            // Extract and sanitize data
            $product_id = isset($data['product_id']) ? intval($data['product_id']) : 0;
            $product_name = isset($data['product_name']) ? trim($data['product_name']) : '';
            $category = isset($data['category']) ? trim($data['category']) : '';
            $barcode = isset($data['barcode']) ? trim($data['barcode']) : '';
            $description = isset($data['description']) ? trim($data['description']) : '';
            $prescription = isset($data['prescription']) ? intval($data['prescription']) : 0;
            $bulk = isset($data['bulk']) ? intval($data['bulk']) : 0;
            $quantity = isset($data['quantity']) ? intval($data['quantity']) : 0;
            $unit_price = isset($data['unit_price']) ? floatval($data['unit_price']) : 0;
            $srp = isset($data['srp']) && $data['srp'] > 0 ? floatval($data['srp']) : 0; // SRP should be separate from unit_price
            $supplier_id = isset($data['supplier_id']) ? intval($data['supplier_id']) : 0;
            // Handle brand_id - allow NULL if not provided or empty
            $brand_id = null;
            error_log("DEBUG: Received brand_id: " . (isset($data['brand_id']) ? $data['brand_id'] : 'NOT_SET'));
            if (isset($data['brand_id']) && !empty($data['brand_id'])) {
                $brand_id = intval($data['brand_id']);
                error_log("DEBUG: Parsed brand_id: " . $brand_id);
                // Validate brand_id exists if provided
                $brandCheckStmt = $conn->prepare("SELECT brand_id FROM tbl_brand WHERE brand_id = ?");
                $brandCheckStmt->execute([$brand_id]);
                if (!$brandCheckStmt->fetch()) {
                    // If brand_id doesn't exist, set to NULL
                    error_log("DEBUG: Brand ID " . $brand_id . " not found in database, setting to NULL");
                    $brand_id = null;
                } else {
                    error_log("DEBUG: Brand ID " . $brand_id . " validated successfully");
                }
            } else {
                error_log("DEBUG: No brand_id provided or empty, setting to NULL");
            }
            $expiration = isset($data['expiration']) ? trim($data['expiration']) : null;
            
            if ($product_id <= 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid product ID"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Update product
            $stmt = $conn->prepare("
                UPDATE tbl_product SET 
                    product_name = ?,
                    category = ?,
                    barcode = ?,
                    description = ?,
                    prescription = ?,
                    bulk = ?,
                    quantity = ?,
                    unit_price = ?,
                    srp = ?,
                    supplier_id = ?,
                    brand_id = ?,
                    expiration = ?,
                    stock_status = CASE 
                        WHEN ? <= 0 THEN 'out of stock'
                        WHEN ? <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END
                WHERE product_id = ?
            ");
            
            $stmt->execute([
                $product_name,
                $category,
                $barcode,
                $description,
                $prescription,
                $bulk,
                $quantity,
                $unit_price,
                $srp,
                $supplier_id,
                $brand_id,
                $expiration,
                $quantity,
                $quantity,
                $product_id
            ]);
            
            $conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Product updated successfully"
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;


    case 'enhanced_fifo_transfer':
        require_once '../enhanced_fifo_transfer_system.php';
        
        try {
            $fifoSystem = new EnhancedFifoTransferSystem($conn);
            $result = $fifoSystem->performEnhancedFifoTransfer($data);
            
            echo json_encode($result);
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Enhanced FIFO Transfer Error: ' . $e->getMessage()
            ]);
        }
        break;

case 'get_fifo_stock_status':
    try {
        $product_id = $data['product_id'] ?? 0;
        $location_id = $data['location_id'] ?? null;
        
        // Get FIFO stock data from tbl_fifo_stock
        $sql = "
            SELECT 
                fs.product_id,
                fs.batch_id,
                fs.batch_reference,
                fs.quantity,
                fs.available_quantity,
                fs.unit_cost,
                fs.expiration_date,
                fs.entry_date,
                p.product_name,
                p.location_id
            FROM tbl_fifo_stock fs
            JOIN tbl_product p ON fs.product_id = p.product_id
            WHERE fs.product_id = ? 
            AND fs.available_quantity > 0
        ";
        
        $params = [$product_id];
        
        if ($location_id) {
            $sql .= " AND p.location_id = ?";
            $params[] = $location_id;
        }
        
        $sql .= " ORDER BY fs.entry_date ASC, fs.fifo_id ASC"; // FIFO order
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $fifo_entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($fifo_entries)) {
            echo json_encode([
                'success' => true,
                'total_available' => 0,
                'batches_count' => 0,
                'fifo_batches' => [],
                'message' => 'Product not found or no FIFO stock available'
            ]);
            break;
        }
        
        // Calculate total available from FIFO entries
        $total_available = 0;
        $fifo_batches = [];
        $fifo_rank = 1;
        
        foreach ($fifo_entries as $entry) {
            $total_available += $entry['available_quantity'];
            
            $fifo_batches[] = [
                'available_quantity' => $entry['available_quantity'],
                'batch_reference' => $entry['batch_reference'],
                'entry_date' => $entry['entry_date'],
                'fifo_rank' => $fifo_rank,
                'batch_id' => $entry['batch_id'],
                'unit_cost' => $entry['unit_cost'],
                'expiration_date' => $entry['expiration_date']
            ];
            
            $fifo_rank++;
        }
        
        echo json_encode([
            'success' => true,
            'total_available' => $total_available,
            'batches_count' => count($fifo_batches),
            'fifo_batches' => $fifo_batches,
            'product_name' => $fifo_entries[0]['product_name']
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error getting FIFO stock status: ' . $e->getMessage()
        ]);
    }
    break;

case 'check_fifo_availability':
    try {
        $product_id = $data['product_id'] ?? 0;
        $location_id = $data['location_id'] ?? 0;
        $requested_quantity = $data['requested_quantity'] ?? 0;
        
        // Get FIFO stock data from tbl_fifo_stock
        $stmt = $conn->prepare("
            SELECT 
                fs.product_id,
                fs.batch_id,
                fs.batch_reference,
                fs.quantity,
                fs.available_quantity,
                fs.unit_cost,
                fs.expiration_date,
                fs.entry_date,
                p.product_name,
                p.location_id
            FROM tbl_fifo_stock fs
            JOIN tbl_product p ON fs.product_id = p.product_id
            WHERE fs.product_id = ? 
            AND p.location_id = ?
            AND fs.available_quantity > 0
            ORDER BY fs.entry_date ASC, fs.fifo_id ASC
        ");
        
        $stmt->execute([$product_id, $location_id]);
        $fifo_entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($fifo_entries)) {
            echo json_encode([
                "success" => true,
                "is_available" => false,
                "total_available" => 0,
                "requested_quantity" => $requested_quantity,
                "batches_count" => 0,
                "next_batches" => [],
                "message" => "Product not found or no FIFO stock available"
            ]);
            break;
        }
        
        // Calculate total available from FIFO entries
        $total_available = 0;
        $next_batches = [];
        $fifo_rank = 1;
        
        foreach ($fifo_entries as $entry) {
            $total_available += $entry['available_quantity'];
            
            $next_batches[] = [
                'available_quantity' => $entry['available_quantity'],
                'batch_reference' => $entry['batch_reference'],
                'entry_date' => $entry['entry_date'],
                'fifo_rank' => $fifo_rank,
                'batch_id' => $entry['batch_id'],
                'unit_cost' => $entry['unit_cost'],
                'expiration_date' => $entry['expiration_date']
            ];
            
            $fifo_rank++;
        }
        
        $is_available = $total_available >= $requested_quantity;
        
        echo json_encode([
            "success" => true,
            "is_available" => $is_available,
            "total_available" => $total_available,
            "requested_quantity" => $requested_quantity,
            "batches_count" => count($next_batches),
            "next_batches" => $next_batches,
            "product_name" => $fifo_entries[0]['product_name']
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Error checking FIFO availability: " . $e->getMessage()
        ]);
    }
    break;
case 'get_products_oldest_batch_for_transfer':
    try {
        $location_id = $data['location_id'] ?? null;
        
        $whereClause = "WHERE (p.status IS NULL OR p.status <> 'archived')";
        $params = [];
        
        if ($location_id) {
            $whereClause .= " AND p.location_id = ?";
            $params[] = $location_id;
        }
        
        // Simple query to get products directly from tbl_product
        $stmt = $conn->prepare("
            SELECT 
                p.product_id,
                p.product_name,
                p.category,
                p.barcode,
                p.description,
                COALESCE(b.brand, '') as brand,
                COALESCE(s.supplier_name, '') as supplier_name,
                COALESCE(p.srp, p.unit_price) as srp,
                p.location_id,
                l.location_name,
                p.quantity as total_quantity,
                p.quantity as oldest_batch_quantity,
                p.unit_price as unit_cost,
                'N/A' as batch_reference,
                'N/A' as entry_date,
                'N/A' as expiration_date,
                1 as total_batches
            FROM tbl_product p
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id 
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id 
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
            $whereClause
            AND p.quantity > 0
            ORDER BY p.product_name ASC
        ");
        
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "success" => true,
            "data" => $products
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "data" => []
        ]);
    }
    break;

    case 'get_products_oldest_batch':
        try {
            $location_id = $data['location_id'] ?? null;
            
            $whereClause = "WHERE (p.status IS NULL OR p.status <> 'archived')";
            $params = [];
            
            if ($location_id) {
                $whereClause .= " AND p.location_id = ?";
                $params[] = $location_id;
            }
            
            // Query to get products with oldest batch information for warehouse display
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.category,
                    p.barcode,
                    p.description,
                    COALESCE(b.brand, '') as brand,
                    COALESCE(s.supplier_name, '') as supplier_name,
                    COALESCE(oldest_batch.unit_cost, p.unit_price) as unit_price,
                    COALESCE(oldest_batch.unit_cost, p.srp, p.unit_price) as srp,
                    p.location_id,
                    l.location_name,
                    p.stock_status,
                    p.date_added,
                    p.status,
                    -- Oldest batch information
                    oldest_batch.batch_id,
                    oldest_batch.batch_reference,
                    oldest_batch.entry_date,
                    oldest_batch.expiration_date,
                    oldest_batch.quantity as oldest_batch_quantity,
                    oldest_batch.unit_cost,
                    oldest_batch.entry_time,
                    oldest_batch.entry_by,
                    -- Total quantity across all batches
                    total_qty.total_quantity,
                    -- Count of total batches
                    total_qty.total_batches,
                    -- Fallback to product quantity if no stock summary
                    COALESCE(total_qty.total_quantity, p.quantity) as quantity
                FROM tbl_product p
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id 
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id 
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                -- Get oldest batch for each product
                LEFT JOIN (
                    SELECT 
                        ss.product_id,
                        ss.batch_id,
                        bt.batch as batch_reference,
                        bt.entry_date,
                        bt.entry_time,
                        bt.entry_by,
                        ss.expiration_date,
                        ss.available_quantity as quantity,
                        ss.unit_cost,
                        ROW_NUMBER() OVER (
                            PARTITION BY ss.product_id 
                            ORDER BY bt.entry_date ASC, bt.batch_id ASC
                        ) as batch_rank
                    FROM tbl_stock_summary ss
                    INNER JOIN tbl_batch bt ON ss.batch_id = bt.batch_id
                    WHERE ss.available_quantity > 0
                ) oldest_batch ON p.product_id = oldest_batch.product_id AND oldest_batch.batch_rank = 1
                -- Get total quantities
                LEFT JOIN (
                    SELECT 
                        product_id,
                        SUM(available_quantity) as total_quantity,
                        COUNT(*) as total_batches
                    FROM tbl_stock_summary
                    WHERE available_quantity > 0
                    GROUP BY product_id
                ) total_qty ON p.product_id = total_qty.product_id
                $whereClause
                ORDER BY p.product_name ASC
            ");
            
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $products
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'get_inventory_kpis':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as physicalAvailable,
                    SUM(CASE WHEN p.stock_status = 'low stock' THEN p.quantity ELSE 0 END) as softReserved,
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as onhandInventory,
                    COUNT(CASE WHEN p.quantity <= 10 THEN 1 END) as newOrderLineQty,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as returned,
                    ROUND(COUNT(CASE WHEN p.stock_status = 'out of stock' THEN 1 END) * 100.0 / COUNT(*), 1) as returnRate,
                    ROUND(COUNT(CASE WHEN p.stock_status = 'in stock' THEN 1 END) * 100.0 / COUNT(*), 1) as sellRate,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as outOfStock
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
            ");
            $stmt->execute($params);
            $kpis = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode($kpis);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_supply_by_location':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    l.location_name as location,
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as onhand,
                    SUM(CASE WHEN p.stock_status = 'low stock' THEN p.quantity ELSE 0 END) as softReserved,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as returned
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY l.location_name
                ORDER BY onhand DESC
                LIMIT 10
            ");
            $stmt->execute($params);
            $supplyData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($supplyData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_return_rate_by_product':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    ROUND(COUNT(CASE WHEN p.stock_status = 'out of stock' THEN 1 END) * 100.0 / COUNT(*), 1) as returnRate
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY p.product_name
                HAVING returnRate > 0
                ORDER BY returnRate DESC
                LIMIT 12
            ");
            $stmt->execute($params);
            $returnData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($returnData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_stockout_items':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    -p.quantity as stockout
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                AND p.stock_status = 'out of stock'
                ORDER BY stockout ASC
                LIMIT 15
            ");
            $stmt->execute($params);
            $stockoutData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($stockoutData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_products':
    try {
        $location_id = $data['location_id'] ?? null;
        $for_transfer = $data['for_transfer'] ?? false;
        
        $whereClause = "WHERE (p.status IS NULL OR p.status <> 'archived')";
        $params = [];
        
        if ($location_id) {
            $whereClause .= " AND p.location_id = ?";
            $params[] = $location_id;
        }
        
        // If for transfer, show OLD and NEW quantities separately for FIFO management
        if ($for_transfer) {
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.category,
                    p.barcode,
                    p.description,
                
                    p.brand_id,
                    p.supplier_id,
                    p.location_id,
                    p.unit_price,
                    p.stock_status,
                    s.supplier_name,
                    b.brand,
                    l.location_name,
                    ss.batch_id,
                    ss.batch_reference,
                    b.entry_date,
                    b.entry_by,
                    COALESCE(p.date_added, CURDATE()) as date_added,
                    -- Show OLD quantity (oldest batch)
                    (SELECT ss2.available_quantity 
                     FROM tbl_stock_summary ss2 
                     INNER JOIN tbl_batch b2 ON ss2.batch_id = b2.batch_id 
                     WHERE ss2.product_id = p.product_id 
                     AND ss2.available_quantity > 0
                     AND b2.entry_date = (
                         SELECT MIN(b3.entry_date) 
                         FROM tbl_batch b3 
                         INNER JOIN tbl_stock_summary ss3 ON b3.batch_id = ss3.batch_id 
                         WHERE ss3.product_id = p.product_id AND ss3.available_quantity > 0
                     )
                     LIMIT 1) as old_quantity,
                    -- Show NEW quantity (newest batch)
                    (SELECT ss2.available_quantity 
                     FROM tbl_stock_summary ss2 
                     INNER JOIN tbl_batch b2 ON ss2.batch_id = b2.batch_id 
                     WHERE ss2.product_id = p.product_id 
                     AND ss2.available_quantity > 0
                     AND b2.entry_date = (
                         SELECT MAX(b3.entry_date) 
                         FROM tbl_batch b3 
                         INNER JOIN tbl_stock_summary ss3 ON b3.batch_id = ss3.batch_id 
                         WHERE ss3.product_id = p.product_id AND ss3.available_quantity > 0
                     )
                     LIMIT 1) as new_quantity,
                    -- Show total quantity
                    ss.available_quantity as total_quantity
                FROM tbl_product p 
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id 
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id 
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                INNER JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
                INNER JOIN tbl_batch b ON ss.batch_id = b.batch_id
                WHERE ss.available_quantity > 0
                $whereClause
                GROUP BY p.product_id, p.product_name, p.category, p.barcode, p.description, p.,
                         p.brand_id, p.supplier_id, p.location_id, p.unit_price, p.stock_status, 
                         s.supplier_name, b.brand, l.location_name, ss.batch_id, ss.batch_reference, 
                         b.entry_date, b.entry_by, ss.available_quantity
                ORDER BY p.product_name ASC
            ");
        } else {
            // Modified query to show each batch as a separate row
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.category,
                    p.barcode,
                    p.description,
                    p.prescription,
                    p.bulk,
                    p.expiration,
                    p.quantity,
                    p.unit_price,
                    p.srp,
                    p.brand_id,
                    p.supplier_id,
                    p.location_id,
                    p.batch_id,
                    p.stock_status,
                    p.date_added,
                    p.created_at,
                    s.supplier_name,
                    br.brand,
                    l.location_name,
                    b.batch as batch_reference,
                    b.entry_date as batch_entry_date,
                    b.entry_time as batch_entry_time,
                    b.entry_by as batch_entry_by,
                    b.order_no as batch_order_no,
                    COALESCE(p.date_added, CURDATE()) as date_added_formatted
                FROM tbl_product p 
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id 
                LEFT JOIN tbl_brand br ON p.brand_id = br.brand_id 
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_batch b ON p.batch_id = b.batch_id
                $whereClause
                ORDER BY p.product_name ASC, p.batch_id ASC, p.product_id ASC
            ");
        }
        
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "success" => true,
            "data" => $products
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage(),
            "data" => []
        ]);
    }
    break;

    case 'get_suppliers':
        try {
            $stmt = $conn->prepare("
                SELECT * FROM tbl_supplier 
                WHERE status != 'archived' OR status IS NULL
                ORDER BY supplier_id DESC
            ");
            $stmt->execute();
            $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $suppliers
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;
    case 'get_brands':
        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_brand ORDER BY brand_id DESC");
            $stmt->execute();
            $brands = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $brands
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'get_categories':
        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_category ORDER BY category_id");
            $stmt->execute();
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $categories
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'get_locations':
        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_location ORDER BY location_id");
            $stmt->execute();
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $locations
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'get_inventory_staff':
        try {
            $stmt = $conn->prepare("
                SELECT emp_id, CONCAT(Fname, ' ', Lname) as name 
                FROM tbl_employee 
                WHERE status = 'Active'
                ORDER BY Fname, Lname
            ");
            $stmt->execute();
            $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $staff
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'get_transfers_with_details':
        try {
            $stmt = $conn->prepare("
                SELECT 
                    th.transfer_header_id,
                    th.date,
                    th.status,
                    sl.location_name as source_location_name,
                    dl.location_name as destination_location_name,
                    e.Fname as employee_name,
                    COUNT(td.product_id) as total_products,
                    SUM(td.qty * p.unit_price) as total_value
                FROM tbl_transfer_header th
                LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                LEFT JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                LEFT JOIN tbl_product p ON td.product_id = p.product_id
                GROUP BY th.transfer_header_id
                ORDER BY th.transfer_header_id DESC
            ");
            $stmt->execute();
            $transfers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get products for each transfer
            foreach ($transfers as &$transfer) {
                $stmt2 = $conn->prepare("
                    SELECT 
                        p.product_name, p.category, p.barcode, p.unit_price,
                         p.description, p.brand_id,
                        b.brand,
                        td.qty as qty
                    FROM tbl_transfer_dtl td
                    JOIN tbl_product p ON td.product_id = p.product_id
                    LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                    WHERE td.transfer_header_id = ?
                ");
                $stmt2->execute([$transfer['transfer_header_id']]);
                $transfer['products'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
            }
            
            echo json_encode([
                "success" => true,
                "data" => $transfers
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;
    case 'get_transferred_products_by_location':
        try {
            $location_id = $data['location_id'] ?? 0;
            $product_id = $data['product_id'] ?? 0;
            
            if (!$location_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Location ID is required"
                ]);
                break;
            }
            
            // Get transferred products for a specific location
            $stmt = $conn->prepare("
                SELECT 
                    th.transfer_header_id,
                    th.delivery_date,
                    th.status,
                    td.product_id,
                    td.qty as transferred_qty,
                    p.product_name,
                    p.barcode,
                    p.unit_price,
                    p.srp,
                    sl.location_name as source_location,
                    dl.location_name as destination_location
                FROM tbl_transfer_header th
                JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                JOIN tbl_product p ON td.product_id = p.product_id
                JOIN tbl_location sl ON th.source_location_id = sl.location_id
                JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                WHERE th.destination_location_id = ?
                " . ($product_id ? "AND td.product_id = ?" : "") . "
                ORDER BY th.transfer_header_id DESC
            ");
            
            if ($product_id) {
                $stmt->execute([$location_id, $product_id]);
            } else {
                $stmt->execute([$location_id]);
            }
            
            $transferred_products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $transferred_products
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Error getting transferred products: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_transfer_logs':
        try {
            $product_id = $data['product_id'] ?? 0;
            $location_id = $data['location_id'] ?? 0;
            $limit = $data['limit'] ?? 50;
            
            $where_conditions = [];
            $params = [];
            
            if ($product_id) {
                $where_conditions[] = "tl.product_id = ?";
                $params[] = $product_id;
            }
            
            if ($location_id) {
                $where_conditions[] = "(tl.from_location_id = ? OR tl.to_location_id = ?)";
                $params[] = $location_id;
                $params[] = $location_id;
            }
            
            $where_clause = "";
            if (!empty($where_conditions)) {
                $where_clause = "WHERE " . implode(" AND ", $where_conditions);
            }
            
            // First, get the transfer logs
            $stmt = $conn->prepare("
                SELECT 
                    tl.transfer_id,
                    tl.product_id,
                    tl.product_name,
                    tl.from_location,
                    tl.to_location,
                    tl.quantity,
                    tl.transfer_date,
                    tl.created_at
                FROM tbl_transfer_log tl
                $where_clause
                ORDER BY tl.created_at DESC
                LIMIT $limit
            ");
            
            $stmt->execute($params);
            $transfer_logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // For each transfer, get the individual batch details
            foreach ($transfer_logs as &$transfer) {
                $batch_stmt = $conn->prepare("
                    SELECT 
                        tbd.batch_id,
                        tbd.batch_reference,
                        tbd.quantity as batch_quantity,
                        COALESCE(tbd.srp, fs.srp) as batch_srp,
                        tbd.expiration_date,
                        fs.batch_id as fifo_batch_id
                    FROM tbl_transfer_batch_details tbd
                    LEFT JOIN tbl_fifo_stock fs ON tbd.batch_id = fs.batch_id
                    WHERE tbd.transfer_id = ?
                    ORDER BY tbd.batch_id
                ");
                
                $batch_stmt->execute([$transfer['transfer_id']]);
                $transfer['batch_details'] = $batch_stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            echo json_encode([
                "success" => true,
                "data" => $transfer_logs
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Error getting transfer logs: " . $e->getMessage()
            ]);
        }
        break;
    case 'create_transfer_batch_details_table':
        try {
            // First create the transfer_log table if it doesn't exist
            $create_transfer_log_sql = "
                CREATE TABLE IF NOT EXISTS `tbl_transfer_log` (
                    `transfer_id` int(11) NOT NULL AUTO_INCREMENT,
                    `product_id` int(11) NOT NULL,
                    `product_name` varchar(255) NOT NULL,
                    `from_location` varchar(255) NOT NULL,
                    `to_location` varchar(255) NOT NULL,
                    `quantity` int(11) NOT NULL,
                    `transfer_date` date NOT NULL,
                    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                    PRIMARY KEY (`transfer_id`),
                    KEY `product_id` (`product_id`),
                    KEY `transfer_date` (`transfer_date`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
            ";
            
            $conn->exec($create_transfer_log_sql);
            
            // Ensure transfer_id column is properly set up as auto-increment
            try {
                $conn->exec("ALTER TABLE tbl_transfer_log MODIFY COLUMN transfer_id int(11) NOT NULL AUTO_INCREMENT");
            } catch (Exception $e) {
                // Column might already be properly configured, ignore error
                error_log("Transfer log table modification: " . $e->getMessage());
            }
            
            // Create the transfer batch details table if it doesn't exist
            $create_table_sql = "
                CREATE TABLE IF NOT EXISTS `tbl_transfer_batch_details` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `transfer_id` int(11) NOT NULL,
                    `batch_id` int(11) NOT NULL,
                    `batch_reference` varchar(255) NOT NULL,
                    `quantity` int(11) NOT NULL,
                    `srp` decimal(10,2) NOT NULL,
                    `expiration_date` date DEFAULT NULL,
                    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                    PRIMARY KEY (`id`),
                    KEY `transfer_id` (`transfer_id`),
                    KEY `batch_id` (`batch_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
            ";
            
            $conn->exec($create_table_sql);
            
            // Ensure transfer_id column in batch details table is properly set up
            try {
                $conn->exec("ALTER TABLE tbl_transfer_batch_details MODIFY COLUMN transfer_id int(11) NOT NULL");
            } catch (Exception $e) {
                // Column might already be properly configured, ignore error
                error_log("Transfer batch details table modification: " . $e->getMessage());
            }
            
            // Populate sample batch details for existing transfers
            $populate_stmt = $conn->prepare("
                INSERT IGNORE INTO tbl_transfer_batch_details 
                (transfer_id, batch_id, batch_reference, quantity, srp, expiration_date)
                SELECT 
                    tl.transfer_id,
                    COALESCE(fs.batch_id, 1) as batch_id,
                    COALESCE(fs.batch_reference, CONCAT('BR-', tl.transfer_id, '-', tl.product_id)) as batch_reference,
                    tl.quantity,
                    COALESCE(fs.srp, 10.00) as srp,
                    COALESCE(fs.expiration_date, DATE_ADD(CURDATE(), INTERVAL 1 YEAR)) as expiration_date
                FROM tbl_transfer_log tl
                LEFT JOIN tbl_fifo_stock fs ON tl.product_id = fs.product_id
                WHERE NOT EXISTS (
                    SELECT 1 FROM tbl_transfer_batch_details tbd 
                    WHERE tbd.transfer_id = tl.transfer_id
                )
                LIMIT 1
            ");
            
            $populate_stmt->execute();
            
            echo json_encode([
                "success" => true,
                "message" => "Transfer tables created and populated successfully"
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Error creating transfer tables: " . $e->getMessage()
            ]);
        }
        break;
    case 'create_transfer':
        try {
            $source_location_id = $data['source_location_id'] ?? 0;
            $destination_location_id = $data['destination_location_id'] ?? 0;
            $employee_id = $data['employee_id'] ?? 0;
            $status = $data['status'] ?? 'approved'; // Use 'approved' to match database enum
            $products = $data['products'] ?? [];
            
            // Strict validation for locations
            if ($source_location_id == $destination_location_id) {
                error_log("[TRANSFER ERROR] Source and destination locations are the same! Source: $source_location_id, Destination: $destination_location_id");
                echo json_encode(["success" => false, "message" => "Source and destination locations cannot be the same!"]);
                break;
            }
            if ($destination_location_id == 0) {
                error_log("[TRANSFER ERROR] Invalid destination location! Destination: $destination_location_id");
                echo json_encode(["success" => false, "message" => "Invalid destination location!"]);
                break;
            }
            // Check if destination exists
            $locCheck = $conn->prepare("SELECT location_id, location_name FROM tbl_location WHERE location_id = ?");
            $locCheck->execute([$destination_location_id]);
            $destLoc = $locCheck->fetch(PDO::FETCH_ASSOC);
            if (!$destLoc) {
                error_log("[TRANSFER ERROR] Destination location does not exist! ID: $destination_location_id");
                echo json_encode(["success" => false, "message" => "Destination location does not exist!"]);
                break;
            }
            error_log("[TRANSFER] Source: $source_location_id, Destination: $destination_location_id ({$destLoc['location_name']})");
            
            if (empty($products)) {
                echo json_encode(["success" => false, "message" => "No products to transfer"]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Validate product quantities before transfer
            foreach ($products as $product) {
                $product_id = $product['product_id'];
                $transfer_qty = $product['quantity'];
                
                // Check current quantity - look for product in source location
                $checkStmt = $conn->prepare("
                    SELECT quantity, product_name, location_id 
                    FROM tbl_product 
                    WHERE product_id = ? AND location_id = ?
                ");
                $checkStmt->execute([$product_id, $source_location_id]);
                $currentProduct = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$currentProduct) {
                    error_log("[TRANSFER ERROR] Product not found in source location - Product ID: $product_id");
                    throw new Exception("Product not found in source location - Product ID: " . $product_id);
                }
                
                if ($currentProduct['quantity'] < $transfer_qty) {
                    error_log("[TRANSFER ERROR] Insufficient quantity for product: {$currentProduct['product_name']} (Available: {$currentProduct['quantity']}, Requested: $transfer_qty)");
                    throw new Exception("Insufficient quantity for product: " . $currentProduct['product_name'] . 
                                     ". Available: " . $currentProduct['quantity'] . ", Requested: " . $transfer_qty);
                }
                
                // Log for debugging
                error_log("[TRANSFER VALIDATION] Product ID: $product_id, Name: " . $currentProduct['product_name'] . ", Available: " . $currentProduct['quantity'] . ", Requested: $transfer_qty");
            }
            
            // Insert transfer header
            $stmt = $conn->prepare("
                INSERT INTO tbl_transfer_header (
                    source_location_id, destination_location_id, employee_id, 
                    status, date
                ) VALUES (?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$source_location_id, $destination_location_id, $employee_id, $status]);
            $transfer_header_id = $conn->lastInsertId();
            
            // Insert transfer details and process the transfer
            $stmt2 = $conn->prepare("
                INSERT INTO tbl_transfer_dtl (
                    transfer_header_id, product_id, qty
                ) VALUES (?, ?, ?)
            ");
            
            foreach ($products as $product) {
                $product_id = $product['product_id'];
                $transfer_qty = $product['quantity'];
                
                // Insert transfer detail
                $stmt2->execute([
                    $transfer_header_id,
                    $product_id,
                    $transfer_qty
                ]);
                
                // Get the original product details from source location
                $productStmt = $conn->prepare("
                    SELECT product_name, category, barcode, description, prescription, bulk,
                           expiration, unit_price, brand_id, supplier_id, batch_id
                    FROM tbl_product 
                    WHERE product_id = ? AND location_id = ?
                    LIMIT 1
                ");
                $productStmt->execute([$product_id, $source_location_id]);
                $productDetails = $productStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($productDetails) {
                    // IMPLEMENT FIFO BATCH CONSUMPTION FOR TRANSFER
                    $remaining_transfer_qty = $transfer_qty;
                    $consumed_batches = [];
                    
                    // Get FIFO stock data for the product in source location (only if product is active)
                    $fifoStmt = $conn->prepare("
                        SELECT 
                            fs.fifo_id,
                            fs.batch_id,
                            fs.batch_reference,
                            fs.available_quantity,
                            fs.unit_cost
                        FROM tbl_fifo_stock fs
                        JOIN tbl_batch b ON fs.batch_id = b.batch_id
                        JOIN tbl_product p ON fs.product_id = p.product_id
                        WHERE fs.product_id = ? 
                        AND fs.available_quantity > 0
                        AND p.status = 'active'
                        ORDER BY b.entry_date ASC, fs.fifo_id ASC
                    ");
                    $fifoStmt->execute([$product_id]);
                    $fifoStock = $fifoStmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    if (empty($fifoStock)) {
                        throw new Exception("No FIFO stock available for product ID: $product_id in source location");
                    }
                    
                    // Debug: Log the FIFO stock data
                    error_log("FIFO Stock Data for transfer: " . json_encode($fifoStock));
                    error_log("Transfer quantity: $transfer_qty, Remaining: $remaining_transfer_qty");
                    
                    // Consume stock from FIFO order (oldest first)
                    foreach ($fifoStock as $batch) {
                        if ($remaining_transfer_qty <= 0) break;
                        
                        $batch_quantity = min($remaining_transfer_qty, $batch['available_quantity']);
                        
                        error_log("Processing batch: " . $batch['batch_reference'] . " - Available: " . $batch['available_quantity'] . ", Consuming: $batch_quantity");
                        
                        // Check if this batch will become empty after consumption
                        $willBeEmpty = ($batch['available_quantity'] - $batch_quantity) <= 0;
                        
                        error_log("Batch " . $batch['batch_reference'] . " will be empty: " . ($willBeEmpty ? 'YES' : 'NO') . " (Available: " . $batch['available_quantity'] . " - Consuming: $batch_quantity = " . ($batch['available_quantity'] - $batch_quantity) . ")");
                        
                        // If batch will be empty, set it to exactly 0
                        if ($willBeEmpty) {
                            error_log("Setting batch " . $batch['batch_reference'] . " to 0 (consumed completely)");
                            
                            $markConsumedStmt = $conn->prepare("
                                UPDATE tbl_fifo_stock 
                                SET available_quantity = 0, updated_at = NOW()
                                WHERE fifo_id = ?
                            ");
                            $markConsumedStmt->execute([$batch['fifo_id']]);
                            
                            // Also mark as consumed in stock_summary
                            $markSummaryConsumedStmt = $conn->prepare("
                                UPDATE tbl_stock_summary 
                                SET available_quantity = 0,
                                    last_updated = NOW()
                                WHERE product_id = ? AND batch_id = ?
                            ");
                            $markSummaryConsumedStmt->execute([$product_id, $batch['batch_id']]);
                            
                            error_log("Marked FIFO batch as consumed - FIFO ID: " . $batch['fifo_id'] . ", Batch: " . $batch['batch_reference'] . " (consumed completely)");
                        } else {
                            error_log("Updating batch " . $batch['batch_reference'] . " normally - reducing by $batch_quantity");
                            
                            // Update FIFO stock normally if batch won't be empty
                            $updateFifoStmt = $conn->prepare("
                                UPDATE tbl_fifo_stock 
                                SET available_quantity = available_quantity - ?
                                WHERE fifo_id = ?
                            ");
                            $updateFifoStmt->execute([$batch_quantity, $batch['fifo_id']]);
                            
                            // Also update stock_summary to keep tables in sync
                            $updateSummaryStmt = $conn->prepare("
                                UPDATE tbl_stock_summary 
                                SET available_quantity = available_quantity - ?,
                                    total_quantity = total_quantity - ?,
                                    last_updated = NOW()
                                WHERE product_id = ? AND batch_id = ?
                            ");
                            $updateSummaryStmt->execute([$batch_quantity, $batch_quantity, $product_id, $batch['batch_id']]);
                        }
                        
                        $consumed_batches[] = [
                            'batch_reference' => $batch['batch_reference'],
                            'quantity' => $batch_quantity,
                            'unit_cost' => $batch['unit_cost']
                        ];
                        
                        $remaining_transfer_qty -= $batch_quantity;
                        error_log("Consumed from batch " . $batch['batch_reference'] . ": $batch_quantity units for transfer. Remaining transfer qty: $remaining_transfer_qty");
                    }
                    
                    if ($remaining_transfer_qty > 0) {
                        throw new Exception("Insufficient stock available for transfer. Only " . ($transfer_qty - $remaining_transfer_qty) . " units available in FIFO stock.");
                    }
                    
                    // Decrease quantity in source location (this is now handled by FIFO consumption)
                    $updateSourceStmt = $conn->prepare("
                        UPDATE tbl_product 
                        SET quantity = quantity - ?,
                            stock_status = CASE 
                                WHEN quantity - ? <= 0 THEN 'out of stock'
                                WHEN quantity - ? <= 10 THEN 'low stock'
                                ELSE 'in stock'
                            END
                        WHERE product_id = ? AND location_id = ?
                    ");
                    $updateSourceStmt->execute([$transfer_qty, $transfer_qty, $transfer_qty, $product_id, $source_location_id]);
                    
                    // Check if the product quantity becomes 0 or less after transfer
                    $checkRemainingStmt = $conn->prepare("
                        SELECT quantity 
                        FROM tbl_product 
                        WHERE product_id = ? AND location_id = ?
                    ");
                    $checkRemainingStmt->execute([$product_id, $source_location_id]);
                    $remainingQty = $checkRemainingStmt->fetch(PDO::FETCH_ASSOC);
                    
                    // If quantity is 0 or less, mark as out of stock but keep the record
                    // DO NOT DELETE the product record as it breaks transfer references
                    if ($remainingQty && $remainingQty['quantity'] <= 0) {
                        $updateStockStmt = $conn->prepare("
                            UPDATE tbl_product 
                            SET stock_status = 'out of stock',
                                quantity = 0
                            WHERE product_id = ? AND location_id = ?
                        ");
                        $updateStockStmt->execute([$product_id, $source_location_id]);
                        error_log("Updated product to out of stock in source location - Product ID: $product_id, Quantity set to 0");
                    }
                    
                    // Check if a product with the same name and category exists in destination (to avoid duplicate constraint violation)
                    $checkNameCategoryStmt = $conn->prepare("
                        SELECT product_id, quantity 
                        FROM tbl_product 
                        WHERE product_name = ? AND category = ? AND location_id = ?
                    ");
                    $checkNameCategoryStmt->execute([$productDetails['product_name'], $productDetails['category'], $destination_location_id]);
                    $existingNameCategoryProduct = $checkNameCategoryStmt->fetch(PDO::FETCH_ASSOC);
                    
                    // TRANSFER SYSTEM: Create or update product in destination location
                    // Check if product exists in destination location
                    $checkDestStmt = $conn->prepare("
                        SELECT product_id, quantity 
                        FROM tbl_product 
                        WHERE product_id = ? AND location_id = ?
                    ");
                    $checkDestStmt->execute([$product_id, $destination_location_id]);
                    $destProduct = $checkDestStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($destProduct) {
                        // Update existing product quantity in destination
                        $updateDestStmt = $conn->prepare("
                            UPDATE tbl_product 
                            SET quantity = quantity + ?,
                                stock_status = CASE 
                                    WHEN quantity + ? <= 0 THEN 'out of stock'
                                    WHEN quantity + ? <= 10 THEN 'low stock'
                                    ELSE 'in stock'
                                END
                            WHERE product_id = ? AND location_id = ?
                        ");
                        $updateDestStmt->execute([$transfer_qty, $transfer_qty, $transfer_qty, $product_id, $destination_location_id]);
                        error_log("Updated existing product in destination - Product ID: $product_id, Added Qty: $transfer_qty, Location: $destination_location_id");
                    } else {
                        // Create new product entry in destination location
                        $insertDestStmt = $conn->prepare("
                            INSERT INTO tbl_product (
                                product_name, category, barcode, description, prescription, bulk,
                                expiration, quantity, unit_price, brand_id, supplier_id,
                                location_id, batch_id, status, stock_status
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
                        ");
                        $stock_status = $transfer_qty <= 0 ? 'out of stock' : ($transfer_qty <= 10 ? 'low stock' : 'in stock');
                        $insertDestStmt->execute([
                            $productDetails['product_name'],
                            $productDetails['category'],
                            $productDetails['barcode'],
                            $productDetails['description'],
                            $productDetails['prescription'],
                            $productDetails['bulk'],
                            $productDetails['expiration'],
                            $transfer_qty,
                            $productDetails['unit_price'],
                            $productDetails['brand_id'],
                            $productDetails['supplier_id'],
                            $destination_location_id,
                            $productDetails['batch_id'],
                            $stock_status
                        ]);
                        error_log("Created new product in destination - Product ID: $product_id, Qty: $transfer_qty, Location: $destination_location_id");
                    }
                    
                    error_log("Transfer completed - Product ID: $product_id, Qty: $transfer_qty, From: $source_location_id, To: $destination_location_id");
                    
                    // Log the transfer with FIFO batch details
                    error_log("Transfer completed with FIFO batch consumption - Product ID: $product_id, Quantity: $transfer_qty, From: $source_location_id, To: $destination_location_id, Batches: " . json_encode($consumed_batches));
                    
                    // Insert individual batch details into transfer_batch_details table
                    if (!empty($consumed_batches)) {
                        $batchDetailsStmt = $conn->prepare("
                            INSERT INTO tbl_transfer_batch_details 
                            (transfer_id, product_id, batch_id, batch_reference, quantity, srp, expiration_date) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ");
                        
                        foreach ($consumed_batches as $batch) {
                            // Get batch details from FIFO stock
                            $batchInfoStmt = $conn->prepare("
                                SELECT fs.batch_id, fs.expiration_date, fs.srp 
                                FROM tbl_fifo_stock fs 
                                WHERE fs.batch_reference = ? AND fs.product_id = ? 
                                LIMIT 1
                            ");
                            $batchInfoStmt->execute([$batch['batch_reference'], $product_id]);
                            $batchInfo = $batchInfoStmt->fetch(PDO::FETCH_ASSOC);
                            
                            if ($batchInfo) {
                                $batchDetailsStmt->execute([
                                    $transfer_header_id,
                                    $product_id,
                                    $batchInfo['batch_id'],
                                    $batch['batch_reference'],
                                    $batch['quantity'],
                                    $batchInfo['srp'],
                                    $batchInfo['expiration_date']
                                ]);
                            }
                        }
                    }
                }
            }
            
            $conn->commit();
            
            // AUTO-SYNC: Update product quantities to match FIFO stock totals after transfer
            try {
                foreach ($products as $product) {
                    $product_id = $product['product_id'];
                    
                    // Update source location product quantity to match FIFO total
                    $syncSourceStmt = $conn->prepare("
                        UPDATE tbl_product p
                        SET p.quantity = (
                            SELECT COALESCE(SUM(fs.available_quantity), 0)
                            FROM tbl_fifo_stock fs
                            WHERE fs.product_id = p.product_id
                        ),
                        p.stock_status = CASE 
                            WHEN (
                                SELECT COALESCE(SUM(fs.available_quantity), 0)
                                FROM tbl_fifo_stock fs
                                WHERE fs.product_id = p.product_id
                            ) <= 0 THEN 'out of stock'
                            WHEN (
                                SELECT COALESCE(SUM(fs.available_quantity), 0)
                                FROM tbl_fifo_stock fs
                                WHERE fs.product_id = p.product_id
                            ) <= 10 THEN 'low stock'
                            ELSE 'in stock'
                        END
                        WHERE p.product_id = ? AND p.location_id = ?
                    ");
                    $syncSourceStmt->execute([$product_id, $source_location_id]);
                    
                    error_log("Auto-synced source location product quantity with FIFO stock - Product ID: $product_id, Location: $source_location_id");
                }
            } catch (Exception $syncError) {
                error_log("Warning: Could not auto-sync product quantities after transfer: " . $syncError->getMessage());
                // Don't fail the transfer if sync fails
            }
            
            // Log final transfer summary
            error_log("Transfer completed successfully - Transfer ID: $transfer_header_id, Products: " . count($products));
        // Insert into transfer log for tracking
        try {
            foreach ($products as $product) {
                $product_id = $product['product_id'];
                $transfer_qty = $product['quantity'];
                
                // Get product details for logging
                $productStmt = $conn->prepare("
                    SELECT product_name, unit_price 
                    FROM tbl_product 
                    WHERE product_id = ?
                ");
                $productStmt->execute([$product_id]);
                $productDetails = $productStmt->fetch(PDO::FETCH_ASSOC);
                
                // Get location names for logging
                $sourceLocStmt = $conn->prepare("SELECT location_name FROM tbl_location WHERE location_id = ?");
                $sourceLocStmt->execute([$source_location_id]);
                $sourceLocation = $sourceLocStmt->fetch(PDO::FETCH_ASSOC);
                
                $destLocStmt = $conn->prepare("SELECT location_name FROM tbl_location WHERE location_id = ?");
                $destLocStmt->execute([$destination_location_id]);
                $destLocation = $destLocStmt->fetch(PDO::FETCH_ASSOC);
                
                // Insert into transfer log
                $logStmt = $conn->prepare("
                    INSERT INTO tbl_transfer_log (
                        product_id, product_name, from_location, to_location, 
                        quantity, transfer_date, created_at
                    ) VALUES (?, ?, ?, ?, ?, CURDATE(), NOW())
                ");
                $logStmt->execute([
                    $product_id,
                    $productDetails['product_name'] ?? 'Unknown Product',
                    $sourceLocation['location_name'] ?? 'Unknown Source',
                    $destLocation['location_name'] ?? 'Unknown Destination',
                    $transfer_qty
                ]);
                
                error_log("Transfer logged: Product ID $product_id, Qty: $transfer_qty, From: " . 
                    ($sourceLocation['location_name'] ?? 'Unknown') . ", To: " . 
                    ($destLocation['location_name'] ?? 'Unknown'));
            }
        } catch (Exception $logError) {
            error_log("Warning: Could not log transfer to tbl_transfer_log: " . $logError->getMessage());
            // Don't fail the transfer if logging fails
        }
        
        echo json_encode([
            "success" => true,
            "message" => "Transfer completed successfully. Products moved to destination location.",
            "transfer_id" => $transfer_header_id,
            "products_transferred" => count($products),
            "source_location" => $source_location_id,
            "destination_location" => $destination_location_id
        ]);
            
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;

    case 'add_supplier':
        try {
            $supplier_name = $data['supplier_name'] ?? '';
            $supplier_address = $data['supplier_address'] ?? '';
            $supplier_contact = $data['supplier_contact'] ?? '';
            $supplier_email = $data['supplier_email'] ?? '';
            $primary_phone = $data['primary_phone'] ?? '';
            $primary_email = $data['primary_email'] ?? '';
            $contact_person = $data['contact_person'] ?? '';
            $contact_title = $data['contact_title'] ?? '';
            $payment_terms = $data['payment_terms'] ?? '';
            $lead_time_days = $data['lead_time_days'] ?? '';
            $order_level = $data['order_level'] ?? '';
            $credit_rating = $data['credit_rating'] ?? '';
            $notes = $data['notes'] ?? '';
            
            $stmt = $conn->prepare("
                INSERT INTO tbl_supplier (
                    supplier_name, supplier_address, supplier_contact, supplier_email,
                    primary_phone, primary_email, contact_person, contact_title,
                    payment_terms, lead_time_days, order_level, credit_rating, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $supplier_name, $supplier_address, $supplier_contact, $supplier_email,
                $primary_phone, $primary_email, $contact_person, $contact_title,
                $payment_terms, $lead_time_days, $order_level, $credit_rating, $notes
            ]);
            
            echo json_encode(["success" => true, "message" => "Supplier added successfully"]);
            
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;

    case 'update_supplier':
        try {
            $supplier_id = $data['supplier_id'] ?? 0;
            $supplier_name = $data['supplier_name'] ?? '';
            $supplier_address = $data['supplier_address'] ?? '';
            $supplier_contact = $data['supplier_contact'] ?? '';
            $supplier_email = $data['supplier_email'] ?? '';
            $contact_person = $data['contact_person'] ?? '';
            $payment_terms = $data['payment_terms'] ?? '';
            $lead_time_days = $data['lead_time_days'] ?? '';
            $notes = $data['notes'] ?? '';
            
            $stmt = $conn->prepare("
                UPDATE tbl_supplier SET 
                    supplier_name = ?, supplier_address = ?, supplier_contact = ?,
                    supplier_email = ?, contact_person = ?, payment_terms = ?,
                    lead_time_days = ?, notes = ?
                WHERE supplier_id = ?
            ");
            
            $stmt->execute([
                $supplier_name, $supplier_address, $supplier_contact,
                $supplier_email, $contact_person, $payment_terms,
                $lead_time_days, $notes, $supplier_id
            ]);
            
            echo json_encode(["success" => true, "message" => "Supplier updated successfully"]);
            
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;

    case 'delete_supplier':
        try {
            $supplier_id = $data['supplier_id'] ?? 0;
            $reason = $data['reason'] ?? 'Archived by user';
            $archived_by = $data['archived_by'] ?? 'admin';
            
            // Get supplier details before archiving
            $stmt = $conn->prepare("SELECT * FROM tbl_supplier WHERE supplier_id = ?");
            $stmt->execute([$supplier_id]);
            $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$supplier) {
                echo json_encode(["success" => false, "message" => "Supplier not found"]);
                break;
            }

            $conn->beginTransaction();

            try {
                // Update supplier status to archived
                $stmt = $conn->prepare("UPDATE tbl_supplier SET status = 'archived' WHERE supplier_id = ?");
                $stmt->execute([$supplier_id]);
                
                // Add to archive table
                $stmt = $conn->prepare("
                    INSERT INTO tbl_archive (
                        item_id, item_type, item_name, item_description, category, 
                        archived_by, archived_date, archived_time, reason, status, original_data
                    ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), CURTIME(), ?, 'Archived', ?)
                ");
                $stmt->execute([
                    $supplier_id,
                    'Supplier',
                    $supplier['supplier_name'],
                    $supplier['supplier_address'] ?? '',
                    'Suppliers',
                    $archived_by,
                    $reason,
                    json_encode($supplier)
                ]);

                $conn->commit();
                echo json_encode(["success" => true, "message" => "Supplier archived successfully"]);
                
            } catch (Exception $e) {
                $conn->rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;

    case 'delete_product':
        try {
            $product_id = $data['product_id'] ?? 0;
            $reason = $data['reason'] ?? 'Archived by user';
            $archived_by = $data['archived_by'] ?? 'admin';
            
            // Get product details before archiving
            $stmt = $conn->prepare("SELECT * FROM tbl_product WHERE product_id = ?");
            $stmt->execute([$product_id]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                echo json_encode(["success" => false, "message" => "Product not found"]);
                break;
            }

            $conn->beginTransaction();

            try {
                // Update product status to archived
                $stmt = $conn->prepare("UPDATE tbl_product SET status = 'archived' WHERE product_id = ?");
                $stmt->execute([$product_id]);
                
                // Add to archive table
                $stmt = $conn->prepare("
                    INSERT INTO tbl_archive (
                        item_id, item_type, item_name, item_description, category, 
                        archived_by, archived_date, archived_time, reason, status, original_data
                    ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), CURTIME(), ?, 'Archived', ?)
                ");
                $stmt->execute([
                    $product_id,
                    'Product',
                    $product['product_name'],
                    $product['description'] ?? '',
                    $product['category'] ?? '',
                    $archived_by,
                    $reason,
                    json_encode($product)
                ]);

                $conn->commit();
                echo json_encode(["success" => true, "message" => "Product archived successfully"]);
                
            } catch (Exception $e) {
                $conn->rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;

    case 'update_transfer_status':
        try {
            $transfer_header_id = $data['transfer_header_id'] ?? 0;
            $new_status = $data['status'] ?? '';
            $employee_id = $data['employee_id'] ?? 0;
            $notes = $data['notes'] ?? '';
            
            if (!$transfer_header_id || !$new_status) {
                echo json_encode(["success" => false, "message" => "Transfer ID and status are required"]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Update transfer status
            $stmt = $conn->prepare("
                UPDATE tbl_transfer_header 
                SET status = ? 
                WHERE transfer_header_id = ?
            ");
            $stmt->execute([$new_status, $transfer_header_id]);
            
            // If status is "Completed", add products to destination location
            if ($new_status === 'Completed') {
                // Get transfer details
                $transferStmt = $conn->prepare("
                    SELECT th.source_location_id, th.destination_location_id, td.product_id, td.qty
                    FROM tbl_transfer_header th
                    JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                    WHERE th.transfer_header_id = ?
                ");
                $transferStmt->execute([$transfer_header_id]);
                $transferDetails = $transferStmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($transferDetails as $detail) {
                    $product_id = $detail['product_id'];
                    $qty = $detail['qty'];
                    $destination_location_id = $detail['destination_location_id'];
                    
                    // Get the original product details
                    $productStmt = $conn->prepare("
                        SELECT product_name, category, barcode, description, prescription, bulk,
                               expiration, unit_price, brand_id, supplier_id, batch_id, status,
                        FROM tbl_product 
                        WHERE product_id = ?
                        LIMIT 1
                    ");
                    $productStmt->execute([$product_id]);
                    $productDetails = $productStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($productDetails) {
                        // Check if product exists in destination location
                        $checkStmt = $conn->prepare("
                            SELECT product_id, quantity 
                            FROM tbl_product 
                            WHERE product_id = ? AND location_id = ?
                        ");
                        $checkStmt->execute([$product_id, $destination_location_id]);
                        $existingProduct = $checkStmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($existingProduct) {
                            // Update existing product quantity
                            $updateStmt = $conn->prepare("
                                UPDATE tbl_product 
                                SET quantity = quantity + ?,
                                    stock_status = CASE 
                                        WHEN quantity + ? <= 0 THEN 'out of stock'
                                        WHEN quantity + ? <= 10 THEN 'low stock'
                                        ELSE 'in stock'
                                    END
                                WHERE product_id = ? AND location_id = ?
                            ");
                            $updateStmt->execute([$qty, $qty, $qty, $product_id, $destination_location_id]);
                        } else {
                            // Create new product entry in destination location
                            $insertStmt = $conn->prepare("
                                INSERT INTO tbl_product (
                                    product_name, category, barcode, description, prescription, bulk,
                                    expiration, quantity, unit_price, brand_id, supplier_id,
                                    location_id, batch_id, status, stock_status
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ");
                            $insertStmt->execute([
                                $productDetails['product_name'],
                                $productDetails['category'],
                                $productDetails['barcode'],
                                $productDetails['description'],
                                $productDetails['prescription'],
                                $productDetails['bulk'],
                                $productDetails['expiration'],
                                $qty,
                                $productDetails['unit_price'],
                                $productDetails['brand_id'],
                                $productDetails['supplier_id'],
                                $destination_location_id,
                                $productDetails['batch_id'],
                                $qty <= 0 ? 'out of stock' : ($qty <= 10 ? 'low stock' : 'in stock')
                            ]);
                        }
                    }
                }
            }
            
            // Log the status change
            $logStmt = $conn->prepare("
                INSERT INTO tbl_transfer_log (
                    transfer_header_id, status, employee_id, notes, log_date
                ) VALUES (?, ?, ?, ?, NOW())
            ");
            $logStmt->execute([$transfer_header_id, $new_status, $employee_id, $notes]);
            
            $conn->commit();
            echo json_encode([
                "success" => true, 
                "message" => "Transfer status updated to " . $new_status . 
                            ($new_status === 'Completed' ? ". Products added to destination location." : "")
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;
    case 'delete_transfer':
        try {
            $transfer_header_id = $data['transfer_header_id'] ?? 0;
            
            if (!$transfer_header_id) {
                echo json_encode(["success" => false, "message" => "Transfer ID is required"]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get transfer details to restore quantities
            $transferStmt = $conn->prepare("
                SELECT th.source_location_id, td.product_id, td.qty
                FROM tbl_transfer_header th
                JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                WHERE th.transfer_header_id = ?
            ");
            $transferStmt->execute([$transfer_header_id]);
            $transferDetails = $transferStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Restore quantities to source location
            foreach ($transferDetails as $detail) {
                $updateStmt = $conn->prepare("
                    UPDATE tbl_product 
                    SET quantity = quantity + ?,
                        stock_status = CASE 
                            WHEN quantity + ? <= 0 THEN 'out of stock'
                            WHEN quantity + ? <= 10 THEN 'low stock'
                            ELSE 'in stock'
                        END
                    WHERE product_id = ?
                ");
                $updateStmt->execute([$detail['qty'], $detail['qty'], $detail['qty'], $detail['product_id']]);
            }
            
            // Delete transfer details
            $deleteDetailsStmt = $conn->prepare("DELETE FROM tbl_transfer_dtl WHERE transfer_header_id = ?");
            $deleteDetailsStmt->execute([$transfer_header_id]);
            
            // Delete transfer header
            $deleteHeaderStmt = $conn->prepare("DELETE FROM tbl_transfer_header WHERE transfer_header_id = ?");
            $deleteHeaderStmt->execute([$transfer_header_id]);
            
            $conn->commit();
            echo json_encode(["success" => true, "message" => "Transfer deleted successfully. Quantities restored to source location."]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;

    case 'get_batches':
        try {
            $stmt = $conn->prepare("
                SELECT 
                    b.batch_id,
                    b.batch,
                    b.entry_date,
                    b.entry_time,
                    b.entry_by,
                    b.order_no,
                    s.supplier_name,
                    l.location_name,
                    COUNT(p.product_id) as product_count,
                    SUM(p.quantity * p.unit_price) as total_value
                FROM tbl_batch b
                LEFT JOIN tbl_supplier s ON b.supplier_id = s.supplier_id
                LEFT JOIN tbl_location l ON b.location_id = l.location_id
                LEFT JOIN tbl_product p ON b.batch_id = p.batch_id
                WHERE b.batch IS NOT NULL AND b.batch != ''
                GROUP BY b.batch_id, b.batch, b.entry_date, b.entry_time, b.entry_by, b.order_no, s.supplier_name, l.location_name
                ORDER BY b.batch_id DESC
            ");
            $stmt->execute();
            $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $batches
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;
    
    case 'get_locations_for_filter':
        try {
            $stmt = $conn->prepare("
                SELECT DISTINCT location_name 
                FROM tbl_location 
                ORDER BY location_name
            ");
            $stmt->execute();
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $locations
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;
    case 'get_products_by_location':
        try {
            $location_name = $data['location_name'] ?? '';
            
            if (empty($location_name)) {
                echo json_encode([
                    "success" => false,
                    "message" => "Location name is required"
                ]);
                break;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    p.*,
                    s.supplier_name,
                    b.brand,
                    l.location_name,
                    batch.batch as batch_reference,
                    batch.entry_date,
                    batch.entry_by
                FROM tbl_product p 
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id 
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id 
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_batch batch ON p.batch_id = batch.batch_id
                WHERE (p.status IS NULL OR p.status <> 'archived')
                AND l.location_name = ?
                ORDER BY p.product_name ASC
            ");
            $stmt->execute([$location_name]);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $products
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    // POS: initial product list for POS UI
    case 'get_pos_products':
        try {
            $location_name = $data['location_name'] ?? '';
            $where = "(p.status IS NULL OR p.status = 'active')";
            $params = [];
            if ($location_name !== '') {
                $where .= " AND l.location_name = ?";
                $params[] = $location_name;
            }

            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.category,
                    p.quantity,
                    p.unit_price,
                    p.srp,
                    l.location_name
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                WHERE $where
                ORDER BY p.product_name ASC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "data" => $rows
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;
    case 'check_barcode':
        try {
            $barcode = $data['barcode'] ?? '';
            $location_name = $data['location_name'] ?? null;
            $location_id = $data['location_id'] ?? null;
            
            if (empty($barcode)) {
                echo json_encode([
                    "success" => false,
                    "message" => "Barcode is required"
                ]);
                break;
            }
            
            // Find product by barcode first
            $stmt = $conn->prepare(
                "SELECT p.*, l.location_name AS base_location_name
                 FROM tbl_product p
                 LEFT JOIN tbl_location l ON p.location_id = l.location_id
                 WHERE p.barcode = ?
                 AND (p.status IS NULL OR p.status <> 'archived')
                 LIMIT 1"
            );
            $stmt->execute([$barcode]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($product) {
                $product_id = (int)$product['product_id'];
                
                // Resolve effective location from the latest approved transfer (destination)
                $tx = $conn->prepare(
                    "SELECT th.destination_location_id AS dest_id, dl.location_name AS dest_name
                     FROM tbl_transfer_dtl td
                     JOIN tbl_transfer_header th ON th.transfer_header_id = td.transfer_header_id AND th.status = 'approved'
                     LEFT JOIN tbl_location dl ON dl.location_id = th.destination_location_id
                     WHERE td.product_id = ?
                     ORDER BY th.transfer_header_id DESC
                     LIMIT 1"
                );
                $tx->execute([$product_id]);
                $latestTransfer = $tx->fetch(PDO::FETCH_ASSOC);
                
                $effective_location_id = $product['location_id'];
                $effective_location_name = $product['base_location_name'];
                if ($latestTransfer && !empty($latestTransfer['dest_id'])) {
                    $effective_location_id = (int)$latestTransfer['dest_id'];
                    $effective_location_name = $latestTransfer['dest_name'];
                }
                
                // Validate against requested location, if any
                $matchesTarget = true;
                if (!empty($location_id)) {
                    $matchesTarget = ((int)$location_id === (int)$effective_location_id);
                } else if (!empty($location_name)) {
                    $matchesTarget = (mb_strtolower(trim($location_name)) === mb_strtolower(trim((string)$effective_location_name)));
                }
                
                if ($matchesTarget) {
                    $product['location_id'] = $effective_location_id;
                    $product['location_name'] = $effective_location_name;

                    // Compute an approximate on-hand for resolved location using transfers in/out
                    // Transfers IN to this location
                    $inStmt = $conn->prepare(
                        "SELECT COALESCE(SUM(td.qty),0) AS qty_in
                         FROM tbl_transfer_dtl td
                         JOIN tbl_transfer_header th ON th.transfer_header_id = td.transfer_header_id AND th.status = 'approved'
                         WHERE td.product_id = ? AND th.destination_location_id = ?"
                    );
                    $inStmt->execute([$product_id, $effective_location_id]);
                    $qtyIn = (int)($inStmt->fetchColumn() ?: 0);

                    // Transfers OUT from this location
                    $outStmt = $conn->prepare(
                        "SELECT COALESCE(SUM(td.qty),0) AS qty_out
                         FROM tbl_transfer_dtl td
                         JOIN tbl_transfer_header th ON th.transfer_header_id = td.transfer_header_id AND th.status = 'approved'
                         WHERE td.product_id = ? AND th.source_location_id = ?"
                    );
                    $outStmt->execute([$product_id, $effective_location_id]);
                    $qtyOut = (int)($outStmt->fetchColumn() ?: 0);

                    $transferBalance = $qtyIn - $qtyOut; // does not subtract sales; quick approximation

                    // If the resolved location differs from base, prefer transfer balance when positive
                    if ((int)$effective_location_id !== (int)$product['location_id'] || $effective_location_name !== $product['base_location_name']) {
                        if ($transferBalance > 0) {
                            $product['quantity'] = $transferBalance;
                        }
                    } else {
                        // Same location: if transfer balance is non-zero and looks more accurate, expose it
                        if ($transferBalance >= 0) {
                            $product['quantity'] = $transferBalance;
                        }
                    }

                    echo json_encode([ 'success' => true, 'product' => $product, 'message' => 'Product found' ]);
                } else {
                    echo json_encode([
                        'success' => false,
                        'product' => null,
                        'message' => 'Product found in a different location',
                        'data' => [
                            'resolved_location_id' => $effective_location_id,
                            'resolved_location_name' => $effective_location_name
                        ]
                    ]);
                }
            } else {
                echo json_encode([
                    'success' => false,
                    'product' => null,
                    'message' => 'Product not found'
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "product" => null
            ]);
        }
        break;

    // POS: fetch discount options from tbl_discount
    case 'get_discounts':
        try {
            $stmt = $conn->prepare("SELECT discount_id, discount_rate, discount_type FROM tbl_discount");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "data" => $rows
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'update_product_stock':
        try {
            $product_id = $data['product_id'] ?? 0;
            $new_quantity = $data['new_quantity'] ?? 0;
            $batch_reference = $data['batch_reference'] ?? '';
            $expiration_date = $data['expiration_date'] ?? null;
            $unit_cost = $data['unit_cost'] ?? 0;
            $new_srp = $data['new_srp'] ?? null;
            $entry_by = $data['entry_by'] ?? 'admin';
            
            // Use unit_cost as srp if new_srp is not provided
            $srp = $new_srp ?? $unit_cost;
            
            if ($product_id <= 0 || $new_quantity <= 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid product ID or quantity"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get current product details including current quantity
            $productStmt = $conn->prepare("
                SELECT product_name, category, barcode, description, prescription, bulk,
                       expiration, unit_price, brand_id, supplier_id, location_id, status,  quantity
                FROM tbl_product 
                WHERE product_id = ?
                LIMIT 1
            ");
            $productStmt->execute([$product_id]);
            $productDetails = $productStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$productDetails) {
                throw new Exception("Product not found");
            }
            
            $old_quantity = $productDetails['quantity'];
            $quantity_change = $new_quantity; // This is the amount being added
            
            // Create batch record if batch reference is provided
            $batch_id = null;
            if ($batch_reference) {
                $batchStmt = $conn->prepare("
                    INSERT INTO tbl_batch (
                        batch, supplier_id, location_id, entry_date, entry_time, 
                        entry_by, order_no
                    ) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?)
                ");
                $batchStmt->execute([$batch_reference, $productDetails['supplier_id'], $productDetails['location_id'], $entry_by, '']);
                $batch_id = $conn->lastInsertId();
            }
            
            // Update product quantity
            $updateStmt = $conn->prepare("
                UPDATE tbl_product 
                SET quantity = quantity + ?,
                    stock_status = CASE 
                        WHEN quantity + ? <= 0 THEN 'out of stock'
                        WHEN quantity + ? <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END,
                    batch_id = COALESCE(?, batch_id),
                    expiration = COALESCE(?, expiration)
                WHERE product_id = ?
            ");
            $updateStmt->execute([$new_quantity, $new_quantity, $new_quantity, $batch_id, $expiration_date, $product_id]);
            
            // Create FIFO stock entry if batch_id is available
            if ($batch_id) {
                $fifoStmt = $conn->prepare("
                    INSERT INTO tbl_fifo_stock (
                        product_id, batch_id, batch_reference, quantity, available_quantity,
                        unit_cost, srp, expiration_date, entry_date, entry_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)
                ");
                $fifoStmt->execute([
                    $product_id, $batch_id, $batch_reference, $new_quantity, $new_quantity,
                    $unit_cost, $srp, $expiration_date, $entry_by
                ]);
            }
            
            // Record the stock movement for tracking quantity changes
            $movementStmt = $conn->prepare("
                INSERT INTO tbl_stock_movements (
                    product_id, batch_id, movement_type, quantity, remaining_quantity,
                    expiration_date, reference_no, notes, created_by
                ) VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?)
            ");
            $movementStmt->execute([
                $product_id,
                $batch_id ?: $productDetails['batch_id'],
                $quantity_change,
                $old_quantity + $new_quantity,
                $expiration_date,
                $batch_reference,
                "Stock added: +{$quantity_change} units. Old: {$old_quantity}, New: " . ($old_quantity + $new_quantity),
                $entry_by
            ]);
            
            $conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Stock updated successfully with FIFO tracking"
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'reduce_product_stock':
        try {
            $product_id = $data['product_id'] ?? 0;
            $quantity_to_reduce = $data['quantity'] ?? 0;
            $transaction_id = $data['transaction_id'] ?? '';
            $location_name = $data['location_name'] ?? '';
            $entry_by = $data['entry_by'] ?? 'POS System';
            
            if ($product_id <= 0 || $quantity_to_reduce <= 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid product ID or quantity"
                ]);
                break;
            }
            
            if (empty($location_name)) {
                echo json_encode([
                    "success" => false,
                    "message" => "Location name is required for stock updates"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get location ID for the specified location
            $locationStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name = ?");
            $locationStmt->execute([$location_name]);
            $location = $locationStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$location) {
                throw new Exception("Location '{$location_name}' not found");
            }
            $location_id = $location['location_id'];
            
            // First, check if this is a transferred product in the current location
            $transferStmt = $conn->prepare("
                SELECT 
                    th.transfer_header_id, 
                    td.transfer_dtl_id, 
                    td.qty as available_transfer_qty,
                    p.product_name,
                    p.unit_price,
                    p.batch_id
                FROM tbl_transfer_header th
                JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                JOIN tbl_product p ON td.product_id = p.product_id
                WHERE td.product_id = ? 
                AND th.destination_location_id = ?
                AND th.status = 'approved'
                AND td.qty > 0
                ORDER BY th.date DESC
                LIMIT 1
            ");
            $transferStmt->execute([$product_id, $location_id]);
            $transferDetails = $transferStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($transferDetails) {
                // This is a transferred product - update transfer quantities
                $current_quantity = $transferDetails['available_transfer_qty'];
                
                // Check if we have enough stock in the transfer
                if ($current_quantity < $quantity_to_reduce) {
                    throw new Exception("Insufficient stock in {$location_name}. Available: {$current_quantity}, Requested: {$quantity_to_reduce}");
                }
                
                $new_quantity = $current_quantity - $quantity_to_reduce;
                
                // Update transfer detail quantity
                $updateTransferStmt = $conn->prepare("
                    UPDATE tbl_transfer_dtl 
                    SET qty = ?
                    WHERE transfer_dtl_id = ?
                ");
                $updateTransferStmt->execute([$new_quantity, $transferDetails['transfer_dtl_id']]);
                
                error_log("Updated transfer quantity for product $product_id in {$location_name}: {$current_quantity} -> {$new_quantity}");
                
                // Record the stock movement for the transfer
                $movementStmt = $conn->prepare("
                    INSERT INTO tbl_stock_movements (
                        product_id, batch_id, movement_type, quantity, remaining_quantity,
                        unit_cost, reference_no, notes, created_by
                    ) VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?)
                ");
                $movementStmt->execute([
                    $product_id,
                    $transferDetails['batch_id'],
                    $quantity_to_reduce,
                    $new_quantity,
                    $transferDetails['unit_price'],
                    $transaction_id,
                    "POS Sale from {$location_name}: -{$quantity_to_reduce} units sold from transfer. Transfer qty: {$current_quantity} -> {$new_quantity}",
                    $entry_by
                ]);
                
                $conn->commit();
                echo json_encode([
                    "success" => true,
                    "message" => "Transfer stock reduced successfully for POS sale in {$location_name}",
                    "data" => [
                        "product_id" => $product_id,
                        "product_name" => $transferDetails['product_name'],
                        "location" => $location_name,
                        "old_quantity" => $current_quantity,
                        "new_quantity" => $new_quantity,
                        "quantity_reduced" => $quantity_to_reduce,
                        "transaction_id" => $transaction_id,
                        "stock_type" => "transferred"
                    ]
                ]);
                break;
            }
            
            // If not transferred, check if it's a regular product in this location
            $productStmt = $conn->prepare("
                SELECT product_name, category, barcode, description, prescription, bulk,
                       expiration, unit_price, brand_id, supplier_id, location_id, status, quantity,
                       batch_id
                FROM tbl_product 
                WHERE product_id = ? AND location_id = ?
                LIMIT 1
            ");
            $productStmt->execute([$product_id, $location_id]);
            $productDetails = $productStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$productDetails) {
                throw new Exception("Product not found in {$location_name}. Product may be in a different location or not exist.");
            }
            
            $current_quantity = $productDetails['quantity'];
            
            // Check if we have enough stock
            if ($current_quantity < $quantity_to_reduce) {
                throw new Exception("Insufficient stock in {$location_name}. Available: {$current_quantity}, Requested: {$quantity_to_reduce}");
            }
            
            $new_quantity = $current_quantity - $quantity_to_reduce;
            
            // Update product quantity (only for the specific location)
            $updateStmt = $conn->prepare("
                UPDATE tbl_product 
                SET quantity = ?,
                    stock_status = CASE 
                        WHEN ? <= 0 THEN 'out of stock'
                        WHEN ? <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END
                WHERE product_id = ? AND location_id = ?
            ");
            $updateStmt->execute([$new_quantity, $new_quantity, $new_quantity, $product_id, $location_id]);
            
            // Update FIFO stock - reduce from oldest batch first
            $fifoStmt = $conn->prepare("
                SELECT fifo_id, available_quantity, batch_reference
                FROM tbl_fifo_stock 
                WHERE product_id = ? AND available_quantity > 0
                ORDER BY entry_date ASC, fifo_id ASC
                FOR UPDATE
            ");
            $fifoStmt->execute([$product_id]);
            $fifoBatches = $fifoStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $remaining_to_reduce = $quantity_to_reduce;
            
            foreach ($fifoBatches as $batch) {
                if ($remaining_to_reduce <= 0) break;
                
                $batch_quantity = min($batch['available_quantity'], $remaining_to_reduce);
                
                // Update FIFO stock
                $updateFifoStmt = $conn->prepare("
                    UPDATE tbl_fifo_stock 
                    SET available_quantity = available_quantity - ?
                    WHERE fifo_id = ?
                ");
                $updateFifoStmt->execute([$batch_quantity, $batch['fifo_id']]);
                
                $remaining_to_reduce -= $batch_quantity;
            }
            
            // This section is now handled above in the transferred product logic
            
            // Record the stock movement for tracking quantity changes
            $movementStmt = $conn->prepare("
                INSERT INTO tbl_stock_movements (
                    product_id, batch_id, movement_type, quantity, remaining_quantity,
                    unit_cost, expiration_date, reference_no, notes, created_by
                ) VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?, ?)
            ");
            $movementStmt->execute([
                $product_id,
                $productDetails['batch_id'],
                $quantity_to_reduce,
                $new_quantity,
                $productDetails['unit_price'],
                $productDetails['expiration'],
                $transaction_id,
                "POS Sale from {$location_name}: -{$quantity_to_reduce} units sold. Regular product qty: {$current_quantity} -> {$new_quantity}",
                $entry_by
            ]);
            
            $conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Regular stock reduced successfully for POS sale in {$location_name}",
                "data" => [
                    "product_id" => $product_id,
                    "product_name" => $productDetails['product_name'],
                    "location" => $location_name,
                    "old_quantity" => $current_quantity,
                    "new_quantity" => $new_quantity,
                    "quantity_reduced" => $quantity_to_reduce,
                    "transaction_id" => $transaction_id,
                    "stock_type" => "regular",
                    "stock_status" => $new_quantity <= 0 ? 'out of stock' : ($new_quantity <= 10 ? 'low stock' : 'in stock')
                ]
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'get_pos_inventory':
        try {
            $location_id = $data['location_id'] ?? 0;
            $search = $data['search'] ?? '';
            
            if (!$location_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Location ID is required"
                ]);
                break;
            }
            
            $whereConditions = ["p.location_id = ?"];
            $params = [$location_id];
            
            if (!empty($search)) {
                $whereConditions[] = "(p.product_name LIKE ? OR p.barcode LIKE ?)";
                $searchParam = "%$search%";
                $params[] = $searchParam;
                $params[] = $searchParam;
            }
            
            $whereClause = implode(" AND ", $whereConditions);
            
            // Get products with real-time stock levels including transfers
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.category,
                    p.barcode,
                    p.description,
                    p.quantity,
                    p.unit_price,
                    p.srp,
                    p.stock_status,
                    p.status,
                    COALESCE(b.brand, '') as brand,
                    COALESCE(s.supplier_name, '') as supplier_name,
                    'Regular' as product_type
                FROM tbl_product p
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                WHERE $whereClause
                AND p.status = 'active'
                AND p.quantity > 0
                ORDER BY p.product_name ASC
            ");
            
            $stmt->execute($params);
            $regularProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get transferred products with current available quantities
            $transferStmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.category,
                    p.barcode,
                    p.description,
                    td.qty as quantity,
                    p.unit_price,
                    p.srp,
                    CASE 
                        WHEN td.qty <= 0 THEN 'out of stock'
                        WHEN td.qty <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END as stock_status,
                    'active' as status,
                    COALESCE(b.brand, '') as brand,
                    COALESCE(s.supplier_name, '') as supplier_name,
                    'Transferred' as product_type,
                    th.transfer_header_id
                FROM tbl_transfer_header th
                JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                JOIN tbl_product p ON td.product_id = p.product_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                WHERE th.destination_location_id = ?
                AND th.status = 'approved'
                AND td.qty > 0
                " . (!empty($search) ? "AND (p.product_name LIKE ? OR p.barcode LIKE ?)" : "") . "
                ORDER BY p.product_name ASC
            ");
            
            $transferParams = [$location_id];
            if (!empty($search)) {
                $transferParams[] = "%$search%";
                $transferParams[] = "%$search%";
            }
            
            $transferStmt->execute($transferParams);
            $transferredProducts = $transferStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Combine and deduplicate products, summing quantities for same product
            $allProducts = array_merge($regularProducts, $transferredProducts);
            $uniqueProducts = [];
            $seenProducts = [];
            
            foreach ($allProducts as $product) {
                $key = $product['product_name'] . '|' . $product['category'] . '|' . $product['barcode'];
                
                if (!isset($seenProducts[$key])) {
                    $seenProducts[$key] = count($uniqueProducts);
                    $uniqueProducts[] = $product;
                } else {
                    // If duplicate found, sum the quantities
                    $existingIndex = $seenProducts[$key];
                    $uniqueProducts[$existingIndex]['quantity'] += $product['quantity'];
                    
                    // Update stock status based on new total quantity
                    $totalQty = $uniqueProducts[$existingIndex]['quantity'];
                    $uniqueProducts[$existingIndex]['stock_status'] = 
                        $totalQty <= 0 ? 'out of stock' : 
                        ($totalQty <= 10 ? 'low stock' : 'in stock');
                    
                    // Prefer transferred version if available
                    if ($product['product_type'] === 'Transferred') {
                        $uniqueProducts[$existingIndex]['product_type'] = 'Transferred';
                        $uniqueProducts[$existingIndex]['transfer_header_id'] = $product['transfer_header_id'];
                    }
                }
            }
            
            echo json_encode([
                "success" => true,
                "data" => $uniqueProducts,
                "summary" => [
                    "total_products" => count($uniqueProducts),
                    "regular_products" => count($regularProducts),
                    "transferred_products" => count($transferredProducts)
                ]
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'get_quantity_history':
        try {
            $product_id = $data['product_id'] ?? 0;
            
            if ($product_id <= 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid product ID"
                ]);
                break;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    sm.movement_id,
                    sm.movement_type,
                    sm.quantity as quantity_change,
                    sm.remaining_quantity,
                    sm.unit_cost,
                    sm.movement_date,
                    sm.reference_no,
                    sm.notes,
                    sm.created_by,
                    b.batch_reference,
                    b.entry_date as batch_date,
                    -- Get expiration date from tbl_fifo_stock (priority 1)
                    COALESCE(fs.expiration_date, sm.expiration_date) as expiration_date,
                    -- Get expiration date from tbl_product as fallback
                    p.expiration as product_expiration
                FROM tbl_stock_movements sm
                LEFT JOIN tbl_batch b ON sm.batch_id = b.batch_id
                LEFT JOIN tbl_fifo_stock fs ON sm.product_id = fs.product_id AND sm.batch_id = fs.batch_id
                LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                WHERE sm.product_id = ? 
                AND sm.movement_type != 'OUT'
                ORDER BY sm.movement_date DESC
                LIMIT 20
            ");
            $stmt->execute([$product_id]);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $history
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'get_movement_history':
        try {
            $search = $data['search'] ?? '';
            $movement_type = $data['movement_type'] ?? 'all';
            $location = $data['location'] ?? 'all';
            $date_range = $data['date_range'] ?? 'all';
            
            // Build WHERE clause for filtering
            $whereConditions = [];
            $params = [];
            
            if ($search) {
                $whereConditions[] = "(p.product_name LIKE ? OR p.barcode LIKE ? OR e.Fname LIKE ? OR e.Lname LIKE ?)";
                $searchTerm = "%$search%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            if ($location !== 'all') {
                $whereConditions[] = "(sl.location_name = ? OR dl.location_name = ?)";
                $params[] = $location;
                $params[] = $location;
            }
            
            if ($date_range !== 'all') {
                switch ($date_range) {
                    case 'today':
                        $whereConditions[] = "DATE(th.date) = CURDATE()";
                        break;
                    case 'week':
                        $whereConditions[] = "th.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
                        break;
                    case 'month':
                        $whereConditions[] = "th.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
                        break;
                }
            }
            
            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            $stmt = $conn->prepare("
                SELECT 
                    th.transfer_header_id as id,
                    p.product_name,
                    p.barcode as productId,
                    'Transfer' as movementType,
                    td.qty as quantity,
                    sl.location_name as fromLocation,
                    dl.location_name as toLocation,
                    CONCAT(e.Fname, ' ', e.Lname) as movedBy,
                    th.date,
                    TIME(th.date) as time,
                    CASE 
                        WHEN th.status = '' OR th.status IS NULL THEN 'Completed'
                        WHEN th.status = 'pending' THEN 'Pending'
                        WHEN th.status = 'approved' THEN 'Completed'
                        WHEN th.status = 'rejected' THEN 'Cancelled'
                        ELSE th.status
                    END as status,
                    NULL as notes,
                    CONCAT('TR-', th.transfer_header_id) as reference,
                    p.category,
                    p.description,
                    p.unit_price,
                    b.brand
                FROM tbl_transfer_header th
                JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                JOIN tbl_product p ON td.product_id = p.product_id
                LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                $whereClause
                ORDER BY th.date DESC, th.transfer_header_id DESC
            ");
            $stmt->execute($params);
            $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $movements
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;
    case 'get_fifo_stock':
        try {
            $product_id = isset($data['product_id']) ? intval($data['product_id']) : 0;
            
            if ($product_id <= 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid product ID"
                ]);
                break;
            }
            
            // Query to get FIFO stock data for the product with batch dates
            $stmt = $conn->prepare("
                SELECT 
                    fs.fifo_id as summary_id,
                    fs.batch_id,
                    fs.batch_id as batch_number,
                    fs.batch_reference,
                    fs.available_quantity,
                    fs.unit_cost,
                    fs.srp as fifo_srp,
                    COALESCE(fs.srp, p.srp, p.unit_price) AS srp,
                    fs.expiration_date,
                    fs.quantity as total_quantity,
                    fs.entry_date as fifo_entry_date,
                    b.entry_date as batch_date,
                    b.entry_time as batch_time,
                    ROW_NUMBER() OVER (ORDER BY b.entry_date ASC, fs.fifo_id ASC) as fifo_order,
                    CASE 
                        WHEN fs.expiration_date IS NULL THEN NULL
                        ELSE DATEDIFF(fs.expiration_date, CURDATE())
                    END as days_until_expiry
                FROM tbl_fifo_stock fs
                JOIN tbl_batch b ON fs.batch_id = b.batch_id
                JOIN tbl_product p ON fs.product_id = p.product_id
                WHERE fs.product_id = ? AND fs.available_quantity > 0
                ORDER BY b.entry_date ASC, fs.fifo_id ASC
            ");
            
            $stmt->execute([$product_id]);
            $fifoData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $fifoData
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'consume_stock_fifo':
        try {
            $product_id = $data['product_id'] ?? 0;
            $quantity = $data['quantity'] ?? 0;
            $reference_no = $data['reference_no'] ?? '';
            $notes = $data['notes'] ?? '';
            $created_by = $data['created_by'] ?? 'admin';
            
            if ($product_id <= 0 || $quantity <= 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid product ID or quantity"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get FIFO stock data for the product
            $fifoStmt = $conn->prepare("
                SELECT 
                    fs.batch_id,
                    fs.batch_reference,
                    fs.available_quantity,
                    fs.unit_cost
                FROM tbl_fifo_stock fs
                JOIN tbl_batch b ON fs.batch_id = b.batch_id
                WHERE fs.product_id = ? AND fs.available_quantity > 0
                ORDER BY b.entry_date ASC, fs.fifo_id ASC
            ");
            $fifoStmt->execute([$product_id]);
            $fifoStock = $fifoStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($fifoStock)) {
                throw new Exception("No FIFO stock available for this product");
            }
            
            $remaining_quantity = $quantity;
            $consumed_batches = [];
            
            // Consume stock from FIFO order
            foreach ($fifoStock as $batch) {
                if ($remaining_quantity <= 0) break;
                
                $batch_quantity = min($remaining_quantity, $batch['available_quantity']);
                
                // Update FIFO stock
                $updateStmt = $conn->prepare("
                    UPDATE tbl_fifo_stock 
                    SET available_quantity = available_quantity - ?
                    WHERE batch_id = ? AND product_id = ?
                ");
                $updateStmt->execute([$batch_quantity, $batch['batch_id'], $product_id]);
                
                // Update main product quantity
                $productStmt = $conn->prepare("
                    UPDATE tbl_product 
                    SET quantity = quantity - ?,
                        stock_status = CASE 
                            WHEN quantity - ? <= 0 THEN 'out of stock'
                            WHEN quantity - ? <= 10 THEN 'low stock'
                            ELSE 'in stock'
                        END
                    WHERE product_id = ?
                ");
                $productStmt->execute([$batch_quantity, $batch_quantity, $batch_quantity, $product_id]);
                
                $consumed_batches[] = [
                    'batch_reference' => $batch['batch_reference'],
                    'quantity' => $batch_quantity,
                    'unit_cost' => $batch['unit_cost']
                ];
                
                $remaining_quantity -= $batch_quantity;
            }
            
            if ($remaining_quantity > 0) {
                throw new Exception("Insufficient stock available. Only " . ($quantity - $remaining_quantity) . " units consumed.");
            }
            
            // Log the consumption
            $logStmt = $conn->prepare("
                INSERT INTO tbl_stock_consumption (
                    product_id, quantity, reference_no, notes, created_by, consumed_date
                ) VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $logStmt->execute([$product_id, $quantity, $reference_no, $notes, $created_by]);
            
            $conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Stock consumed successfully using FIFO method",
                "consumed_batches" => $consumed_batches
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'transfer_fifo_consumption':
        try {
            $product_id = $data['product_id'] ?? 0;
            $quantity = $data['quantity'] ?? 0;
            $transfer_id = $data['transfer_id'] ?? '';
            $source_location_id = $data['source_location_id'] ?? 0;
            
            if ($product_id <= 0 || $quantity <= 0 || $source_location_id <= 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid product ID, quantity, or source location"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get FIFO stock data for the product in source location
            $fifoStmt = $conn->prepare("
                SELECT 
                    fs.fifo_id,
                    fs.batch_id,
                    fs.batch_reference,
                    fs.available_quantity,
                    fs.unit_cost
                FROM tbl_fifo_stock fs
                JOIN tbl_batch b ON fs.batch_id = b.batch_id
                WHERE fs.product_id = ? AND fs.available_quantity > 0
                ORDER BY b.entry_date ASC, fs.fifo_id ASC
            ");
            $fifoStmt->execute([$product_id]);
            $fifoStock = $fifoStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($fifoStock)) {
                throw new Exception("No FIFO stock available for product ID: $product_id in source location");
            }
            
            $remaining_quantity = $quantity;
            $consumed_batches = [];
            
            // Consume stock from FIFO order (oldest first)
            foreach ($fifoStock as $batch) {
                if ($remaining_quantity <= 0) break;
                
                $batch_quantity = min($remaining_quantity, $batch['available_quantity']);
                
                // Update FIFO stock
                $updateFifoStmt = $conn->prepare("
                    UPDATE tbl_fifo_stock 
                    SET available_quantity = available_quantity - ?
                    WHERE fifo_id = ?
                ");
                $updateFifoStmt->execute([$batch_quantity, $batch['fifo_id']]);
                
                // Check if this batch is now empty
                $checkBatchStmt = $conn->prepare("
                    SELECT available_quantity FROM tbl_fifo_stock WHERE fifo_id = ?
                ");
                $checkBatchStmt->execute([$batch['fifo_id']]);
                $currentBatchQty = $checkBatchStmt->fetch(PDO::FETCH_ASSOC);
                
                // If batch is empty, mark it as consumed (don't delete to maintain history)
                if ($currentBatchQty && $currentBatchQty['available_quantity'] <= 0) {
                    $markConsumedStmt = $conn->prepare("
                        UPDATE tbl_fifo_stock 
                        SET status = 'consumed', consumed_date = NOW()
                        WHERE fifo_id = ?
                    ");
                    $markConsumedStmt->execute([$batch['fifo_id']]);
                    error_log("Marked FIFO batch as consumed during transfer - FIFO ID: " . $batch['fifo_id'] . ", Batch: " . $batch['batch_reference']);
                }
                
                $consumed_batches[] = [
                    'batch_reference' => $batch['batch_reference'],
                    'quantity' => $batch_quantity,
                    'unit_cost' => $batch['unit_cost']
                ];
                
                $remaining_quantity -= $batch_quantity;
                error_log("Consumed from batch " . $batch['batch_reference'] . ": $batch_quantity units for transfer $transfer_id");
            }
            
            if ($remaining_quantity > 0) {
                throw new Exception("Insufficient stock available for transfer. Only " . ($quantity - $remaining_quantity) . " units available in FIFO stock.");
            }
            
            // Log the transfer consumption
            $logStmt = $conn->prepare("
                INSERT INTO tbl_stock_consumption (
                    product_id, quantity, reference_no, notes, created_by, consumed_date, consumption_type
                ) VALUES (?, ?, ?, ?, 'system', NOW(), 'transfer')
            ");
            $logStmt->execute([$product_id, $quantity, $transfer_id, "Transfer consumption from location $source_location_id"]);
            
            $conn->commit();
            echo json_encode([
                "success" => true,
                "message" => "Transfer FIFO consumption completed successfully",
                "consumed_batches" => $consumed_batches,
                "total_consumed" => $quantity
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_expiring_products':
        try {
            $days_threshold = $data['days_threshold'] ?? 30;
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    p.category,
                    p.quantity,
                    p.unit_price,
                    b.brand,
                    s.supplier_name,
                    p.expiration,
                    DATEDIFF(p.expiration, CURDATE()) as days_until_expiry
                FROM tbl_product p
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                WHERE p.expiration IS NOT NULL 
                AND p.expiration >= CURDATE()
                AND DATEDIFF(p.expiration, CURDATE()) <= ?
                AND (p.status IS NULL OR p.status <> 'archived')
                ORDER BY p.expiration ASC
            ");
            
            $stmt->execute([$days_threshold]);
            $expiringProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $expiringProducts
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    // Inventory Dashboard Actions
    case 'get_inventory_kpis':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            // Get main KPIs
            $stmt = $conn->prepare("
                SELECT 
                    SUM(p.quantity) as physicalAvailable,
                    SUM(CASE WHEN p.stock_status = 'low stock' THEN p.quantity ELSE 0 END) as softReserved,
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as onhandInventory,
                    COUNT(CASE WHEN p.quantity <= 10 THEN 1 END) as newOrderLineQty,
                    COUNT(CASE WHEN p.stock_status = 'out of stock' THEN 1 END) as returned,
                    ROUND(COUNT(CASE WHEN p.stock_status = 'out of stock' THEN 1 END) * 100.0 / COUNT(*), 2) as returnRate,
                    ROUND(COUNT(CASE WHEN p.stock_status = 'in stock' THEN 1 END) * 100.0 / COUNT(*), 2) as sellRate,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as outOfStock
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
            ");
            $stmt->execute($params);
            $kpis = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode($kpis);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_supply_by_product':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as onhand,
                    SUM(CASE WHEN p.stock_status = 'low stock' THEN p.quantity ELSE 0 END) as softReserved,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as returned
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY p.product_name
                ORDER BY onhand DESC
                LIMIT 11
            ");
            $stmt->execute($params);
            $supplyData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($supplyData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_supply_by_location':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    l.location_name as location,
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as onhand,
                    SUM(CASE WHEN p.stock_status = 'low stock' THEN p.quantity ELSE 0 END) as softReserved,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as returned
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY l.location_name
                ORDER BY onhand DESC
            ");
            $stmt->execute($params);
            $supplyData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($supplyData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_return_rate_by_product':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    ROUND(COUNT(CASE WHEN p.stock_status = 'out of stock' THEN 1 END) * 100.0 / COUNT(*), 1) as returnRate
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY p.product_name
                HAVING returnRate > 0
                ORDER BY returnRate DESC
                LIMIT 12
            ");
            $stmt->execute($params);
            $returnData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($returnData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'get_stockout_items':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    -p.quantity as stockout
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                AND p.stock_status = 'out of stock'
                ORDER BY stockout ASC
                LIMIT 15
            ");
            $stmt->execute($params);
            $stockoutData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($stockoutData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_product_kpis':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as physicalAvailable,
                    SUM(CASE WHEN p.stock_status = 'low stock' THEN p.quantity ELSE 0 END) as softReserved,
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as onhandInventory,
                    COUNT(CASE WHEN p.quantity <= 10 THEN 1 END) as newOrderLineQty,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as returned,
                    ROUND(COUNT(CASE WHEN p.stock_status = 'out of stock' THEN 1 END) * 100.0 / COUNT(*), 1) as returnRate,
                    ROUND(COUNT(CASE WHEN p.stock_status = 'in stock' THEN 1 END) * 100.0 / COUNT(*), 1) as sellRate,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as outOfStock
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY p.product_name
                ORDER BY physicalAvailable DESC
                LIMIT 10
            ");
            $stmt->execute($params);
            $productKPIs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($productKPIs);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    // Warehouse-specific API endpoints
    case 'get_warehouse_kpis':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            // Build WHERE conditions
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($location_filter && $location_filter !== 'Warehouse') {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            } else if ($location_filter === 'Warehouse') {
                // Only filter by warehouse if specifically requested
                $whereConditions[] = "p.location_id = 2";
            }
            // If no location filter or 'All' is selected, don't filter by location
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            // Get warehouse-specific KPIs using PDO
            $stmt = $conn->prepare("
                SELECT 
                    COUNT(DISTINCT p.product_id) as totalProducts,
                    COUNT(DISTINCT s.supplier_id) as totalSuppliers,
                    ROUND(COUNT(DISTINCT p.product_id) * 100.0 / 1000, 1) as storageCapacity,
                    SUM(p.quantity * p.unit_price) as warehouseValue,
                    SUM(p.quantity) as totalQuantity,
                    COUNT(CASE WHEN p.quantity <= 10 AND p.quantity > 0 THEN 1 END) as lowStockItems,
                    COUNT(CASE WHEN p.expiration IS NOT NULL AND p.expiration <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiringSoon,
                    COUNT(DISTINCT b.batch_id) as totalBatches,
                    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as activeTransfers
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_batch b ON p.batch_id = b.batch_id
                LEFT JOIN tbl_transfer_dtl td ON p.product_id = td.product_id
                LEFT JOIN tbl_transfer_header t ON td.transfer_header_id = t.transfer_header_id
                $whereClause
            ");
            $stmt->execute($params);
            $warehouseKPIs = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode($warehouseKPIs);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_warehouse_supply_by_product':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            // Build WHERE conditions
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($location_filter && $location_filter !== 'Warehouse') {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            } else {
                // Default to warehouse products only
                $whereConditions[] = "p.location_id = 2";
            }
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as onhand,
                    SUM(CASE WHEN p.stock_status = 'low stock' THEN p.quantity ELSE 0 END) as softReserved,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as returned
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY p.product_name
                ORDER BY onhand DESC
                LIMIT 10
            ");
            $stmt->execute($params);
            $supplyData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($supplyData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_warehouse_supply_by_location':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            // Always filter for warehouse products (location_id = 2) unless specific location is requested
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($location_filter && $location_filter !== 'Warehouse') {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            } else {
                // Default to warehouse products only
                $whereConditions[] = "p.location_id = 2";
            }
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    l.location_name as location,
                    SUM(CASE WHEN p.stock_status = 'in stock' THEN p.quantity ELSE 0 END) as onhand,
                    SUM(CASE WHEN p.stock_status = 'low stock' THEN p.quantity ELSE 0 END) as softReserved,
                    SUM(CASE WHEN p.stock_status = 'out of stock' THEN p.quantity ELSE 0 END) as returned
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY l.location_name
                ORDER BY onhand DESC
                LIMIT 8
            ");
            $stmt->execute($params);
            $supplyData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($supplyData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_warehouse_stockout_items':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            // Always filter for warehouse products (location_id = 2) unless specific location is requested
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($location_filter && $location_filter !== 'Warehouse') {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            } else {
                // Default to warehouse products only
                $whereConditions[] = "p.location_id = 2";
            }
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    -p.quantity as stockout
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                AND p.stock_status = 'out of stock'
                ORDER BY stockout ASC
                LIMIT 12
            ");
            $stmt->execute($params);
            $stockoutData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($stockoutData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'get_warehouse_product_kpis':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            // Always filter for warehouse products (location_id = 2) unless specific location is requested
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($location_filter && $location_filter !== 'Warehouse') {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            } else {
                // Default to warehouse products only
                $whereConditions[] = "p.location_id = 2";
            }
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    p.quantity,
                    p.unit_price,
                    s.supplier_name as supplier,
                    b.batch as batch,
                    p.status,
                    p.onhandInventory
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_batch b ON p.batch_id = b.batch_id
                $whereClause
                ORDER BY p.quantity DESC
                LIMIT 10
            ");
            $stmt->execute($params);
            $productKPIs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($productKPIs);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    // Chart-specific API endpoints
    case 'get_top_products_by_quantity':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    p.quantity
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                ORDER BY p.quantity DESC
                LIMIT 10
            ");
            $stmt->execute($params);
            $topProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($topProducts);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_stock_distribution_by_category':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.category,
                    SUM(p.quantity) as quantity
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY p.category
                ORDER BY quantity DESC
                LIMIT 8
            ");
            $stmt->execute($params);
            $categoryDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($categoryDistribution);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_fast_moving_items_trend':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            // Generate sample trend data for fast-moving items
            $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            $trendData = [];
            
            // Get top 3 products by quantity
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    p.quantity
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                ORDER BY p.quantity DESC
                LIMIT 3
            ");
            $stmt->execute($params);
            $topProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($topProducts as $product) {
                foreach ($months as $month) {
                    $trendData[] = [
                        'product' => $product['product'],
                        'month' => $month,
                        'quantity' => rand(50, 200) // Sample trend data
                    ];
                }
            }
            
            echo json_encode($trendData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_critical_stock_alerts':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name as product,
                    p.quantity
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                AND p.quantity <= 10
                ORDER BY p.quantity ASC
                LIMIT 10
            ");
            $stmt->execute($params);
            $criticalAlerts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($criticalAlerts);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_inventory_by_branch_category':
        try {
            $product_filter = isset($data['product']) && $data['product'] !== 'All' ? $data['product'] : null;
            $location_filter = isset($data['location']) && $data['location'] !== 'All' ? $data['location'] : null;
            
            $whereConditions = ["(p.status IS NULL OR p.status <> 'archived')"];
            $params = [];
            
            if ($product_filter) {
                $whereConditions[] = "p.category = ?";
                $params[] = $product_filter;
            }
            
            if ($location_filter) {
                $whereConditions[] = "l.location_name = ?";
                $params[] = $location_filter;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $stmt = $conn->prepare("
                SELECT 
                    l.location_name as location,
                    p.category,
                    SUM(p.quantity) as quantity
                FROM tbl_product p
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                GROUP BY l.location_name, p.category
                ORDER BY l.location_name, quantity DESC
                LIMIT 20
            ");
            $stmt->execute($params);
            $branchCategoryData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($branchCategoryData);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_products_by_location_name':
        try {
            $location_name = $data['location_name'] ?? '';
            
            if (empty($location_name)) {
                echo json_encode([
                    "success" => false,
                    "message" => "Location name is required"
                ]);
                break;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    p.*,
                    s.supplier_name,
                    b.brand,
                    l.location_name,
                    batch.batch as batch_reference,
                    batch.entry_date,
                    batch.entry_by,
                    COALESCE(p.date_added, CURDATE()) as date_added
                FROM tbl_product p 
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id 
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id 
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_batch batch ON p.batch_id = batch.batch_id
                WHERE (p.status IS NULL OR p.status <> 'archived')
                AND l.location_name = ?
                ORDER BY p.product_name ASC
            ");
            $stmt->execute([$location_name]);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $products
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;
    case 'get_location_products':
        try {
            $location_id = $data['location_id'] ?? 0;
            $search = $data['search'] ?? '';
            $category = $data['category'] ?? 'all';
            
            if (!$location_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Location ID is required"
                ]);
                break;
            }
            
            // Build the WHERE clause for regular products
            $where_conditions = ["p.location_id = ?"];
            $params = [$location_id];
            
            if ($search) {
                $where_conditions[] = "(p.product_name LIKE ? OR p.barcode LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            
            if ($category && $category !== 'all') {
                $where_conditions[] = "p.category = ?";
                $params[] = $category;
            }
            
            $where_clause = "WHERE " . implode(" AND ", $where_conditions);
            
            // Get regular products for specific location
            $stmt = $conn->prepare("
                SELECT 
                    p.*,
                    b.brand,
                    s.supplier_name,
                    l.location_name,
                    COALESCE(p.batch_id, 0) as batch_id,
                    COALESCE(batch.batch_reference, 'N/A') as batch_reference,
                    COALESCE(batch.entry_date, 'N/A') as batch_date_time,
                    CASE 
                        WHEN p.quantity <= 0 THEN 'out of stock'
                        WHEN p.quantity <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END as stock_status,
                    'Regular' as product_type
                FROM tbl_product p
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_batch batch ON p.batch_id = batch.batch_id
                $where_clause
                AND p.status = 'active'
                ORDER BY p.product_name ASC
            ");
            
            $stmt->execute($params);
            $regularProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get transferred products to this location
            $transferWhereConditions = ["th.destination_location_id = ?"];
            $transferParams = [$location_id];
            
            if ($search) {
                $transferWhereConditions[] = "(p.product_name LIKE ? OR p.barcode LIKE ?)";
                $transferParams[] = "%$search%";
                $transferParams[] = "%$search%";
            }
            
            if ($category && $category !== 'all') {
                $transferWhereConditions[] = "p.category = ?";
                $transferParams[] = $category;
            }
            
            // Filter by product type if specified
            if (isset($data['product_type']) && $data['product_type'] !== 'all') {
                if ($data['product_type'] === 'Transferred') {
                    // Only show transferred products
                    $regularProducts = [];
                } elseif ($data['product_type'] === 'Regular') {
                    // Only show regular products
                    $transferWhereConditions[] = "1 = 0"; // This will make no transferred products match
                }
            }
            
            $transferWhereClause = "WHERE " . implode(" AND ", $transferWhereConditions);
            
            $transferStmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.category,
                    p.barcode,
                    p.description,
                    p.prescription,
                    p.bulk,
                    p.expiration,
                    td.qty as quantity,
                    p.unit_price,
                    p.srp,
                    p.brand_id,
                    p.supplier_id,
                    p.location_id,
                    p.batch_id,
                    p.status,
                    p.stock_status,
                    p.date_added,
                    b.brand,
                    s.supplier_name,
                    l.location_name,
                    COALESCE(batch.batch_reference, 'N/A') as batch_reference,
                    COALESCE(batch.entry_date, 'N/A') as batch_date_time,
                    CASE 
                        WHEN td.qty <= 0 THEN 'out of stock'
                        WHEN td.qty <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END as stock_status,
                    'Transferred' as product_type,
                    th.transfer_header_id,
                    th.date as transfer_date,
                    sl.location_name as source_location,
                    CONCAT(e.Fname, ' ', e.Lname) as transferred_by
                FROM tbl_transfer_header th
                JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                JOIN tbl_product p ON td.product_id = p.product_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_batch batch ON p.batch_id = batch.batch_id
                LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                $transferWhereClause
                AND th.status = 'approved'
                ORDER BY p.product_name ASC
            ");
            
            $transferStmt->execute($transferParams);
            $transferredProducts = $transferStmt->fetchAll(PDO::FETCH_ASSOC);

            // Aggregate transferred quantities per product (summing multiple transfer rows)
            $aggregatedTransfers = [];
            foreach ($transferredProducts as $tp) {
                $key = $tp['product_name'] . '|' . $tp['category'] . '|' . $tp['barcode'];
                if (!isset($aggregatedTransfers[$key])) {
                    $aggregatedTransfers[$key] = $tp;
                } else {
                    $aggregatedTransfers[$key]['quantity'] += (int)$tp['quantity'];
                    $totalQty = (int)$aggregatedTransfers[$key]['quantity'];
                    $aggregatedTransfers[$key]['stock_status'] = $totalQty <= 0 ? 'out of stock' : ($totalQty <= 10 ? 'low stock' : 'in stock');
                }
            }

            // Combine both regular and aggregated transferred products
            $allProducts = array_merge($regularProducts, array_values($aggregatedTransfers));

            // Deduplicate by summing quantities if the same product exists in both Regular and Transferred
            $uniqueProducts = [];
            $seenIndexByKey = [];
            foreach ($allProducts as $product) {
                $key = $product['product_name'] . '|' . $product['category'] . '|' . $product['barcode'];
                if (!isset($seenIndexByKey[$key])) {
                    $seenIndexByKey[$key] = count($uniqueProducts);
                    $uniqueProducts[] = $product;
                } else {
                    $idx = $seenIndexByKey[$key];
                    $uniqueProducts[$idx]['quantity'] += (int)$product['quantity'];
                    $totalQty = (int)$uniqueProducts[$idx]['quantity'];
                    $uniqueProducts[$idx]['stock_status'] = $totalQty <= 0 ? 'out of stock' : ($totalQty <= 10 ? 'low stock' : 'in stock');
                    // Prefer labeling as Transferred if any side is transferred
                    if (($product['product_type'] ?? '') === 'Transferred') {
                        $uniqueProducts[$idx]['product_type'] = 'Transferred';
                    }
                }
            }
            
            echo json_encode([
                "success" => true,
                "data" => $uniqueProducts,
                "summary" => [
                    "total_products" => count($uniqueProducts),
                    "regular_products" => count($regularProducts),
                    "transferred_products" => count($transferredProducts)
                ]
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Error getting location products: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_archived_products':
        try {
            $stmt = $conn->prepare("SELECT * FROM tbl_product WHERE status = 'inactive'");
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode([
                "success" => true,
                "data" => $products
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'get_reports_data':
        try {
            // Get inventory analytics data
            $stmt = $conn->prepare("
                SELECT 
                    COUNT(DISTINCT p.product_id) as totalProducts,
                    COUNT(CASE WHEN p.quantity <= 10 AND p.quantity > 0 THEN 1 END) as lowStockItems,
                    COUNT(CASE WHEN p.quantity = 0 THEN 1 END) as outOfStockItems,
                    SUM(p.quantity * p.unit_price) as totalValue
                FROM tbl_product p
                WHERE (p.status IS NULL OR p.status <> 'archived')
            ");
            $stmt->execute();
            $analytics = $stmt->fetch(PDO::FETCH_ASSOC);

            // Get top categories distribution
            $stmt = $conn->prepare("
                SELECT 
                    p.category as category_name,
                    COUNT(p.product_id) as product_count,
                    ROUND(COUNT(p.product_id) * 100.0 / (SELECT COUNT(*) FROM tbl_product WHERE (status IS NULL OR status <> 'archived')), 1) as percentage
                FROM tbl_product p
                WHERE (p.status IS NULL OR p.status <> 'archived')
                GROUP BY p.category
                ORDER BY product_count DESC
                LIMIT 5
            ");
            $stmt->execute();
            $topCategories = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get recent stock movements for reports
            $stmt = $conn->prepare("
                SELECT 
                    sm.movement_id,
                    p.product_name as title,
                    CASE 
                        WHEN sm.movement_type = 'IN' THEN 'Stock In Report'
                        WHEN sm.movement_type = 'OUT' THEN 'Stock Out Report'
                        ELSE 'Stock Adjustment Report'
                    END as type,
                    sm.created_by as generatedBy,
                    DATE(sm.movement_date) as date,
                    TIME(sm.movement_date) as time,
                    'Completed' as status,
                    CONCAT(ROUND(RAND() * 5 + 0.5, 1), ' MB') as fileSize,
                    CASE WHEN RAND() > 0.5 THEN 'PDF' ELSE 'Excel' END as format,
                    CONCAT(
                        CASE 
                            WHEN sm.movement_type = 'IN' THEN 'Stock received'
                            WHEN sm.movement_type = 'OUT' THEN 'Stock consumed'
                            ELSE 'Stock adjusted'
                        END,
                        ' - ', p.product_name, ' (', sm.quantity, ' units)'
                    ) as description
                FROM tbl_stock_movements sm
                JOIN tbl_product p ON sm.product_id = p.product_id
                ORDER BY sm.movement_date DESC
                LIMIT 20
            ");
            $stmt->execute();
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get transfer reports
            $stmt = $conn->prepare("
                SELECT 
                    th.transfer_header_id as movement_id,
                    CONCAT('Transfer Report #', th.transfer_header_id) as title,
                    'Transfer Report' as type,
                    'System' as generatedBy,
                    th.date,
                    '12:00 PM' as time,
                    CASE 
                        WHEN th.status = 'approved' THEN 'Completed'
                        WHEN th.status = 'pending' THEN 'In Progress'
                        ELSE 'Failed'
                    END as status,
                    CONCAT(ROUND(RAND() * 3 + 0.5, 1), ' MB') as fileSize,
                    'PDF' as format,
                    CONCAT(
                        'Transfer from ', 
                        (SELECT location_name FROM tbl_location WHERE location_id = th.source_location_id),
                        ' to ',
                        (SELECT location_name FROM tbl_location WHERE location_id = th.destination_location_id),
                        ' - ', COUNT(td.product_id), ' products'
                    ) as description
                FROM tbl_transfer_header th
                LEFT JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                GROUP BY th.transfer_header_id
                ORDER BY th.date DESC
                LIMIT 10
            ");
            $stmt->execute();
            $transferReports = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Combine all reports
            $allReports = array_merge($reports, $transferReports);
            
            // Sort by date (newest first)
            usort($allReports, function($a, $b) {
                return strtotime($b['date']) - strtotime($a['date']);
            });

            echo json_encode([
                "success" => true,
                "analytics" => $analytics,
                "topCategories" => $topCategories,
                "reports" => $allReports
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_inventory_summary_report':
        try {
            $location_id = $data['location_id'] ?? null;
            
            $whereClause = "WHERE (p.status IS NULL OR p.status <> 'archived')";
            $params = [];
            
            if ($location_id) {
                $whereClause .= " AND p.location_id = ?";
                $params[] = $location_id;
            }

            $stmt = $conn->prepare("
                SELECT 
                    p.product_name,
                    p.barcode,
                    p.quantity,
                    p.unit_price,
                    p.stock_status,
                    p.category as category_name,
                    b.brand,
                    l.location_name,
                    s.supplier_name,
                    p.expiration,
                    (p.quantity * p.unit_price) as total_value
                FROM tbl_product p
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                $whereClause
                ORDER BY p.product_name
            ");
            $stmt->execute($params);
            $inventoryData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "data" => $inventoryData
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_low_stock_report':
        try {
            $threshold = $data['threshold'] ?? 10;
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name,
                    p.barcode,
                    p.quantity,
                    p.unit_price,
                    c.category_name,
                    b.brand,
                    l.location_name,
                    s.supplier_name,
                    s.supplier_contact,
                    s.supplier_email,
                    (p.quantity * p.unit_price) as total_value
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                WHERE (p.status IS NULL OR p.status <> 'archived')
                AND p.quantity <= ? AND p.quantity > 0
                ORDER BY p.quantity ASC
            ");
            $stmt->execute([$threshold]);
            $lowStockData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "data" => $lowStockData
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_expiry_report':
        try {
            $days_threshold = $data['days_threshold'] ?? 30;
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_name,
                    p.barcode,
                    p.quantity,
                    p.expiration,
                    DATEDIFF(p.expiration, CURDATE()) as days_until_expiry,
                    c.category_name,
                    b.brand,
                    l.location_name,
                    (p.quantity * p.unit_price) as total_value
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                WHERE (p.status IS NULL OR p.status <> 'archived')
                AND p.expiration IS NOT NULL
                AND p.expiration <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
                AND p.quantity > 0
                ORDER BY p.expiration ASC
            ");
            $stmt->execute([$days_threshold]);
            $expiryData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "data" => $expiryData
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'get_movement_history_report':
        try {
            $start_date = $data['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $end_date = $data['end_date'] ?? date('Y-m-d');
            $movement_type = $data['movement_type'] ?? null;
            
            $whereConditions = ["sm.movement_date BETWEEN ? AND ?"];
            $params = [$start_date . ' 00:00:00', $end_date . ' 23:59:59'];
            
            if ($movement_type) {
                $whereConditions[] = "sm.movement_type = ?";
                $params[] = $movement_type;
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);

            $stmt = $conn->prepare("
                SELECT 
                    sm.movement_id,
                    p.product_name,
                    p.barcode,
                    sm.movement_type,
                    sm.quantity,
                    sm.expiration_date,
                    sm.movement_date,
                    sm.reference_no,
                    sm.notes,
                    sm.created_by,
                    l.location_name,
                    (sm.quantity * sm.unit_cost) as total_cost
                FROM tbl_stock_movements sm
                JOIN tbl_product p ON sm.product_id = p.product_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                ORDER BY sm.movement_date DESC
            ");
            $stmt->execute($params);
            $movementData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "data" => $movementData
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'duplicate_product_batches':
        try {
            $product_id = isset($data['product_id']) ? intval($data['product_id']) : 0;
            $batch_ids = isset($data['batch_ids']) ? $data['batch_ids'] : [22, 23]; // Default to your batch IDs
            
            if ($product_id <= 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "Valid product ID is required"
                ]);
                break;
            }
            
            // Debug: Check what brands exist
            $debugBrandStmt = $conn->prepare("SELECT brand_id, brand FROM tbl_brand ORDER BY brand_id");
            $debugBrandStmt->execute();
            $existingBrands = $debugBrandStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Debug: Check what suppliers exist  
            $debugSupplierStmt = $conn->prepare("SELECT supplier_id, supplier_name FROM tbl_supplier ORDER BY supplier_id");
            $debugSupplierStmt->execute();
            $existingSuppliers = $debugSupplierStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get the original product details
            $productStmt = $conn->prepare("
                SELECT product_name, category, barcode, description, prescription, bulk,
                       unit_price, srp, brand_id, supplier_id, status, stock_status
                FROM tbl_product 
                WHERE product_id = ?
                LIMIT 1
            ");
            $productStmt->execute([$product_id]);
            $productDetails = $productStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$productDetails) {
                $conn->rollback();
                echo json_encode([
                    "success" => false,
                    "message" => "Product not found"
                ]);
                break;
            }
            
            // Handle brand_id - allow NULL if no brands exist
            $brand_id = null;
            if (count($existingBrands) > 0) {
                $brand_id = $existingBrands[0]['brand_id'];
            }
            
            // Handle supplier_id - allow NULL if no suppliers exist
            $supplier_id = null;
            if (count($existingSuppliers) > 0) {
                $supplier_id = $existingSuppliers[0]['supplier_id'];
            }
            
            $duplicated_count = 0;
            
            // Create duplicate products for each batch
            foreach ($batch_ids as $batch_id) {
                // Check if product already exists with this batch_id
                $checkStmt = $conn->prepare("
                    SELECT product_id FROM tbl_product 
                    WHERE batch_id = ? AND barcode = ?
                ");
                $checkStmt->execute([$batch_id, $productDetails['barcode']]);
                
                if ($checkStmt->fetch()) {
                    continue; // Skip if already exists
                }
                
                // Get batch details
                $batchStmt = $conn->prepare("
                    SELECT batch, supplier_id, location_id, entry_date 
                    FROM tbl_batch 
                    WHERE batch_id = ?
                ");
                $batchStmt->execute([$batch_id]);
                $batchDetails = $batchStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$batchDetails) {
                    continue; // Skip if batch not found
                }
                
                // Get quantity from FIFO stock if available
                $fifoStmt = $conn->prepare("
                    SELECT quantity, available_quantity, unit_cost, srp, expiration_date
                    FROM tbl_fifo_stock 
                    WHERE product_id = ? AND batch_id = ?
                ");
                $fifoStmt->execute([$product_id, $batch_id]);
                $fifoStock = $fifoStmt->fetch(PDO::FETCH_ASSOC);
                
                // Use FIFO data if available, otherwise use defaults
                $quantity = $fifoStock ? $fifoStock['available_quantity'] : 100; // Default quantity
                $unit_cost = $fifoStock ? $fifoStock['unit_cost'] : $productDetails['unit_price'];
                $srp = $fifoStock ? $fifoStock['srp'] : $productDetails['srp'];
                $expiration = $fifoStock ? $fifoStock['expiration_date'] : $batchDetails['entry_date'];
                
                // Insert new product entry
                $insertStmt = $conn->prepare("
                    INSERT INTO tbl_product (
                        product_name, category, barcode, description, prescription, bulk,
                        expiration, quantity, unit_price, srp, brand_id, supplier_id,
                        location_id, batch_id, status, stock_status, date_added
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $stock_status = $quantity <= 0 ? 'out of stock' : ($quantity <= 10 ? 'low stock' : 'in stock');
                
                $insertStmt->execute([
                    $productDetails['product_name'],
                    $productDetails['category'],
                    $productDetails['barcode'],
                    $productDetails['description'],
                    $productDetails['prescription'],
                    $productDetails['bulk'],
                    $expiration,
                    $quantity,
                    $unit_cost,
                    $srp,
                    $brand_id, // Use validated brand_id
                    $batchDetails['supplier_id'] ?: $supplier_id, // Use validated supplier_id
                    $batchDetails['location_id'],
                    $batch_id,
                    'active',
                    $stock_status,
                    $batchDetails['entry_date']
                ]);
                
                $duplicated_count++;
            }
            
            $conn->commit();
            
            echo json_encode([
                "success" => true,
                "message" => "Successfully duplicated product for {$duplicated_count} batch(es)",
                "duplicated_count" => $duplicated_count,
                "debug" => [
                    "existing_brands" => $existingBrands,
                    "existing_suppliers" => $existingSuppliers,
                    "used_brand_id" => $brand_id,
                    "used_supplier_id" => $supplier_id,
                    "original_product" => $productDetails
                ]
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "debug" => [
                    "existing_brands" => isset($existingBrands) ? $existingBrands : "not_set",
                    "existing_suppliers" => isset($existingSuppliers) ? $existingSuppliers : "not_set",
                    "used_brand_id" => isset($brand_id) ? $brand_id : "not_set",
                    "used_supplier_id" => isset($supplier_id) ? $supplier_id : "not_set",
                    "original_product" => isset($productDetails) ? $productDetails : "not_set"
                ]
            ]);
        }
        break;

    case 'reset_password':
        try {
            $emp_id = isset($data['emp_id']) ? (int)$data['emp_id'] : 0;
            $new_password = isset($data['new_password']) ? trim($data['new_password']) : '';

            // Validation
            if (empty($emp_id) || $emp_id <= 0) {
                echo json_encode(["success" => false, "message" => "Invalid employee ID."]);
                exit;
            }

            if (empty($new_password) || strlen($new_password) < 3) {
                echo json_encode(["success" => false, "message" => "Password must be at least 3 characters long."]);
                exit;
            }

            // Check if employee exists
            $checkStmt = $conn->prepare("SELECT emp_id FROM tbl_employee WHERE emp_id = :emp_id");
            $checkStmt->bindParam(":emp_id", $emp_id, PDO::PARAM_INT);
            $checkStmt->execute();

            if ($checkStmt->rowCount() === 0) {
                echo json_encode(["success" => false, "message" => "Employee not found."]);
                exit;
            }

            // Hash the new password
            $hashedPassword = password_hash($new_password, PASSWORD_BCRYPT);

            // Update the password
            $updateStmt = $conn->prepare("UPDATE tbl_employee SET password = :password WHERE emp_id = :emp_id");
            $updateStmt->bindParam(":password", $hashedPassword, PDO::PARAM_STR);
            $updateStmt->bindParam(":emp_id", $emp_id, PDO::PARAM_INT);

            if ($updateStmt->execute()) {
                echo json_encode([
                    "success" => true, 
                    "message" => "Password reset successfully.",
                    "emp_id" => $emp_id
                ]);
            } else {
                echo json_encode(["success" => false, "message" => "Failed to update password."]);
            }

        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
        }
        break;

    case 'deleteSupplier':
        // Log raw input
        $rawInput = file_get_contents('php://input');
        error_log("Raw Input: " . $rawInput);
    
        // Decode JSON
        $input = json_decode($rawInput, true);
    
        // Log decoded input
        error_log("Decoded Input: " . print_r($input, true));
    
        if (json_last_error() !== JSON_ERROR_NONE) {
            echo json_encode([
                "success" => false,
                "message" => "Invalid JSON received",
                "error" => json_last_error_msg()
            ]);
            exit;
        }
    
        if (!isset($input['action'])) {
            echo json_encode(["success" => false, "message" => "Missing action"]);
            exit;
        }
    
        if (!isset($input['supplier_id'])) {
            echo json_encode(["success" => false, "message" => "Missing supplier_id"]);
            exit;
        }
    
        $supplier_id = intval($input['supplier_id']);
        if ($supplier_id <= 0) {
            echo json_encode(["success" => false, "message" => "Invalid supplier ID"]);
            exit;
        }
    
        $stmt = $conn->prepare("UPDATE tbl_supplier SET deleted_at = NOW() WHERE supplier_id = ?");
        
        try {
            if ($stmt->execute([$supplier_id])) {
                echo json_encode(["success" => true, "message" => "Supplier archived"]);
            } else {
                echo json_encode([
                    "success" => false,
                    "message" => "Failed to archive supplier"
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "An error occurred: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_discounts':
        try {
            $stmt = $conn->prepare("SELECT discount_id, discount_rate, discount_type FROM tbl_discount ORDER BY discount_id ASC");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // Normalize numeric rate
            foreach ($rows as &$r) {
                $r['discount_rate'] = (float)$r['discount_rate'];
            }
            echo json_encode([ 'success' => true, 'data' => $rows ]);
        } catch (Exception $e) {
            echo json_encode([ 'success' => false, 'message' => 'Database error: ' . $e->getMessage(), 'data' => [] ]);
        }
        break;
    case 'save_pos_sale':
            try {
                // Expected payload: transactionId (client ref), totalAmount, referenceNumber, terminalName, paymentMethod, location_name, items:[{product_id, quantity, price}]
                $clientTxnId = $data['transactionId'] ?? '';
                $totalAmount = isset($data['totalAmount']) ? (float)$data['totalAmount'] : 0.0;
                $referenceNumber = $data['referenceNumber'] ?? '';
                $terminalName = trim($data['terminalName'] ?? 'Convenience POS');
                $paymentMethodRaw = (string)($data['paymentMethod'] ?? 'cash');
                $locationName = $data['location_name'] ?? 'Unknown Location';
                $items = $data['items'] ?? [];

                if ($totalAmount <= 0 || !is_array($items) || count($items) === 0) {
                    echo json_encode([ 'success' => false, 'message' => 'Invalid sale payload' ]);
                    break;
                }

                $conn->beginTransaction();

                // Ensure terminal exists or create it
                $stmt = $conn->prepare("SELECT terminal_id FROM tbl_pos_terminal WHERE terminal_name = :name LIMIT 1");
                $stmt->execute([ ':name' => $terminalName ]);
                $terminalId = $stmt->fetchColumn();
                if (!$terminalId) {
                    // Default shift_id to 1 if unknown
                    $ins = $conn->prepare("INSERT INTO tbl_pos_terminal (terminal_name, shift_id) VALUES (:name, 1)");
                    $ins->execute([ ':name' => $terminalName ]);
                    $terminalId = (int)$conn->lastInsertId();
                }

                // Determine employee: prefer explicit payload, then session
                $empId = isset($data['emp_id']) ? (int)$data['emp_id'] : 0;
                if ($empId <= 0) {
                    if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
                    if (!empty($_SESSION['user_id'])) { $empId = (int)$_SESSION['user_id']; }
                }
                if ($empId <= 0) { $empId = 1; }

                // Normalize payment method to enum values ('cash','card','Gcash')
                $pt = strtolower(trim($paymentMethodRaw));
                if ($pt === 'gcash' || $pt === 'g-cash' || $pt === 'g cash') { $paymentEnum = 'Gcash'; }
                elseif ($pt === 'card') { $paymentEnum = 'card'; }
                else { $paymentEnum = 'cash'; }

                // Create transaction row using AUTO_INCREMENT id
                $txnStmt = $conn->prepare("INSERT INTO tbl_pos_transaction (date, time, emp_id, payment_type) VALUES (CURDATE(), CURTIME(), :emp, :ptype)");
                $txnStmt->execute([
                    ':emp' => $empId,
                    ':ptype' => $paymentEnum
                ]);
                $transactionId = (int)$conn->lastInsertId();

                // Ensure reference number is never NULL (use client txn id as fallback for cash)
                $headerRef = ($referenceNumber !== null && $referenceNumber !== '') ? $referenceNumber : (string)$clientTxnId;

                // Insert sales header
                $hdr = $conn->prepare("INSERT INTO tbl_pos_sales_header (transaction_id, total_amount, reference_number, terminal_id) VALUES (:txn, :total, :ref, :terminal)");
                $hdr->execute([
                    ':txn' => $transactionId,
                    ':total' => $totalAmount,
                    ':ref' => $headerRef,
                    ':terminal' => $terminalId,
                ]);
                $salesHeaderId = (int)$conn->lastInsertId();

                // Insert details
                $dtl = $conn->prepare("INSERT INTO tbl_pos_sales_details (sales_header_id, product_id, quantity, price) VALUES (:hdr, :pid, :qty, :price)");
                foreach ($items as $it) {
                    $pid = isset($it['product_id']) ? (int)$it['product_id'] : (isset($it['id']) ? (int)$it['id'] : 0);
                    $qty = (int)($it['quantity'] ?? 0);
                    $price = (float)($it['price'] ?? 0);
                    if ($pid > 0 && $qty > 0) {
                        $dtl->execute([
                            ':hdr' => $salesHeaderId,
                            ':pid' => $pid,
                            ':qty' => $qty,
                            ':price' => $price,
                        ]);
                    }
                }

                // Log
                error_log("POS Sale saved: TXN {$transactionId} (client={$clientTxnId}), Amount: {$totalAmount}, Location: {$locationName}, Payment: {$paymentEnum}, Items: " . count($items));

                $conn->commit();
                echo json_encode([
                    'success' => true,
                    'message' => 'Sale saved successfully',
                    'data' => [
                        'sales_header_id' => $salesHeaderId,
                        'terminal_id' => $terminalId,
                        'transaction_id' => $transactionId,
                        'client_transaction_id' => $clientTxnId,
                        'location' => $locationName,
                        'payment_method' => $paymentEnum,
                        'total_amount' => $totalAmount,
                        'items_count' => count($items)
                    ]
                ]);
            } catch (Exception $e) {
                if ($conn->inTransaction()) { $conn->rollBack(); }
                error_log("POS Sale save error: " . $e->getMessage());
                echo json_encode([ 'success' => false, 'message' => 'Database error: ' . $e->getMessage() ]);
            }
            break;

    case 'save_pos_transaction':
        try {
            $transactionId = $data['transactionId'] ?? null;
            $paymentTypeRaw = trim((string)($data['paymentType'] ?? ''));
            $paymentType = '';
            $pt = strtolower($paymentTypeRaw);
            if ($pt === 'cash') $paymentType = 'Cash';
            elseif ($pt === 'gcash' || $pt === 'g-cash' || $pt === 'g cash') $paymentType = 'GCash';
            else $paymentType = $paymentTypeRaw;

            // Prefer session user_id; fall back to provided empId
            if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
            $empId = $_SESSION['user_id'] ?? ($data['empId'] ?? null);
            $customerId = $data['customerId'] ?? null;

            if (!$transactionId || !$paymentType) {
                echo json_encode([ 'success' => false, 'message' => 'Invalid transaction payload' ]);
                break;
            }

            $stmt = $conn->prepare("INSERT INTO tbl_pos_transaction (transaction_id, date, time, emp_id, customer_id, payment_type) VALUES (:txn, CURDATE(), CURTIME(), :emp, :cust, :ptype)");
            $stmt->execute([
                ':txn' => $transactionId,
                ':emp' => $empId,
                ':cust' => $customerId,
                ':ptype' => $paymentType,
            ]);

            echo json_encode([ 'success' => true ]);
        } catch (Exception $e) {
            echo json_encode([ 'success' => false, 'message' => 'Database error: ' . $e->getMessage() ]);
        }
        break;

    case 'get_pos_sales':
        try {
            $limit = isset($data['limit']) ? (int)$data['limit'] : 50;
            $location = $data['location'] ?? null;
            $date = $data['date'] ?? null;
            
            $whereClause = "WHERE 1=1";
            $params = [];
            
            if ($location) {
                $whereClause .= " AND th.transaction_id IN (SELECT transaction_id FROM tbl_pos_transaction WHERE payment_type LIKE :location)";
                $params[':location'] = "%{$location}%";
            }
            
            if ($date) {
                $whereClause .= " AND DATE(t.date) = :date";
                $params[':date'] = $date;
            }
            
            $sql = "
                SELECT 
                    t.transaction_id,
                    t.date,
                    t.time,
                    t.payment_type,
                    t.emp_id,
                    e.username AS cashier,
                    e.shift_id,
                    s.shifts AS shift_name,
                    th.total_amount,
                    th.reference_number,
                    term.terminal_name,
                    COUNT(td.product_id) as items_count,
                    GROUP_CONCAT(CONCAT(p.product_name, ' x', td.quantity, ' @₱', td.price) SEPARATOR ', ') as items_summary
                FROM tbl_pos_transaction t
                JOIN tbl_pos_sales_header th ON t.transaction_id = th.transaction_id
                JOIN tbl_pos_terminal term ON th.terminal_id = term.terminal_id
                LEFT JOIN tbl_employee e ON t.emp_id = e.emp_id
                LEFT JOIN tbl_shift s ON e.shift_id = s.shift_id
                LEFT JOIN tbl_pos_sales_details td ON th.sales_header_id = td.sales_header_id
                LEFT JOIN tbl_product p ON td.product_id = p.product_id
                {$whereClause}
                GROUP BY t.transaction_id, t.date, t.time, t.payment_type, t.emp_id, e.username, e.shift_id, s.shifts, th.total_amount, th.reference_number, term.terminal_name
                ORDER BY t.date DESC, t.time DESC
                LIMIT :limit
            ";
            
            $stmt = $conn->prepare($sql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode([ 'success' => true, 'data' => $rows ]);
            
        } catch (Exception $e) {
            echo json_encode([ 'success' => false, 'message' => 'Database error: ' . $e->getMessage() ]);
        }
        break;
    
    case 'restoreSupplier':
            $data = json_decode(file_get_contents('php://input'), true);
        
            if (json_last_error() !== JSON_ERROR_NONE) {
                echo json_encode([
                    "success" => false,
                    "message" => "Invalid JSON input"
                ]);
                exit;
            }
        
            $supplier_id = intval($data['supplier_id'] ?? 0);
            if ($supplier_id <= 0) {
                echo json_encode([
                    "success" => false,
                    "message" => "Missing or invalid supplier ID"
                ]);
                exit;
            }
        
            try {
                $stmt = $conn->prepare("UPDATE tbl_supplier SET deleted_at = NULL WHERE supplier_id = ?");
                if ($stmt->execute([$supplier_id])) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Supplier restored"
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error restoring supplier"
                    ]);
                }
            } catch (Exception $e) {
                echo json_encode([
                    "success" => false,
                    "message" => "Error restoring supplier",
                    "error" => $e->getMessage()
                ]);
            }
            break;
        
    case 'displayArchivedSuppliers':
        try {
            $stmt = $conn->query("SELECT * FROM tbl_supplier WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC");
            $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "suppliers" => $suppliers]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Error fetching archived suppliers: " . $e->getMessage()]);
        }
        break;

    case 'get_archived_items':
        try {
            $stmt = $conn->prepare("
                SELECT 
                    archive_id as id,
                    item_name as name,
                    item_description as description,
                    item_type as type,
                    category,
                    archived_by as archivedBy,
                    DATE(archived_date) as archivedDate,
                    TIME(archived_time) as archivedTime,
                    reason,
                    status,
                    original_data
                FROM tbl_archive 
                ORDER BY archived_date DESC, archived_time DESC
            ");
            $stmt->execute();
            $archivedItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode([
                "success" => true,
                "data" => $archivedItems
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    case 'restore_archived_item':
            try {
                $archive_id = $data['id'] ?? 0;
                
                if (!$archive_id) {
                    echo json_encode(["success" => false, "message" => "Archive ID is required"]);
                    break;
                }

                // Get archived item details
                $stmt = $conn->prepare("SELECT * FROM tbl_archive WHERE archive_id = ?");
                $stmt->execute([$archive_id]);
                $archivedItem = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$archivedItem) {
                    echo json_encode(["success" => false, "message" => "Archived item not found"]);
                    break;
                }

                $conn->beginTransaction();

                try {
                    // Restore based on item type
                    switch ($archivedItem['item_type']) {
                        case 'Product':
                            // Restore product
                            $stmt = $conn->prepare("UPDATE tbl_product SET status = 'active' WHERE product_id = ?");
                            $stmt->execute([$archivedItem['item_id']]);
                            break;
                        case 'Supplier':
                            // Restore supplier
                            $stmt = $conn->prepare("UPDATE tbl_supplier SET status = 'active' WHERE supplier_id = ?");
                            $stmt->execute([$archivedItem['item_id']]);
                            break;
                        case 'Category':
                            // Restore category
                            $stmt = $conn->prepare("UPDATE tbl_category SET status = 'active' WHERE category_id = ?");
                            $stmt->execute([$archivedItem['item_id']]);
                            break;
                    }

                    // Update archive status
                    $stmt = $conn->prepare("UPDATE tbl_archive SET status = 'Restored' WHERE archive_id = ?");
                    $stmt->execute([$archive_id]);

                    $conn->commit();
                    echo json_encode(["success" => true, "message" => "Item restored successfully"]);
                } catch (Exception $e) {
                    $conn->rollback();
                    throw $e;
                }
            } catch (Exception $e) {
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
            break;

    case 'delete_archived_item':
        try {
            $archive_id = $data['id'] ?? 0;
            
            if (!$archive_id) {
                echo json_encode(["success" => false, "message" => "Archive ID is required"]);
                break;
            }

            // Update archive status to deleted
            $stmt = $conn->prepare("UPDATE tbl_archive SET status = 'Deleted' WHERE archive_id = ?");
            $stmt->execute([$archive_id]);
            
            echo json_encode(["success" => true, "message" => "Item permanently deleted"]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;
    case 'get_transfer_log':
            try {
                $stmt = $conn->prepare("
                    SELECT 
                        tl.transfer_id,
                        tl.product_id,
                        p.product_name,
                        tl.from_location,
                        tl.to_location,
                        tl.quantity,
                        tl.transfer_date,
                        tl.created_at
                    FROM tbl_transfer_log tl
                    LEFT JOIN tbl_product p ON tl.product_id = p.product_id
                    ORDER BY tl.created_at DESC
                ");
                $stmt->execute();
                $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Add batch details for each transfer log
                foreach ($logs as &$log) {
                    // First try direct match on transfer_id
                    $batchDetailsStmt = $conn->prepare("
                        SELECT 
                            tbd.batch_id,
                            tbd.batch_reference,
                            tbd.quantity as batch_quantity,
                            COALESCE(tbd.srp, fs.srp) as batch_srp,
                            tbd.expiration_date
                        FROM tbl_transfer_batch_details tbd
                        LEFT JOIN tbl_fifo_stock fs ON fs.batch_id = tbd.batch_id
                        WHERE tbd.transfer_id = ?
                        ORDER BY tbd.id ASC
                    ");
                    $batchDetailsStmt->execute([$log['transfer_id']]);
                    $details = $batchDetailsStmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    if (!$details || count($details) === 0) {
                        // Fallback: map log → header using date/from/to/product/qty
                        $mapStmt = $conn->prepare("
                            SELECT th.transfer_header_id
                            FROM tbl_transfer_header th
                            JOIN tbl_location sl ON th.source_location_id = sl.location_id
                            JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                            JOIN tbl_transfer_dtl td ON td.transfer_header_id = th.transfer_header_id
                            WHERE th.date = ?
                              AND sl.location_name = ?
                              AND dl.location_name = ?
                              AND td.product_id = ?
                              AND td.qty = ?
                            ORDER BY th.transfer_header_id DESC
                            LIMIT 1
                        ");
                        $mapStmt->execute([
                            $log['transfer_date'],
                            $log['from_location'],
                            $log['to_location'],
                            $log['product_id'],
                            $log['quantity']
                        ]);
                        $header = $mapStmt->fetch(PDO::FETCH_ASSOC);
                        if ($header && isset($header['transfer_header_id'])) {
                            $batchDetailsStmt = $conn->prepare("
                                SELECT 
                                    tbd.batch_id,
                                    tbd.batch_reference,
                                    tbd.quantity as batch_quantity,
                                    COALESCE(tbd.srp, fs.srp) as batch_srp,
                                    tbd.expiration_date
                                FROM tbl_transfer_batch_details tbd
                                LEFT JOIN tbl_fifo_stock fs ON fs.batch_id = tbd.batch_id
                                WHERE tbd.transfer_id = ?
                                ORDER BY tbd.id ASC
                            ");
                            $batchDetailsStmt->execute([$header['transfer_header_id']]);
                            $details = $batchDetailsStmt->fetchAll(PDO::FETCH_ASSOC);
                        }
                    }
                    $log['batch_details'] = $details ?: [];
                }
                
                echo json_encode([
                    "success" => true,
                    "data" => $logs
                ]);
                
            } catch (Exception $e) {
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage(),
                    "data" => []
                ]);
            }
            break;

    case 'get_transfer_log_by_id':
        try {
            $transfer_id = isset($data['transfer_id']) ? (int)$data['transfer_id'] : 0;
            if ($transfer_id <= 0) {
                echo json_encode(["success" => false, "message" => "transfer_id is required"]);
                break;
            }
            $stmt = $conn->prepare("
                SELECT 
                    tl.transfer_id,
                    tl.product_id,
                    p.product_name,
                    tl.from_location,
                    tl.to_location,
                    tl.quantity,
                    tl.transfer_date,
                    tl.created_at
                FROM tbl_transfer_log tl
                LEFT JOIN tbl_product p ON tl.product_id = p.product_id
                WHERE tl.transfer_id = ?
                LIMIT 1
            ");
            $stmt->execute([$transfer_id]);
            $log = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$log) {
                echo json_encode(["success" => false, "message" => "Transfer log not found"]);
                break;
            }
            $batchDetailsStmt = $conn->prepare("
                SELECT 
                    tbd.batch_id,
                    tbd.batch_reference,
                    tbd.quantity as batch_quantity,
                    COALESCE(tbd.srp, fs.srp) as batch_srp,
                    tbd.expiration_date
                FROM tbl_transfer_batch_details tbd
                LEFT JOIN tbl_fifo_stock fs ON fs.batch_id = tbd.batch_id
                WHERE tbd.transfer_id = ?
                ORDER BY tbd.id ASC
            ");
            $batchDetailsStmt->execute([$transfer_id]);
            $details = $batchDetailsStmt->fetchAll(PDO::FETCH_ASSOC);
            if (!$details || count($details) === 0) {
                // Fallback mapping same as above
                $mapStmt = $conn->prepare("
                    SELECT th.transfer_header_id
                    FROM tbl_transfer_header th
                    JOIN tbl_location sl ON th.source_location_id = sl.location_id
                    JOIN tbl_location dl ON th.destination_location_id = dl.location_id
                    JOIN tbl_transfer_dtl td ON td.transfer_header_id = th.transfer_header_id
                    WHERE th.date = ?
                      AND sl.location_name = ?
                      AND dl.location_name = ?
                      AND td.product_id = ?
                      AND td.qty = ?
                    ORDER BY th.transfer_header_id DESC
                    LIMIT 1
                ");
                $mapStmt->execute([
                    $log['transfer_date'],
                    $log['from_location'],
                    $log['to_location'],
                    $log['product_id'],
                    $log['quantity']
                ]);
                $header = $mapStmt->fetch(PDO::FETCH_ASSOC);
                if ($header && isset($header['transfer_header_id'])) {
                    $batchDetailsStmt = $conn->prepare("
                        SELECT 
                            tbd.batch_id,
                            tbd.batch_reference,
                            tbd.quantity as batch_quantity,
                            COALESCE(tbd.srp, fs.srp) as batch_srp,
                            tbd.expiration_date
                        FROM tbl_transfer_batch_details tbd
                        LEFT JOIN tbl_fifo_stock fs ON fs.batch_id = tbd.batch_id
                        WHERE tbd.transfer_id = ?
                        ORDER BY tbd.id ASC
                    ");
                    $batchDetailsStmt->execute([$header['transfer_header_id']]);
                    $details = $batchDetailsStmt->fetchAll(PDO::FETCH_ASSOC);
                }
            }
            $log['batch_details'] = $details ?: [];
            echo json_encode(["success" => true, "data" => $log]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;

    case 'get_current_user':
        try {
            session_start();
            
            if (isset($_SESSION['user_id']) && isset($_SESSION['full_name'])) {
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "user_id" => $_SESSION['user_id'],
                        "username" => $_SESSION['username'] ?? '',
                        "full_name" => $_SESSION['full_name'],
                        "role" => $_SESSION['role'] ?? ''
                    ]
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "message" => "No active session found"
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Session error: " . $e->getMessage()
            ]);
        }
        break;
    // Stock Adjustment API Functions
    case 'get_stock_adjustments':
            try {
                $search = $data['search'] ?? '';
                $type = $data['type'] ?? 'all';
                $status = $data['status'] ?? 'all';
                $page = $data['page'] ?? 1;
                $limit = $data['limit'] ?? 10;
                $offset = ($page - 1) * $limit;
                
                $whereConditions = [];
                $params = [];
                
                if ($search) {
                    $whereConditions[] = "(p.product_name LIKE ? OR p.barcode LIKE ? OR sm.notes LIKE ?)";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                }
                
                if ($type !== 'all') {
                    $whereConditions[] = "sm.movement_type = ?";
                    $params[] = $type;
                }
                
                if ($status !== 'all') {
                    $whereConditions[] = "sm.status = ?";
                    $params[] = $status;
                }
                
                $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
                
                // Get total count
                $countStmt = $conn->prepare("
                    SELECT COUNT(*) as total
                    FROM tbl_stock_movements sm
                    LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                    LEFT JOIN tbl_employee e ON sm.created_by = e.emp_id
                    $whereClause
                ");
                $countStmt->execute($params);
                $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
                
                // Get adjustments with pagination
                $stmt = $conn->prepare("
                    SELECT 
                        sm.movement_id as id,
                        p.product_name,
                        p.barcode as product_id,
                        CASE 
                            WHEN sm.movement_type = 'IN' THEN 'Addition'
                            WHEN sm.movement_type = 'OUT' THEN 'Subtraction'
                            ELSE 'Adjustment'
                        END as adjustment_type,
                        sm.quantity,
                        sm.notes as reason,
                        CONCAT(e.fname, ' ', e.lname) as adjusted_by,
                        DATE(sm.movement_date) as date,
                        TIME(sm.movement_date) as time,
                        'Approved' as status,
                        sm.notes,
                        sm.expiration_date,
                        sm.reference_no
                    FROM tbl_stock_movements sm
                    LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                    LEFT JOIN tbl_employee e ON sm.created_by = e.emp_id
                    $whereClause
                    ORDER BY sm.movement_date DESC
                    LIMIT " . (int)$limit . " OFFSET " . (int)$offset
                );
                
                $stmt->execute($params);
                $adjustments = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    "success" => true,
                    "data" => $adjustments,
                    "total" => $totalCount,
                    "page" => $page,
                    "limit" => $limit,
                    "pages" => ceil($totalCount / $limit)
                ]);
                
            } catch (Exception $e) {
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage(),
                    "data" => []
                ]);
            }
            break;

    case 'create_stock_adjustment':
        try {
            $product_id = $data['product_id'] ?? 0;
            $adjustment_type = $data['adjustment_type'] ?? 'Addition';
            $quantity = $data['quantity'] ?? 0;
            $reason = $data['reason'] ?? '';
            $notes = $data['notes'] ?? '';
            $unit_cost = $data['unit_cost'] ?? 0;
            $expiration_date = $data['expiration_date'] ?? null;
            $created_by = $data['created_by'] ?? 'admin';
                
                if (!$product_id || !$quantity || !$reason) {
                    echo json_encode([
                        "success" => false,
                        "message" => "Product ID, quantity, and reason are required"
                    ]);
                    break;
                }
                
                // Start transaction
                $conn->beginTransaction();
                
                // Get product details
                $productStmt = $conn->prepare("
                    SELECT product_name, quantity, location_id, unit_price 
                    FROM tbl_product 
                    WHERE product_id = ?
                ");
                $productStmt->execute([$product_id]);
                $product = $productStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$product) {
                    throw new Exception("Product not found");
                }
                
                // Determine movement type
                $movement_type = ($adjustment_type === 'Addition') ? 'IN' : 'OUT';
                
                // Calculate new quantity
                $old_quantity = $product['quantity'];
                $new_quantity = ($movement_type === 'IN') ? 
                    $old_quantity + $quantity : 
                    max(0, $old_quantity - $quantity);
                
                // Create batch record for the adjustment
                $batchStmt = $conn->prepare("
                    INSERT INTO tbl_batch (
                        batch, supplier_id, location_id, entry_date, entry_time, 
                        entry_by, order_no
                    ) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?, ?)
                ");
                $batch_reference = 'ADJ-' . date('Ymd-His');
                $batchStmt->execute([$batch_reference, null, $product['location_id'], $created_by, '']);
                $batch_id = $conn->lastInsertId();
                
                // Update product quantity
                $updateStmt = $conn->prepare("
                    UPDATE tbl_product 
                    SET quantity = ?,
                        stock_status = CASE 
                            WHEN ? <= 0 THEN 'out of stock'
                            WHEN ? <= 10 THEN 'low stock'
                            ELSE 'in stock'
                        END
                    WHERE product_id = ?
                ");
                $updateStmt->execute([$new_quantity, $new_quantity, $new_quantity, $product_id]);
                
                // Create stock movement record
                $movementStmt = $conn->prepare("
                    INSERT INTO tbl_stock_movements (
                        product_id, batch_id, movement_type, quantity, remaining_quantity,
                        expiration_date, reference_no, notes, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $movementStmt->execute([
                    $product_id, $batch_id, $movement_type, $quantity, $new_quantity,
                    $expiration_date, $batch_reference, $notes, $created_by
                ]);
                
                // Create stock summary record
                $summaryStmt = $conn->prepare("
                    INSERT INTO tbl_stock_summary (
                        product_id, batch_id, available_quantity, 
                        expiration_date, batch_reference, total_quantity
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        available_quantity = available_quantity + VALUES(available_quantity),
                        total_quantity = total_quantity + VALUES(total_quantity),
                        last_updated = CURRENT_TIMESTAMP
                ");
                $summaryStmt->execute([
                    $product_id, $batch_id, $quantity, 
                    $expiration_date, $batch_reference, $quantity
                ]);
                
                $conn->commit();
                
                echo json_encode([
                    "success" => true,
                    "message" => "Stock adjustment created successfully",
                    "data" => [
                        "adjustment_id" => $conn->lastInsertId(),
                        "old_quantity" => $old_quantity,
                        "new_quantity" => $new_quantity,
                        "batch_reference" => $batch_reference
                    ]
                ]);
                
            } catch (Exception $e) {
                if (isset($conn)) {
                    $conn->rollback();
                }
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage()
                ]);
            }
            break;
    case 'update_stock_adjustment':
        try {
            $movement_id = $data['movement_id'] ?? 0;
            $quantity = $data['quantity'] ?? 0;
            $reason = $data['reason'] ?? '';
            $notes = $data['notes'] ?? '';
            $expiration_date = $data['expiration_date'] ?? null;
                
                if (!$movement_id) {
                    echo json_encode([
                        "success" => false,
                        "message" => "Movement ID is required"
                    ]);
                    break;
                }
                
                // Start transaction
                $conn->beginTransaction();
                
                // Get current movement details
                $movementStmt = $conn->prepare("
                    SELECT sm.*, p.product_name, p.quantity as current_product_quantity
                    FROM tbl_stock_movements sm
                    LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                    WHERE sm.movement_id = ?
                ");
                $movementStmt->execute([$movement_id]);
                $movement = $movementStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$movement) {
                    throw new Exception("Movement not found");
                }
                
                // Calculate quantity difference
                $quantity_diff = $quantity - $movement['quantity'];
                
                // Update product quantity
                $new_product_quantity = $movement['current_product_quantity'] + $quantity_diff;
                $new_product_quantity = max(0, $new_product_quantity);
                
                $updateProductStmt = $conn->prepare("
                    UPDATE tbl_product 
                    SET quantity = ?,
                        stock_status = CASE 
                            WHEN ? <= 0 THEN 'out of stock'
                            WHEN ? <= 10 THEN 'low stock'
                            ELSE 'in stock'
                        END
                    WHERE product_id = ?
                ");
                $updateProductStmt->execute([$new_product_quantity, $new_product_quantity, $new_product_quantity, $movement['product_id']]);
                
                // Update movement record
                $updateMovementStmt = $conn->prepare("
                    UPDATE tbl_stock_movements 
                    SET quantity = ?,
                        remaining_quantity = ?,
                        expiration_date = ?,
                        notes = ?
                    WHERE movement_id = ?
                ");
                $updateMovementStmt->execute([
                    $quantity, $new_product_quantity, $expiration_date, $notes, $movement_id
                ]);
                
                // Update stock summary
                $updateSummaryStmt = $conn->prepare("
                    UPDATE tbl_stock_summary 
                    SET available_quantity = available_quantity + ?,
                        expiration_date = ?,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE batch_id = ?
                ");
                $updateSummaryStmt->execute([
                    $quantity_diff, $expiration_date, $movement['batch_id']
                ]);
                
                $conn->commit();
                
                echo json_encode([
                    "success" => true,
                    "message" => "Stock adjustment updated successfully"
                ]);
                
            } catch (Exception $e) {
                if (isset($conn)) {
                    $conn->rollback();
                }
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage()
                ]);
            }
            break;

    case 'delete_stock_adjustment':
        try {
            $movement_id = $data['movement_id'] ?? 0;
            
            if (!$movement_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Movement ID is required"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            // Get movement details
            $movementStmt = $conn->prepare("
                SELECT sm.*, p.quantity as current_product_quantity
                FROM tbl_stock_movements sm
                LEFT JOIN tbl_product p ON sm.product_id = p.product_id
                WHERE sm.movement_id = ?
            ");
            $movementStmt->execute([$movement_id]);
            $movement = $movementStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$movement) {
                throw new Exception("Movement not found");
            }
            
            // Reverse the adjustment effect on product quantity
            $quantity_to_reverse = ($movement['movement_type'] === 'IN') ? -$movement['quantity'] : $movement['quantity'];
            $new_product_quantity = $movement['current_product_quantity'] + $quantity_to_reverse;
            $new_product_quantity = max(0, $new_product_quantity);
            
            // Update product quantity
            $updateProductStmt = $conn->prepare("
                UPDATE tbl_product 
                SET quantity = ?,
                    stock_status = CASE 
                        WHEN ? <= 0 THEN 'out of stock'
                        WHEN ? <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END
                WHERE product_id = ?
            ");
            $updateProductStmt->execute([$new_product_quantity, $new_product_quantity, $new_product_quantity, $movement['product_id']]);
            
            // Delete movement record
            $deleteMovementStmt = $conn->prepare("DELETE FROM tbl_stock_movements WHERE movement_id = ?");
            $deleteMovementStmt->execute([$movement_id]);
            
            // Update stock summary
            $updateSummaryStmt = $conn->prepare("
                UPDATE tbl_stock_summary 
                SET available_quantity = available_quantity - ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE batch_id = ?
            ");
            $updateSummaryStmt->execute([$movement['quantity'], $movement['batch_id']]);
            
            $conn->commit();
            
            echo json_encode([
                "success" => true,
                "message" => "Stock adjustment deleted successfully"
            ]);
            
        } catch (Exception $e) {
            if (isset($conn)) {
                $conn->rollback();
            }
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'get_stock_adjustment_stats':
            try {
                $stmt = $conn->prepare("
                    SELECT 
                        COUNT(*) as total_adjustments,
                        COUNT(CASE WHEN movement_type = 'IN' THEN 1 END) as additions,
                        COUNT(CASE WHEN movement_type = 'OUT' THEN 1 END) as subtractions,
                        SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END) as net_quantity
                    FROM tbl_stock_movements
                    WHERE movement_type IN ('IN', 'OUT')
                ");
                $stmt->execute();
                $stats = $stmt->fetch(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    "success" => true,
                    "data" => $stats
                ]);
                
            } catch (Exception $e) {
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage(),
                    "data" => []
                ]);
            }
            break;
    case 'get_product_quantities':
        try {
            $location_id = $data['location_id'] ?? null;
            
            $whereClause = "WHERE (p.status IS NULL OR p.status <> 'archived')";
            $params = [];
            
            if ($location_id) {
                $whereClause .= " AND p.location_id = ?";
                $params[] = $location_id;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.barcode,
                    p.category,
                    p.quantity as product_quantity,
                    p.unit_price,
                    p.srp,
                    p.brand_id,
                    p.supplier_id,
                    p.location_id,
                    p.status,
                    p.stock_status,
                    p.date_added,
                    s.supplier_name,
                    b.brand,
                    l.location_name,
                    -- Get total quantity from stock summary if available
                    COALESCE(
                        (SELECT SUM(ss.available_quantity) 
                         FROM tbl_stock_summary ss 
                         WHERE ss.product_id = p.product_id), 
                        p.quantity
                    ) as total_available_quantity
                FROM tbl_product p 
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id 
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id 
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                $whereClause
                ORDER BY p.product_name ASC
            ");
            
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $products
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage(),
                "data" => []
            ]);
        }
        break;

    // POS: save sale header + details and create transaction record
    case 'save_pos_sale':
            try {
                $client_txn_id = $data['transactionId'] ?? '';
                $total_amount = (float)($data['totalAmount'] ?? 0);
                $reference_number = $data['referenceNumber'] ?? '';
                $terminal_name = trim($data['terminalName'] ?? 'POS Terminal');
                $items = $data['items'] ?? [];
                $payment_method = strtolower(trim($data['paymentMethod'] ?? ($reference_number ? 'gcash' : 'cash')));

                if (!is_array($items) || count($items) === 0) {
                    echo json_encode(["success" => false, "message" => "No items to save."]); break;
                }

                // Start transaction
                $conn->beginTransaction();

                // Ensure terminal exists or create one
                $termStmt = $conn->prepare("SELECT terminal_id FROM tbl_pos_terminal WHERE terminal_name = ? LIMIT 1");
                $termStmt->execute([$terminal_name]);
                $terminal = $termStmt->fetch(PDO::FETCH_ASSOC);
                if ($terminal && isset($terminal['terminal_id'])) {
                    $terminal_id = (int)$terminal['terminal_id'];
                } else {
                    // shift_id is required; default to 1
                    $insTerm = $conn->prepare("INSERT INTO tbl_pos_terminal (terminal_name, shift_id) VALUES (?, 1)");
                    $insTerm->execute([$terminal_name]);
                    $terminal_id = (int)$conn->lastInsertId();
                }

                // Map to enum in schema: ('cash','card','Gcash')
                $payment_enum = ($payment_method === 'gcash') ? 'Gcash' : (($payment_method === 'card') ? 'card' : 'cash');

                // Create transaction row (schema: transaction_id, date, time, emp_id, payment_type)
                $txnStmt = $conn->prepare("INSERT INTO tbl_pos_transaction (date, time, emp_id, payment_type) VALUES (CURDATE(), CURTIME(), 1, ?)");
                $txnStmt->execute([$payment_enum]);
                $transaction_id = (int)$conn->lastInsertId();

                // If no reference number was provided (cash), store the client txn id so we can locate it later if needed
                $header_reference = $reference_number !== null && $reference_number !== '' ? $reference_number : ($client_txn_id ?: '');

                // Create sales header
                $hdrStmt = $conn->prepare("INSERT INTO tbl_pos_sales_header (transaction_id, total_amount, reference_number, terminal_id) VALUES (?, ?, ?, ?)");
                $hdrStmt->execute([$transaction_id, $total_amount, $header_reference, $terminal_id]);
                $sales_header_id = (int)$conn->lastInsertId();

                // Insert each item into details and decrement product stock
                $dtlStmt = $conn->prepare("INSERT INTO tbl_pos_sales_details (sales_header_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
                $updQtyStmt = $conn->prepare("UPDATE tbl_product SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ?");

                foreach ($items as $it) {
                    $pid = (int)($it['product_id'] ?? $it['id'] ?? 0);
                    $qty = (int)($it['quantity'] ?? 0);
                    $price = (float)($it['price'] ?? 0);
                    if ($pid <= 0 || $qty <= 0) { continue; }
                    $dtlStmt->execute([$sales_header_id, $pid, $qty, $price]);
                    $updQtyStmt->execute([$qty, $pid]);
                }

                $conn->commit();
                echo json_encode([
                    "success" => true,
                    "message" => "POS sale saved",
                    "data" => [
                        "transaction_id" => $transaction_id,
                        "sales_header_id" => $sales_header_id,
                        "terminal_id" => $terminal_id
                    ]
                ]);
            } catch (Exception $e) {
                if (isset($conn)) { $conn->rollback(); }
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
            break;

    // POS: update transaction payment type (best-effort for existing header created above)
    case 'save_pos_transaction':
        try {
            $client_txn_id = $data['transactionId'] ?? '';
            $payment_type = strtolower(trim($data['paymentType'] ?? 'cash'));
            $payment_enum = ($payment_type === 'gcash') ? 'Gcash' : (($payment_type === 'card') ? 'card' : 'cash');

            // Try to locate the sales header by using the client transaction id stored in reference_number (for cash)
            $findStmt = $conn->prepare("SELECT transaction_id FROM tbl_pos_sales_header WHERE reference_number = ? ORDER BY sales_header_id DESC LIMIT 1");
            $findStmt->execute([$client_txn_id]);
            $row = $findStmt->fetch(PDO::FETCH_ASSOC);

            if ($row && isset($row['transaction_id'])) {
                $upd = $conn->prepare("UPDATE tbl_pos_transaction SET payment_type = ? WHERE transaction_id = ?");
                $upd->execute([$payment_enum, (int)$row['transaction_id']]);
                echo json_encode(["success" => true, "message" => "Payment type updated."]);
            } else {
                // Fallback: update the latest transaction today
                $upd = $conn->prepare("UPDATE tbl_pos_transaction SET payment_type = ? WHERE date = CURDATE() ORDER BY transaction_id DESC LIMIT 1");
                $upd->execute([$payment_enum]);
                echo json_encode(["success" => true, "message" => "Payment type updated (latest transaction)." ]);
            }
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        break;

    // Additional functions from mysqli backend files
    case 'test_action':
        echo json_encode([
            "success" => true,
            "message" => "Test action successful",
            "timestamp" => date('Y-m-d H:i:s')
        ]);
        break;
        
    case 'test_database_connection':
        try {
            echo json_encode([
                "success" => true,
                "message" => "Database connection successful",
                "database_info" => "Connected to enguio2 database via PDO",
                "timestamp" => date('Y-m-d H:i:s')
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database connection failed: " . $e->getMessage()
            ]);
        }
        break;

    case 'check_fifo_stock':
            try {
                $product_id = $data['product_id'] ?? null;
                $batch_id = $data['batch_id'] ?? null;
                
                $sql = "SELECT fs.*, p.product_name, b.batch 
                        FROM tbl_fifo_stock fs 
                        JOIN tbl_product p ON fs.product_id = p.product_id 
                        JOIN tbl_batch b ON fs.batch_id = b.batch_id";
                
                $params = [];
                $conditions = [];
                
                if ($product_id) {
                    $conditions[] = "fs.product_id = ?";
                    $params[] = $product_id;
                }
                
                if ($batch_id) {
                    $conditions[] = "fs.batch_id = ?";
                    $params[] = $batch_id;
                }
                
                if (!empty($conditions)) {
                    $sql .= " WHERE " . implode(" AND ", $conditions);
                }
                
                $sql .= " ORDER BY fs.entry_date DESC, fs.product_id";
                
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                $fifo_entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    "success" => true,
                    "fifo_entries" => $fifo_entries,
                    "count" => count($fifo_entries)
                ]);
                
            } catch (Exception $e) {
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage()
                ]);
            }
            break;

    case 'add_product_enhanced':
        try {
            // Extract data
            $product_name = $data['product_name'] ?? '';
            $description = $data['description'] ?? '';
            $category = $data['category'] ?? 'General';
            $brand_id = $data['brand_id'] ?? 1;
            $supplier_id = $data['supplier_id'] ?? 1;
            $location_id = $data['location_id'] ?? 1;
            $unit_price = $data['unit_price'] ?? 0;
            $srp = $data['srp'] ?? 0;
            $quantity = $data['quantity'] ?? 0;
            $expiration = $data['expiration'] ?? null;
            $order_no = $data['order_no'] ?? '';
            $entry_by = $data['entry_by'] ?? 'admin';
                
                if (empty($product_name)) {
                    echo json_encode([
                        "success" => false,
                        "message" => "Product name is required"
                    ]);
                    break;
                }
                
                // Start transaction
                $conn->beginTransaction();
                
                try {
                    // Insert product
                    $productStmt = $conn->prepare("
                        INSERT INTO tbl_product (
                            product_name, description, category, brand_id, supplier_id, 
                            location_id, unit_price, quantity, status, date_added
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURDATE())
                    ");
                    
                    $productStmt->execute([
                        $product_name, $description, $category, $brand_id, 
                        $supplier_id, $location_id, $unit_price, $quantity
                    ]);
                    
                    $product_id = $conn->lastInsertId();
                    
                    // Create batch record
                    $batchStmt = $conn->prepare("
                        INSERT INTO tbl_batch (
                            batch, supplier_id, location_id, date, entry_date, entry_time, 
                            entry_by, order_no
                        ) VALUES (?, ?, ?, CURDATE(), CURDATE(), CURTIME(), ?, ?)
                    ");
                    
                    $reference = "BATCH-" . date('Ymd') . "-" . $product_id;
                    $batchStmt->execute([$reference, $supplier_id, $location_id, $entry_by, $order_no]);
                    
                    $batch_id = $conn->lastInsertId();
                    
                    // Create stock summary
                    $summaryStmt = $conn->prepare("
                        INSERT INTO tbl_stock_summary (
                            product_id, batch_id, available_quantity, srp,
                            expiration_date, batch_reference, total_quantity
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            available_quantity = available_quantity + VALUES(available_quantity),
                            total_quantity = total_quantity + VALUES(total_quantity),
                            srp = VALUES(srp),
                            last_updated = CURRENT_TIMESTAMP
                    ");
                    
                    $summaryStmt->execute([
                        $product_id, $batch_id, $quantity, $srp,
                        $expiration, $reference, $quantity
                    ]);
                    
                    // Create FIFO stock entry if table exists
                    try {
                        $fifoStmt = $conn->prepare("
                            INSERT INTO tbl_fifo_stock (
                                product_id, batch_id, available_quantity, srp, expiration_date, batch_reference, entry_date, entry_by
                            ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)
                        ");
                        
                        $fifoStmt->execute([
                            $product_id, $batch_id, $quantity, $srp, $expiration, $reference, $entry_by
                        ]);
                        
                        $fifo_created = true;
                    } catch (Exception $e) {
                        // FIFO table might not exist, continue without it
                        $fifo_created = false;
                    }
                    
                    $conn->commit();
                    
                    echo json_encode([
                        "success" => true,
                        "message" => "Product added successfully with enhanced tracking",
                        "product_id" => $product_id,
                        "batch_id" => $batch_id,
                        "fifo_stock_created" => $fifo_created
                    ]);
                    
                } catch (Exception $e) {
                    $conn->rollback();
                    throw $e;
                }
                
            } catch (Exception $e) {
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage()
                ]);
            }
            break;

    case 'check_duplicates':
        try {
            // Find products with duplicate name+category combinations
            $stmt = $conn->prepare("
                SELECT product_name, category, location_id, COUNT(*) as count
                FROM tbl_product 
                GROUP BY product_name, category, location_id 
                HAVING COUNT(*) > 1
                ORDER BY product_name, category
            ");
            $stmt->execute();
            $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "duplicates" => $duplicates,
                "message" => "Found " . count($duplicates) . " duplicate combinations"
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
    case 'check_constraints':
        try {
            // Check for unique constraints on tbl_product
            $stmt = $conn->prepare("
                SELECT 
                    CONSTRAINT_NAME as constraint_name,
                    CONSTRAINT_TYPE as constraint_type,
                    COLUMN_NAME as columns
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tbl_product'
                AND CONSTRAINT_NAME IS NOT NULL
                ORDER BY CONSTRAINT_NAME
            ");
            $stmt->execute([$dbname]);
            $constraints = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "constraints" => $constraints,
                "message" => "Found " . count($constraints) . " constraints"
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'view_all_products':
        try {
            $stmt = $conn->prepare("
                SELECT product_id, product_name, category, location_id, quantity, barcode, status
                FROM tbl_product 
                ORDER BY product_name, category, location_id
                LIMIT 100
            ");
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "products" => $products,
                "message" => "Found " . count($products) . " products"
            ]);
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

    case 'test_transfer_logic':
            try {
                $product_name = $data['product_name'] ?? '';
                $category = $data['category'] ?? '';
                $location_id = $data['location_id'] ?? 0;
                
                // Test the logic that checks for existing products
                $checkStmt = $conn->prepare("
                    SELECT product_id, quantity, product_name, category, location_id
                    FROM tbl_product 
                    WHERE product_name = ? AND category = ? AND location_id = ?
                ");
                $checkStmt->execute([$product_name, $category, $location_id]);
                $existingProduct = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingProduct) {
                    echo json_encode([
                        "success" => true,
                        "message" => "Product found! ID: {$existingProduct['product_id']}, Current Qty: {$existingProduct['quantity']}. This would be UPDATED during transfer.",
                        "product" => $existingProduct
                    ]);
                } else {
                    echo json_encode([
                        "success" => true,
                        "message" => "No product found with name '$product_name' in category '$category' at location $location_id. This would be CREATED during transfer.",
                        "search_criteria" => [
                            "product_name" => $product_name,
                            "category" => $category,
                            "location_id" => $location_id
                        ]
                    ]);
                }
            } catch (Exception $e) {
                echo json_encode([
                    "success" => false,
                    "message" => "Database error: " . $e->getMessage()
                ]);
            }
            break;
    case 'add_batch_entry':
        try {
            // Extract batch data
            $batch_reference = $data['batch_reference'] ?? '';
            $batch_date = $data['batch_date'] ?? date('Y-m-d');
            $batch_time = $data['batch_time'] ?? date('H:i:s');
            $total_products = $data['total_products'] ?? 0;
            $total_quantity = $data['total_quantity'] ?? 0;
            $total_value = $data['total_value'] ?? 0;
            $location = $data['location'] ?? 'Warehouse';
            $entry_by = $data['entry_by'] ?? 'System';
            $status = $data['status'] ?? 'active';
            $products = $data['products'] ?? [];
            
            if (empty($batch_reference)) {
                echo json_encode([
                    "success" => false,
                    "message" => "Batch reference is required"
                ]);
                break;
            }
            
            if (empty($products)) {
                echo json_encode([
                    "success" => false,
                    "message" => "No products to add"
                ]);
                break;
            }
            
            // Start transaction
            $conn->beginTransaction();
            
            try {
                // 1. Insert batch entry
                $batchStmt = $conn->prepare("
                    INSERT INTO tbl_batch (
                        date, time, batch, batch_reference, supplier_id, location_id, 
                        entry_date, entry_time, entry_by, order_no, order_ref
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )
                ");
                
                $supplier_id = 1; // Default supplier
                $location_id = 2; // Warehouse location
                $order_no = ''; // Can be updated later
                $order_ref = ''; // Can be updated later
                
                $batchStmt->execute([
                    $batch_date,
                    $batch_time,
                    $batch_reference,
                    $batch_reference,
                    $supplier_id,
                    $location_id,
                    $batch_date,
                    $batch_time,
                    $entry_by,
                    $order_no,
                    $order_ref
                ]);
                
                $batch_id = $conn->lastInsertId();
                
                // 2. Insert all products with the same batch_id
                $productStmt = $conn->prepare("
                    INSERT INTO tbl_product (
                        product_name, category, barcode, description, prescription, bulk,
                        expiration, quantity, unit_price, srp, brand_id, supplier_id,
                        location_id, batch_id, status, stock_status, date_added
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )
                ");
                
                $successCount = 0;
                foreach ($products as $product) {
                    try {
                        $productStmt->execute([
                            $product['product_name'],
                            $product['category'],
                            $product['barcode'],
                            $product['description'] ?? '',
                            $product['prescription'] ?? 0,
                            $product['bulk'] ?? 0,
                            $product['expiration'] ?? null,
                            $product['quantity'],
                            $product['unit_price'],
                            $product['srp'] ?? 0,
                            $product['brand_id'] ?? 1,
                            $product['supplier_id'] ?? 1,
                            $location_id,
                            $batch_id, // All products get the same batch_id
                            'active',
                            'in stock',
                            date('Y-m-d')
                        ]);
                        
                        $product_id = $conn->lastInsertId();
                        
                        // 3. Create FIFO stock entry for each product
                        $fifoStmt = $conn->prepare("
                            INSERT INTO tbl_fifo_stock (
                                product_id, batch_id, batch_reference, quantity, available_quantity, srp,
                                expiration_date, entry_date, entry_by, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, NOW(), NOW())
                        ");
                        $fifoStmt->execute([
                            $product_id,
                            $batch_id,
                            $batch_reference,
                            $product['quantity'],
                            $product['quantity'], // available_quantity starts equal to quantity
                            $product['srp'] ?? 0,
                            $product['expiration'] ?? null,
                            $entry_by
                        ]);
                        
                        $successCount++;
                    } catch (Exception $e) {
                        error_log("Error inserting product {$product['product_name']}: " . $e->getMessage());
                        throw $e;
                    }
                }
                
                // Commit transaction
                $conn->commit();
                
                echo json_encode([
                    "success" => true,
                    "message" => "Batch created successfully with $successCount products",
                    "batch_id" => $batch_id,
                    "batch_reference" => $batch_reference,
                    "total_products" => $successCount,
                    "total_quantity" => $total_quantity,
                    "total_value" => $total_value
                ]);
                
            } catch (Exception $e) {
                // Rollback transaction on error
                $conn->rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;

        case 'sync_fifo_stock':
        try {
            // This function syncs FIFO stock available_quantity with product quantity
            $product_id = $data['product_id'] ?? 0;
            
            if ($product_id > 0) {
                // Sync specific product - update tbl_product.quantity to match FIFO total
                $syncStmt = $conn->prepare("
                    UPDATE tbl_product p
                    SET p.quantity = (
                        SELECT COALESCE(SUM(fs.available_quantity), 0)
                        FROM tbl_fifo_stock fs
                        WHERE fs.product_id = p.product_id
                    ),
                    p.stock_status = CASE 
                        WHEN (
                            SELECT COALESCE(SUM(fs.available_quantity), 0)
                            FROM tbl_fifo_stock fs
                            WHERE fs.product_id = p.product_id
                        ) <= 0 THEN 'out of stock'
                        WHEN (
                            SELECT COALESCE(SUM(fs.available_quantity), 0)
                            FROM tbl_fifo_stock fs
                            WHERE fs.product_id = p.product_id
                        ) <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END
                    WHERE p.product_id = ?
                ");
                $syncStmt->execute([$product_id]);
                
                $affectedRows = $syncStmt->rowCount();
                
                echo json_encode([
                    "success" => true,
                    "message" => "Product quantity synced with FIFO stock for product ID $product_id. $affectedRows rows updated.",
                    "product_id" => $product_id
                ]);
            } else {
                // Sync all products
                $syncAllStmt = $conn->prepare("
                    UPDATE tbl_product p
                    SET p.quantity = (
                        SELECT COALESCE(SUM(fs.available_quantity), 0)
                        FROM tbl_fifo_stock fs
                        WHERE fs.product_id = p.product_id
                    ),
                    p.stock_status = CASE 
                        WHEN (
                            SELECT COALESCE(SUM(fs.available_quantity), 0)
                            FROM tbl_fifo_stock fs
                            WHERE fs.product_id = p.product_id
                        ) <= 0 THEN 'out of stock'
                        WHEN (
                            SELECT COALESCE(SUM(fs.available_quantity), 0)
                            FROM tbl_fifo_stock fs
                            WHERE fs.product_id = p.product_id
                        ) <= 10 THEN 'low stock'
                        ELSE 'in stock'
                    END
                ");
                $syncAllStmt->execute();
                
                $affectedRows = $syncAllStmt->rowCount();
                
                echo json_encode([
                    "success" => true,
                    "message" => "All product quantities synced with FIFO stock. $affectedRows rows updated.",
                    "affected_rows" => $affectedRows
                ]);
            }
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
        
    case 'force_sync_all_products':
        try {
            // Force sync all products with FIFO stock - this fixes existing data inconsistencies
            $syncAllStmt = $conn->prepare("
                UPDATE tbl_product p
                SET p.quantity = (
                    SELECT COALESCE(SUM(fs.available_quantity), 0)
                    FROM tbl_fifo_stock fs
                    WHERE fs.product_id = p.product_id
                ),
                p.stock_status = CASE 
                    WHEN (
                        SELECT COALESCE(SUM(fs.available_quantity), 0)
                        FROM tbl_fifo_stock fs
                        WHERE fs.product_id = p.product_id
                    ) <= 0 THEN 'out of stock'
                    WHEN (
                        SELECT COALESCE(SUM(fs.available_quantity), 0)
                        FROM tbl_fifo_stock fs
                        WHERE fs.product_id = p.product_id
                    ) <= 10 THEN 'low stock'
                    ELSE 'in stock'
                END
                WHERE p.product_id IN (
                    SELECT DISTINCT fs.product_id 
                    FROM tbl_fifo_stock fs
                )
            ");
            $syncAllStmt->execute();
            
            $affectedRows = $syncAllStmt->rowCount();
            
            echo json_encode([
                "success" => true,
                "message" => "Force synced all products with FIFO stock. $affectedRows products updated.",
                "affected_rows" => $affectedRows
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
        
    case 'cleanup_duplicate_transfer_products':
        try {
            // Remove duplicate products that were incorrectly created during transfers
            // Keep only the original products in their original locations
            $cleanupStmt = $conn->prepare("
                DELETE p FROM tbl_product p
                WHERE p.product_id NOT IN (
                    SELECT original_product_id FROM (
                        SELECT MIN(p2.product_id) as original_product_id
                        FROM tbl_product p2
                        GROUP BY p2.product_name, p2.category, p2.barcode, p2.location_id
                    ) as original_products
                )
                AND p.product_id IN (
                    SELECT p3.product_id 
                    FROM tbl_product p3
                    WHERE p3.product_id NOT IN (
                        SELECT DISTINCT fs.product_id 
                        FROM tbl_fifo_stock fs
                    )
                )
            ");
            $cleanupStmt->execute();
            
            $affectedRows = $cleanupStmt->rowCount();
            
            echo json_encode([
                "success" => true,
                "message" => "Cleaned up $affectedRows duplicate transfer products. Only original products remain.",
                "affected_rows" => $affectedRows
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
        break;
        
    case 'test_logging':
        try {
            // Add test log entry for debugging
            $conn->exec("CREATE TABLE IF NOT EXISTS tbl_activity_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                username VARCHAR(255) NULL,
                role VARCHAR(100) NULL,
                activity_type VARCHAR(100) NOT NULL,
                activity_description TEXT NULL,
                table_name VARCHAR(255) NULL,
                record_id INT NULL,
                date_created DATE NOT NULL,
                time_created TIME NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
            
            $stmt = $conn->prepare("INSERT INTO tbl_activity_log (activity_type, activity_description, username, role, date_created, time_created) VALUES (?, ?, ?, ?, CURDATE(), CURTIME())");
            $stmt->execute([
                'TEST_LOG_ENTRY',
                'Manual test log entry created at ' . date('Y-m-d H:i:s'),
                'admin',
                'Admin'
            ]);
            
            echo json_encode(["success" => true, "message" => "Test log entry created successfully"]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Error creating test log: " . $e->getMessage()]);
        }
        break;
         
    }
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}

// Flush the output buffer to ensure clean JSON response
ob_end_flush();
?>  