-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 08, 2025 at 08:15 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `enguio2`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbd_backup`
--

CREATE TABLE `tbd_backup` (
  `id` int(11) NOT NULL DEFAULT 0,
  `transfer_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `batch_reference` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `srp` decimal(10,2) DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbd_backup`
--

INSERT INTO `tbd_backup` (`id`, `transfer_id`, `product_id`, `batch_id`, `batch_reference`, `quantity`, `unit_cost`, `srp`, `expiration_date`, `created_at`) VALUES
(19, 40, 0, 1, 'BR-40-78', 60, 10.00, NULL, '2026-09-06', '2025-09-06 09:25:28'),
(20, 41, 0, 1, 'BR-41-78', 70, 10.00, NULL, '2026-09-06', '2025-09-06 09:25:28'),
(21, 52, 0, 108, 'BR-20250906-172303', 20, 7.00, NULL, '2027-07-14', '2025-09-06 09:26:00'),
(22, 47, 0, 108, 'BR-20250906-172303', 20, 7.00, NULL, '2027-07-14', '2025-09-06 09:26:54'),
(23, 53, 0, 108, 'BR-20250906-172303', 10, 13.00, NULL, '2027-07-14', '2025-09-06 09:27:21'),
(24, 48, 0, 108, 'BR-20250906-172303', 10, 13.00, NULL, '2025-09-26', '2025-09-06 09:27:26'),
(25, 54, 0, 108, 'BR-20250906-172303', 590, 13.00, NULL, '2027-07-14', '2025-09-06 09:53:37'),
(26, 54, 0, 109, 'BR-20250906-175300', 10, 13.00, NULL, '2027-07-06', '2025-09-06 09:53:37'),
(27, 49, 0, 108, 'BR-20250906-172303', 600, 13.00, NULL, '2025-09-26', '2025-09-06 09:53:41'),
(28, 55, 0, 109, 'BR-20250906-175300', 10, 13.00, NULL, '2027-07-06', '2025-09-06 10:03:40'),
(29, 50, 0, 108, 'BR-20250906-172303', 10, 13.00, NULL, '2025-09-26', '2025-09-06 10:03:46'),
(30, 56, 0, 109, 'BR-20250906-175300', 30, 13.00, NULL, '2027-07-06', '2025-09-06 10:15:58'),
(31, 56, 0, 110, 'BR-20250906-181523', 10, 13.00, NULL, '2029-11-06', '2025-09-06 10:15:58'),
(32, 51, 0, 108, 'BR-20250906-172303', 40, 13.00, NULL, '2025-09-26', '2025-09-06 10:19:45');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_activity_log`
--

CREATE TABLE `tbl_activity_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `activity_type` varchar(100) NOT NULL,
  `activity_description` text DEFAULT NULL,
  `table_name` varchar(255) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `date_created` date NOT NULL,
  `time_created` time NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_activity_log`
--

INSERT INTO `tbl_activity_log` (`id`, `user_id`, `username`, `role`, `activity_type`, `activity_description`, `table_name`, `record_id`, `date_created`, `time_created`, `created_at`) VALUES
(1, NULL, NULL, NULL, 'LOGOUT', 'User logged out (SUCCESS)', 'tbl_login', NULL, '2025-09-01', '17:50:12', '2025-09-01 15:50:12'),
(2, NULL, NULL, NULL, 'USER_CREATE', 'Created employee clyde (Clyde Dichos) with role cashier, shift Shift1', 'tbl_employee', NULL, '2025-09-08', '07:59:58', '2025-09-08 05:59:58');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_adjustment_details`
--

CREATE TABLE `tbl_adjustment_details` (
  `adjustment_id` int(11) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `adjustment_type` enum('add','replace','return') NOT NULL,
  `employee_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_adjustment_header`
--

CREATE TABLE `tbl_adjustment_header` (
  `adjustment_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_archive`
--

CREATE TABLE `tbl_archive` (
  `archive_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `item_type` enum('Product','Category','Supplier') NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `item_description` text DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `archived_by` varchar(100) NOT NULL,
  `archived_date` date NOT NULL,
  `archived_time` time NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('Archived','Deleted','Restored') DEFAULT 'Archived',
  `original_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`original_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_archive`
--

INSERT INTO `tbl_archive` (`archive_id`, `item_id`, `item_type`, `item_name`, `item_description`, `category`, `archived_by`, `archived_date`, `archived_time`, `reason`, `status`, `original_data`, `created_at`) VALUES
(4, 53, 'Product', 'Choco Cake Bar', 'Snacks', 'Snack Foods', 'admin', '2025-08-13', '00:12:52', 'Archived from warehouse management', 'Deleted', '{\"product_id\":53,\"product_name\":\"Choco Cake Bar\",\"category\":\"Snack Foods\",\"barcode\":4800092550904,\"description\":\"Snacks\",\"prescription\":\"0\",\"bulk\":1,\"expiration\":\"2025-08-29\",\"quantity\":90,\"unit_price\":\"7.00\",\"srp\":\"10.00\",\"brand_id\":21,\"supplier_id\":2,\"location_id\":2,\"batch_id\":72,\"status\":\"active\",\"stock_status\":\"in stock\",\"date_added\":\"2025-08-11\",\"created_at\":\"2025-08-11 22:58:45\"}', '2025-08-12 16:12:52');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_batch`
--

CREATE TABLE `tbl_batch` (
  `batch_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `batch` varchar(255) DEFAULT NULL,
  `batch_reference` varchar(50) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `location_id` int(11) DEFAULT NULL,
  `entry_date` date DEFAULT NULL,
  `entry_time` time DEFAULT NULL,
  `entry_by` varchar(100) DEFAULT NULL,
  `order_no` varchar(50) DEFAULT NULL,
  `order_ref` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_batch`
--

INSERT INTO `tbl_batch` (`batch_id`, `date`, `time`, `batch`, `batch_reference`, `supplier_id`, `location_id`, `entry_date`, `entry_time`, `entry_by`, `order_no`, `order_ref`) VALUES
(88, '2025-08-19', '0000-00-00 00:00:00', 'BR-20250819-121541', 'BR-20250819-121541', 1, 2, '2025-08-19', '12:16:56', 'Inventory', '', ''),
(89, '0000-00-00', '2025-08-19 04:17:31', 'BR-20250819-121731', NULL, 3, 2, '2025-08-19', '12:17:31', 'Inventory', '', NULL),
(90, '0000-00-00', '2025-08-19 04:32:00', 'BR-20250819-123200', NULL, 3, 2, '2025-08-19', '12:32:00', 'Inventory', '', NULL),
(91, '0000-00-00', '2025-08-19 04:33:19', 'BR-20250819-123319', NULL, 3, 2, '2025-08-19', '12:33:19', 'Inventory', '', NULL),
(94, '2025-08-20', '0000-00-00 00:00:00', 'BR-20250820-165147', 'BR-20250820-165147', 1, 2, '2025-08-20', '04:54:31', 'Inventory', '', ''),
(95, '2025-08-27', '0000-00-00 00:00:00', 'BR-20250827-135415', 'BR-20250827-135415', 1, 2, '2025-08-27', '01:59:41', 'Inventory', '', ''),
(97, '0000-00-00', '2025-08-27 06:10:33', 'BR-20250827-141033', NULL, 3, 2, '2025-08-27', '14:10:33', 'Inventory', '', NULL),
(98, '2025-09-02', '0000-00-00 00:00:00', 'BR-20250902-231616', 'BR-20250902-231616', 1, 2, '2025-09-02', '11:17:33', 'Inventory', '', ''),
(99, '0000-00-00', '2025-09-02 15:18:12', 'BR-20250902-231812', NULL, 3, 2, '2025-09-02', '23:18:12', 'Inventory', '', NULL),
(100, '0000-00-00', '2025-09-02 15:37:04', 'BR-20250902-233704', NULL, 3, 2, '2025-09-02', '23:37:04', 'Inventory', '', NULL),
(101, '0000-00-00', '2025-09-02 15:41:45', 'BR-20250902-234145', NULL, 3, 2, '2025-09-02', '23:41:45', 'Inventory', '', NULL),
(102, '2025-09-02', '0000-00-00 00:00:00', 'BR-20250902-234327', 'BR-20250902-234327', 1, 2, '2025-09-02', '11:44:10', 'Inventory', '', ''),
(103, '0000-00-00', '2025-09-02 15:44:52', 'BR-20250902-234451', NULL, 3, 2, '2025-09-02', '23:44:52', 'Inventory', '', NULL),
(104, '2025-09-02', '0000-00-00 00:00:00', 'BR-20250902-234801', 'BR-20250902-234801', 1, 2, '2025-09-02', '11:49:31', 'Inventory', '', ''),
(105, '0000-00-00', '2025-09-02 16:04:16', 'BR-20250903-000416', NULL, 1, 2, '2025-09-03', '00:04:16', 'Inventory', '', NULL),
(106, '2025-09-06', '0000-00-00 00:00:00', 'BR-20250906-171958', 'BR-20250906-171958', 1, 2, '2025-09-06', '05:22:08', 'Inventory', '', ''),
(107, '2025-09-06', '0000-00-00 00:00:00', 'BR-20250906-172208', 'BR-20250906-172208', 1, 2, '2025-09-06', '05:22:23', 'Inventory', '', ''),
(108, '2025-09-06', '0000-00-00 00:00:00', 'BR-20250906-172303', 'BR-20250906-172303', 1, 2, '2025-09-06', '05:24:39', 'Inventory', '', ''),
(109, '0000-00-00', '2025-09-06 09:53:00', 'BR-20250906-175300', NULL, 3, 2, '2025-09-06', '17:53:00', 'Inventory', '', NULL),
(110, '0000-00-00', '2025-09-06 10:15:23', 'BR-20250906-181523', NULL, 3, 2, '2025-09-06', '18:15:23', 'Inventory', '', NULL),
(111, '0000-00-00', '2025-09-06 14:42:48', 'BR-20250906-224248', NULL, 3, 2, '2025-09-06', '22:42:48', 'Inventory', '', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_brand`
--

CREATE TABLE `tbl_brand` (
  `brand_id` int(11) NOT NULL,
  `brand` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_brand`
--

INSERT INTO `tbl_brand` (`brand_id`, `brand`) VALUES
(1, 'Nestlé'),
(2, 'Coca-Cola'),
(3, 'San Miguel'),
(4, 'Lucky Me!'),
(5, 'Purefoods'),
(6, 'Alaska'),
(7, 'Colgate'),
(8, 'Palmolive'),
(9, 'Green Cross'),
(10, 'Downy'),
(11, 'Breeze'),
(12, 'Surf'),
(13, 'Bear Brand'),
(14, 'Energen'),
(15, 'Milo'),
(16, 'SkyFlakes'),
(17, 'Fita'),
(18, 'Oishi'),
(19, 'Piattos'),
(20, 'Jack ’n Jill'),
(21, 'Fudgee Bar'),
(22, 'Leslies'),
(23, 'Royal'),
(24, 'Nova'),
(25, 'Unilab'),
(26, 'zesto'),
(27, 'Tuna');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_category`
--

CREATE TABLE `tbl_category` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_category`
--

INSERT INTO `tbl_category` (`category_id`, `category_name`) VALUES
(16, 'Over-the-Counter Medicines'),
(17, 'Prescription Medicines'),
(18, 'Vitamins & Supplements'),
(19, 'First Aid & Medical Supplies'),
(20, 'Personal Hygiene Products'),
(21, 'Sanitary Products'),
(22, 'Baby Care Products'),
(23, 'Skincare & Grooming'),
(24, 'Convenience Food (Ready-to-Eat)'),
(25, 'Snack Foods'),
(26, 'Beverages'),
(27, 'Frozen / Chilled Items'),
(28, 'Tobacco Products'),
(29, 'Alcoholic Beverages'),
(30, 'Household Essentials'),
(31, 'Pet Care'),
(32, 'Seasonal / Emergency Items');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_discount`
--

CREATE TABLE `tbl_discount` (
  `discount_id` int(11) NOT NULL,
  `discount_rate` float NOT NULL,
  `discount_type` enum('PWD','SENIOR') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_employee`
--

CREATE TABLE `tbl_employee` (
  `emp_id` int(11) NOT NULL,
  `Fname` varchar(255) NOT NULL,
  `Mname` varchar(255) DEFAULT NULL,
  `Lname` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `contact_num` varchar(20) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `shift_id` int(11) DEFAULT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `age` int(10) DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `birthdate` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_employee`
--

INSERT INTO `tbl_employee` (`emp_id`, `Fname`, `Mname`, `Lname`, `email`, `contact_num`, `role_id`, `shift_id`, `username`, `password`, `age`, `address`, `status`, `gender`, `birthdate`) VALUES
(1, 'ezay', 'bautista', 'Gutierrez', 'ten@gmail.com', '09788878787', 4, NULL, 'ezay', '$2y$10$67.yL9Lgh6iYYJtkGvroWObL5595mHOEal2XsrPvxX/xMQu38s.Xq', 20, 'Opol mis.or', 'Active', 'Female', '2025-08-08'),
(2, 'Clyde', 'Elmer', 'Dichos', 'clyde@gmail.com', '09788878787', 3, 1, 'clyde', '$2y$10$IA.yMYS1bWtDO9n4Tyvbf.TIbEpEQnP7Z2FV78HCmY.xCK3cc9v0W', 21, 'opol', 'Active', 'Female', '2005-06-01');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_fifo_stock`
--

CREATE TABLE `tbl_fifo_stock` (
  `fifo_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `batch_reference` varchar(100) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `available_quantity` int(11) NOT NULL DEFAULT 0,
  `unit_cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `srp` decimal(10,2) DEFAULT NULL COMMENT 'Suggested Retail Price for this batch',
  `expiration_date` date DEFAULT NULL,
  `entry_date` date NOT NULL,
  `entry_by` varchar(100) DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tbl_fifo_stock`
--

INSERT INTO `tbl_fifo_stock` (`fifo_id`, `product_id`, `batch_id`, `batch_reference`, `quantity`, `available_quantity`, `unit_cost`, `srp`, `expiration_date`, `entry_date`, `entry_by`, `created_at`, `updated_at`) VALUES
(58, 91, 108, 'BR-20250906-172303', 120, 100, 7.00, 7.00, '2027-07-14', '2025-09-06', 'Inventory', '2025-09-06 09:24:39', '2025-09-06 09:26:00'),
(59, 92, 108, 'BR-20250906-172303', 600, 0, 13.00, 13.00, '2025-09-26', '2025-09-06', 'Inventory', '2025-09-06 09:24:39', '2025-09-06 09:53:37'),
(60, 92, 109, 'BR-20250906-175300', 50, 0, 13.00, 13.00, '2027-07-06', '2025-09-06', 'Inventory', '2025-09-06 09:53:00', '2025-09-06 10:15:58'),
(61, 92, 110, 'BR-20250906-181523', 50, 0, 13.00, 10.00, '2029-11-06', '2025-09-06', 'Inventory', '2025-09-06 10:15:23', '2025-09-06 14:43:14'),
(62, 92, 111, 'BR-20250906-224248', 100, 90, 13.00, 9.98, '2027-06-06', '2025-09-06', 'Inventory', '2025-09-06 14:42:48', '2025-09-06 14:43:14');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_location`
--

CREATE TABLE `tbl_location` (
  `location_id` int(11) NOT NULL,
  `location_name` varchar(255) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_location`
--

INSERT INTO `tbl_location` (`location_id`, `location_name`, `status`) VALUES
(2, 'Warehouse', 'active'),
(3, 'Pharmacy', 'active'),
(4, 'Convenience Store', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_missing_items_requests`
--

CREATE TABLE `tbl_missing_items_requests` (
  `request_id` int(11) NOT NULL,
  `purchase_header_id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL,
  `request_date` datetime DEFAULT current_timestamp(),
  `status` enum('pending','in_progress','resolved','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `resolved_date` datetime DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `supplier_notified` tinyint(1) DEFAULT 0,
  `notification_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_pos_sales_details`
--

CREATE TABLE `tbl_pos_sales_details` (
  `sales_details_id` int(11) NOT NULL,
  `sales_header_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_pos_sales_details`
--

INSERT INTO `tbl_pos_sales_details` (`sales_details_id`, `sales_header_id`, `product_id`, `quantity`, `price`) VALUES
(1, 1, 75, 1, 20),
(2, 2, 75, 1, 20),
(3, 3, 75, 2, 20),
(4, 4, 75, 1, 20),
(5, 5, 75, 1, 20),
(6, 6, 75, 2, 20),
(7, 7, 75, 1, 20);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_pos_sales_header`
--

CREATE TABLE `tbl_pos_sales_header` (
  `sales_header_id` int(11) NOT NULL,
  `transaction_id` int(11) NOT NULL,
  `total_amount` float NOT NULL,
  `reference_number` varchar(255) NOT NULL,
  `terminal_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_pos_sales_header`
--

INSERT INTO `tbl_pos_sales_header` (`sales_header_id`, `transaction_id`, `total_amount`, `reference_number`, `terminal_id`) VALUES
(1, 1, 20, 'TXN498440', 2),
(2, 2, 20, 'TXN256427', 2),
(3, 3, 40, 'TXN798124', 2),
(4, 4, 20, 'TXN629015', 2),
(5, 5, 20, 'TXN931133', 2),
(6, 6, 40, 'TXN855078', 2),
(7, 7, 20, '100010201gcash', 2);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_pos_terminal`
--

CREATE TABLE `tbl_pos_terminal` (
  `terminal_id` int(11) NOT NULL,
  `terminal_name` varchar(255) NOT NULL,
  `shift_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_pos_terminal`
--

INSERT INTO `tbl_pos_terminal` (`terminal_id`, `terminal_name`, `shift_id`) VALUES
(1, 'Convenience POS', 1),
(2, 'Inventory Terminal', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_pos_transaction`
--

CREATE TABLE `tbl_pos_transaction` (
  `transaction_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `emp_id` int(11) NOT NULL,
  `payment_type` enum('cash','card','Gcash') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_pos_transaction`
--

INSERT INTO `tbl_pos_transaction` (`transaction_id`, `date`, `time`, `emp_id`, `payment_type`) VALUES
(1, '2025-09-01', '15:24:58', 1, 'cash'),
(2, '2025-09-01', '15:37:36', 1, 'cash'),
(3, '2025-09-01', '22:43:18', 1, 'cash'),
(4, '2025-09-01', '22:57:09', 1, 'cash'),
(5, '2025-09-01', '23:02:11', 1, 'cash'),
(6, '2025-09-01', '23:17:35', 1, 'cash'),
(7, '2025-09-01', '23:23:26', 1, 'Gcash');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_product`
--

CREATE TABLE `tbl_product` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `barcode` bigint(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `prescription` varchar(1) DEFAULT NULL,
  `bulk` tinyint(1) DEFAULT 0,
  `expiration` date DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `srp` decimal(10,2) DEFAULT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `location_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
  `stock_status` varchar(20) DEFAULT 'in stock',
  `date_added` date DEFAULT curdate(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_product`
--

INSERT INTO `tbl_product` (`product_id`, `product_name`, `category`, `barcode`, `description`, `prescription`, `bulk`, `expiration`, `quantity`, `unit_price`, `srp`, `brand_id`, `supplier_id`, `location_id`, `batch_id`, `status`, `stock_status`, `date_added`, `created_at`) VALUES
(91, 'Tuna', 'Prescription Medicines', 9002755739618, 'makaon', '0', 1, '2027-07-14', 100, 7.00, 7.00, 27, 3, 2, 108, 'active', 'in stock', '2025-09-06', '2025-09-06 09:24:39'),
(92, 'amoxiciline', 'Prescription Medicines', 9556340902104, 'medicine', '1', 1, '2027-06-06', 90, 13.00, 13.00, 25, 3, 2, 111, 'active', 'in stock', '2025-09-06', '2025-09-06 09:24:39'),
(93, 'Tuna', 'Prescription Medicines', 9002755739618, 'makaon', '0', 1, '2027-07-14', 20, 7.00, NULL, 27, 3, 4, 108, 'active', 'in stock', '2025-09-06', '2025-09-06 09:26:00'),
(94, 'amoxiciline', 'Prescription Medicines', 9556340902104, 'medicine', '1', 1, '2025-09-26', 10, 13.00, NULL, 25, 3, 3, 108, 'active', 'low stock', '2025-09-06', '2025-09-06 09:27:21'),
(95, 'amoxiciline', 'Prescription Medicines', 9556340902104, 'medicine', '1', 1, '2027-07-06', 600, 13.00, NULL, 25, 3, 4, 109, 'active', 'in stock', '2025-09-06', '2025-09-06 09:53:37'),
(96, 'amoxiciline', 'Prescription Medicines', 9556340902104, 'medicine', '1', 1, '2027-07-06', 10, 13.00, NULL, 25, 3, 3, 109, 'active', 'low stock', '2025-09-06', '2025-09-06 10:03:40'),
(97, 'amoxiciline', 'Prescription Medicines', 9556340902104, 'medicine', '1', 1, '2029-11-06', 40, 13.00, NULL, 25, 3, 4, 110, 'active', 'in stock', '2025-09-06', '2025-09-06 10:15:58'),
(98, 'amoxiciline', 'Prescription Medicines', 9556340902104, 'medicine', '1', 1, '2027-06-06', 50, 13.00, NULL, 25, 3, 4, 111, 'active', 'in stock', '2025-09-06', '2025-09-06 14:43:14');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_purchase_order_approval`
--

CREATE TABLE `tbl_purchase_order_approval` (
  `approval_id` int(11) NOT NULL,
  `purchase_header_id` int(11) NOT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approval_date` datetime DEFAULT NULL,
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approval_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_purchase_order_approval`
--

INSERT INTO `tbl_purchase_order_approval` (`approval_id`, `purchase_header_id`, `approved_by`, `approval_date`, `approval_status`, `approval_notes`, `created_at`) VALUES
(10, 47, 21, '2025-09-07 00:16:21', 'approved', 'Purchase order approved via frontend', '2025-09-06 16:16:21'),
(11, 47, 21, '2025-09-07 00:16:40', 'approved', 'Purchase order approved via frontend', '2025-09-06 16:16:40');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_purchase_order_delivery`
--

CREATE TABLE `tbl_purchase_order_delivery` (
  `delivery_id` int(11) NOT NULL,
  `purchase_header_id` int(11) NOT NULL,
  `expected_delivery_date` date NOT NULL,
  `actual_delivery_date` date DEFAULT NULL,
  `delivery_status` enum('pending','in_transit','delivered','partial','cancelled') DEFAULT 'pending',
  `delivery_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_purchase_order_dtl`
--

CREATE TABLE `tbl_purchase_order_dtl` (
  `purchase_dtl_id` int(11) NOT NULL,
  `purchase_header_id` int(11) NOT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_type` varchar(50) DEFAULT 'pieces',
  `received_qty` int(11) DEFAULT 0,
  `missing_qty` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_purchase_order_dtl`
--

INSERT INTO `tbl_purchase_order_dtl` (`purchase_dtl_id`, `purchase_header_id`, `product_name`, `quantity`, `unit_type`, `received_qty`, `missing_qty`) VALUES
(35, 47, 'sample1', 100, 'bulk', 100, 0);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_purchase_order_header`
--

CREATE TABLE `tbl_purchase_order_header` (
  `purchase_header_id` int(11) NOT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  `date` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `time` time NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `status` enum('delivered','partial_delivery','pending_fulfillment','complete','approved','return','unpaid','to_ship','shipped','to_review') NOT NULL DEFAULT 'delivered',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_purchase_order_header`
--

INSERT INTO `tbl_purchase_order_header` (`purchase_header_id`, `po_number`, `date`, `expected_delivery_date`, `time`, `supplier_id`, `total_amount`, `created_by`, `status`, `notes`) VALUES
(47, 'PO-000047', '2025-09-07', '2025-09-08', '00:16:02', 2, 0.00, 21, 'approved', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_purchase_receiving_dtl`
--

CREATE TABLE `tbl_purchase_receiving_dtl` (
  `receiving_dtl_id` int(11) NOT NULL,
  `receiving_id` int(11) NOT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `ordered_qty` int(11) NOT NULL,
  `received_qty` int(11) NOT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_purchase_receiving_dtl`
--

INSERT INTO `tbl_purchase_receiving_dtl` (`receiving_dtl_id`, `receiving_id`, `product_name`, `ordered_qty`, `received_qty`, `notes`) VALUES
(19, 33, 'Product', 100, 90, 'Received: 90, Missing: 10, Status: partial');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_purchase_receiving_header`
--

CREATE TABLE `tbl_purchase_receiving_header` (
  `receiving_id` int(11) NOT NULL,
  `purchase_header_id` int(11) NOT NULL,
  `receiving_date` date NOT NULL,
  `receiving_time` time NOT NULL,
  `received_by` int(11) NOT NULL,
  `delivery_receipt_no` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('pending','completed','partial') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_purchase_receiving_header`
--

INSERT INTO `tbl_purchase_receiving_header` (`receiving_id`, `purchase_header_id`, `receiving_date`, `receiving_time`, `received_by`, `delivery_receipt_no`, `notes`, `status`, `created_at`) VALUES
(33, 47, '2025-09-07', '00:16:11', 21, NULL, NULL, 'partial', '2025-09-06 16:16:11'),
(34, 47, '2025-09-07', '00:16:40', 21, '1001', 'SAMPLE', 'pending', '2025-09-06 16:16:40');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_purchase_return_dtl`
--

CREATE TABLE `tbl_purchase_return_dtl` (
  `return_dtl_id` int(11) NOT NULL,
  `return_header_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_purchase_return_header`
--

CREATE TABLE `tbl_purchase_return_header` (
  `return_header_id` int(11) NOT NULL,
  `return_date` date NOT NULL,
  `total_return_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL,
  `reason` text DEFAULT NULL,
  `supplier_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_role`
--

CREATE TABLE `tbl_role` (
  `role_id` int(11) NOT NULL,
  `role` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_role`
--

INSERT INTO `tbl_role` (`role_id`, `role`) VALUES
(1, 'admin'),
(2, 'pharmacist'),
(3, 'cashier'),
(4, 'inventory');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_shift`
--

CREATE TABLE `tbl_shift` (
  `shift_id` int(11) NOT NULL,
  `shifts` varchar(255) NOT NULL,
  `time` time NOT NULL,
  `end_time` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_shift`
--

INSERT INTO `tbl_shift` (`shift_id`, `shifts`, `time`, `end_time`) VALUES
(1, 'shift1', '06:00:00', '02:00:00'),
(2, 'shift2', '02:00:00', '10:00:00'),
(3, 'shift3', '10:00:00', '06:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_stock_movements`
--

CREATE TABLE `tbl_stock_movements` (
  `movement_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `movement_type` enum('IN','OUT','ADJUSTMENT') NOT NULL,
  `quantity` int(11) NOT NULL,
  `remaining_quantity` int(11) NOT NULL DEFAULT 0,
  `unit_cost` decimal(10,2) NOT NULL,
  `expiration_date` date DEFAULT NULL,
  `movement_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `reference_no` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` varchar(100) DEFAULT 'admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_stock_movements`
--

INSERT INTO `tbl_stock_movements` (`movement_id`, `product_id`, `batch_id`, `movement_type`, `quantity`, `remaining_quantity`, `unit_cost`, `expiration_date`, `movement_date`, `reference_no`, `notes`, `created_by`) VALUES
(83, 92, 109, 'IN', 50, 640, 0.00, '2027-07-06', '2025-09-06 09:53:00', 'BR-20250906-175300', 'Stock added: +50 units. Old: 590, New: 640', 'Inventory'),
(84, 92, 110, 'IN', 50, 80, 0.00, '2029-11-06', '2025-09-06 10:15:23', 'BR-20250906-181523', 'Stock added: +50 units. Old: 30, New: 80', 'Inventory'),
(85, 92, 111, 'IN', 100, 140, 0.00, '2027-06-06', '2025-09-06 14:42:48', 'BR-20250906-224248', 'Stock added: +100 units. Old: 40, New: 140', 'Inventory');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_stock_summary`
--

CREATE TABLE `tbl_stock_summary` (
  `summary_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `available_quantity` int(11) NOT NULL DEFAULT 0,
  `reserved_quantity` int(11) NOT NULL DEFAULT 0,
  `total_quantity` int(11) NOT NULL DEFAULT 0,
  `unit_cost` decimal(10,2) NOT NULL,
  `srp` decimal(10,2) DEFAULT NULL COMMENT 'Suggested Retail Price for this batch',
  `expiration_date` date DEFAULT NULL,
  `batch_reference` varchar(50) DEFAULT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_supplier`
--

CREATE TABLE `tbl_supplier` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(255) NOT NULL,
  `supplier_address` varchar(255) NOT NULL,
  `supplier_contact` varchar(20) NOT NULL,
  `supplier_email` varchar(255) DEFAULT NULL,
  `order_level` int(11) NOT NULL,
  `primary_phone` varchar(20) DEFAULT NULL,
  `primary_email` varchar(100) DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `contact_title` varchar(100) DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT NULL,
  `lead_time_days` int(11) DEFAULT NULL,
  `credit_rating` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_supplier`
--

INSERT INTO `tbl_supplier` (`supplier_id`, `supplier_name`, `supplier_address`, `supplier_contact`, `supplier_email`, `order_level`, `primary_phone`, `primary_email`, `contact_person`, `contact_title`, `payment_terms`, `lead_time_days`, `credit_rating`, `notes`, `status`, `created_at`, `updated_at`) VALUES
(1, 'United Laboratories, Inc. (Unilab)', '66 United St., Mandaluyong City, Philippines', '8721-1234', 'info@unilab.com.ph', 100, '8721-1234', 'orders@unilab.com.ph', 'Maria Santos', 'Key Account Manager', '30 days', 7, 'A', 'Leading pharma supplier in PH', 'active', '2025-08-08 02:43:47', '2025-08-08 02:43:47'),
(2, 'Procter & Gamble Philippines', '6750 Ayala Ave., Makati City, Philippines', '8890-8888', 'pgphilippines@pg.com', 100, '8890-8888', 'orders@pg.com', 'John Reyes', 'Sales Director', '30 days', 10, 'A', 'FMCG giant, hygiene and home care products', 'active', '2025-08-08 02:43:47', '2025-08-08 02:43:47'),
(3, 'Monde Nissin Corporation', '23F Asia Tower, Benavidez corner Paseo de Roxas, Makati City', '8847-0888', 'info@monde.com.ph', 100, '8847-0888', 'orders@monde.com.ph', 'Ana Cruz', 'Distributor Relations', '15 days', 5, 'A', 'Snack and instant food supplier', 'active', '2025-08-08 02:43:47', '2025-08-08 02:43:47');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_transfer_batch_details`
--

CREATE TABLE `tbl_transfer_batch_details` (
  `id` int(11) NOT NULL,
  `transfer_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `batch_reference` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `srp` decimal(10,2) DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_transfer_batch_details`
--

INSERT INTO `tbl_transfer_batch_details` (`id`, `transfer_id`, `product_id`, `batch_id`, `batch_reference`, `quantity`, `srp`, `expiration_date`, `created_at`) VALUES
(21, 52, 0, 108, 'BR-20250906-172303', 20, NULL, '2027-07-14', '2025-09-06 09:26:00'),
(23, 53, 0, 108, 'BR-20250906-172303', 10, NULL, '2027-07-14', '2025-09-06 09:27:21'),
(25, 54, 0, 108, 'BR-20250906-172303', 590, NULL, '2027-07-14', '2025-09-06 09:53:37'),
(26, 54, 0, 109, 'BR-20250906-175300', 10, NULL, '2027-07-06', '2025-09-06 09:53:37'),
(28, 55, 0, 109, 'BR-20250906-175300', 10, NULL, '2027-07-06', '2025-09-06 10:03:40'),
(30, 56, 0, 109, 'BR-20250906-175300', 30, NULL, '2027-07-06', '2025-09-06 10:15:58'),
(31, 56, 0, 110, 'BR-20250906-181523', 10, NULL, '2029-11-06', '2025-09-06 10:15:58'),
(37, 57, 92, 110, 'BR-20250906-181523', 40, 10.00, '2029-11-06', '2025-09-06 14:43:14'),
(38, 57, 92, 111, 'BR-20250906-224248', 10, 9.98, '2027-06-06', '2025-09-06 14:43:14');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_transfer_dtl`
--

CREATE TABLE `tbl_transfer_dtl` (
  `transfer_dtl_id` int(11) NOT NULL,
  `transfer_header_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_transfer_dtl`
--

INSERT INTO `tbl_transfer_dtl` (`transfer_dtl_id`, `transfer_header_id`, `product_id`, `qty`) VALUES
(44, 52, 91, 20),
(45, 53, 92, 10),
(46, 54, 92, 600),
(47, 55, 92, 10),
(48, 56, 92, 40),
(49, 57, 92, 50);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_transfer_header`
--

CREATE TABLE `tbl_transfer_header` (
  `transfer_header_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `delivery_date` date DEFAULT NULL,
  `source_location_id` int(11) NOT NULL,
  `destination_location_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_transfer_header`
--

INSERT INTO `tbl_transfer_header` (`transfer_header_id`, `date`, `delivery_date`, `source_location_id`, `destination_location_id`, `employee_id`, `status`) VALUES
(52, '2025-09-06', NULL, 2, 4, 1, 'approved'),
(53, '2025-09-06', NULL, 2, 3, 1, 'approved'),
(54, '2025-09-06', NULL, 2, 4, 1, 'approved'),
(55, '2025-09-06', NULL, 2, 3, 1, 'approved'),
(56, '2025-09-06', NULL, 2, 4, 1, 'approved'),
(57, '2025-09-06', NULL, 2, 4, 1, 'approved');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_transfer_log`
--

CREATE TABLE `tbl_transfer_log` (
  `transfer_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `from_location` varchar(100) DEFAULT NULL,
  `to_location` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `transfer_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_transfer_log`
--

INSERT INTO `tbl_transfer_log` (`transfer_id`, `product_id`, `product_name`, `from_location`, `to_location`, `quantity`, `transfer_date`, `created_at`) VALUES
(47, 91, 'Tuna', 'Warehouse', 'Convenience Store', 20, '2025-09-06', '2025-09-06 09:26:00'),
(48, 92, 'amoxiciline', 'Warehouse', 'Pharmacy', 10, '2025-09-06', '2025-09-06 09:27:21'),
(49, 92, 'amoxiciline', 'Warehouse', 'Convenience Store', 600, '2025-09-06', '2025-09-06 09:53:37'),
(50, 92, 'amoxiciline', 'Warehouse', 'Pharmacy', 10, '2025-09-06', '2025-09-06 10:03:40'),
(51, 92, 'amoxiciline', 'Warehouse', 'Convenience Store', 40, '2025-09-06', '2025-09-06 10:15:58'),
(52, 92, 'amoxiciline', 'Warehouse', 'Convenience Store', 50, '2025-09-06', '2025-09-06 14:43:14');

-- --------------------------------------------------------

--
-- Table structure for table `v_expiring_products`
--

CREATE TABLE `v_expiring_products` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `barcode` bigint(20) DEFAULT NULL,
  `available_quantity` int(11) DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `days_until_expiry` int(7) DEFAULT NULL,
  `batch_reference` varchar(50) DEFAULT NULL,
  `batch_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `v_fifo_stock`
--

CREATE TABLE `v_fifo_stock` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `barcode` bigint(20) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `batch_reference` varchar(50) DEFAULT NULL,
  `available_quantity` int(11) DEFAULT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `batch_date` date DEFAULT NULL,
  `fifo_order` bigint(21) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `v_product_summary`
--

CREATE TABLE `v_product_summary` (
  `product_name` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `barcode` bigint(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive','archived') DEFAULT NULL,
  `total_product_rows` bigint(21) DEFAULT NULL,
  `total_quantity` decimal(32,0) DEFAULT NULL,
  `locations_count` bigint(21) DEFAULT NULL,
  `location_breakdown` mediumtext DEFAULT NULL,
  `earliest_expiration` date DEFAULT NULL,
  `latest_expiration` date DEFAULT NULL,
  `average_unit_price` decimal(14,6) DEFAULT NULL,
  `min_srp` decimal(10,2) DEFAULT NULL,
  `max_srp` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_activity_log`
--
ALTER TABLE `tbl_activity_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tbl_adjustment_details`
--
ALTER TABLE `tbl_adjustment_details`
  ADD PRIMARY KEY (`adjustment_id`);

--
-- Indexes for table `tbl_adjustment_header`
--
ALTER TABLE `tbl_adjustment_header`
  ADD PRIMARY KEY (`adjustment_id`);

--
-- Indexes for table `tbl_archive`
--
ALTER TABLE `tbl_archive`
  ADD PRIMARY KEY (`archive_id`);

--
-- Indexes for table `tbl_batch`
--
ALTER TABLE `tbl_batch`
  ADD PRIMARY KEY (`batch_id`);

--
-- Indexes for table `tbl_brand`
--
ALTER TABLE `tbl_brand`
  ADD PRIMARY KEY (`brand_id`);

--
-- Indexes for table `tbl_category`
--
ALTER TABLE `tbl_category`
  ADD PRIMARY KEY (`category_id`);

--
-- Indexes for table `tbl_discount`
--
ALTER TABLE `tbl_discount`
  ADD PRIMARY KEY (`discount_id`);

--
-- Indexes for table `tbl_employee`
--
ALTER TABLE `tbl_employee`
  ADD PRIMARY KEY (`emp_id`);

--
-- Indexes for table `tbl_fifo_stock`
--
ALTER TABLE `tbl_fifo_stock`
  ADD PRIMARY KEY (`fifo_id`);

--
-- Indexes for table `tbl_location`
--
ALTER TABLE `tbl_location`
  ADD PRIMARY KEY (`location_id`);

--
-- Indexes for table `tbl_missing_items_requests`
--
ALTER TABLE `tbl_missing_items_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `purchase_header_id` (`purchase_header_id`),
  ADD KEY `status` (`status`),
  ADD KEY `requested_by` (`requested_by`);

--
-- Indexes for table `tbl_pos_sales_details`
--
ALTER TABLE `tbl_pos_sales_details`
  ADD PRIMARY KEY (`sales_details_id`);

--
-- Indexes for table `tbl_pos_sales_header`
--
ALTER TABLE `tbl_pos_sales_header`
  ADD PRIMARY KEY (`sales_header_id`);

--
-- Indexes for table `tbl_pos_terminal`
--
ALTER TABLE `tbl_pos_terminal`
  ADD PRIMARY KEY (`terminal_id`);

--
-- Indexes for table `tbl_pos_transaction`
--
ALTER TABLE `tbl_pos_transaction`
  ADD PRIMARY KEY (`transaction_id`);

--
-- Indexes for table `tbl_product`
--
ALTER TABLE `tbl_product`
  ADD PRIMARY KEY (`product_id`);

--
-- Indexes for table `tbl_purchase_order_approval`
--
ALTER TABLE `tbl_purchase_order_approval`
  ADD PRIMARY KEY (`approval_id`);

--
-- Indexes for table `tbl_purchase_order_delivery`
--
ALTER TABLE `tbl_purchase_order_delivery`
  ADD PRIMARY KEY (`delivery_id`);

--
-- Indexes for table `tbl_purchase_order_dtl`
--
ALTER TABLE `tbl_purchase_order_dtl`
  ADD PRIMARY KEY (`purchase_dtl_id`);

--
-- Indexes for table `tbl_purchase_order_header`
--
ALTER TABLE `tbl_purchase_order_header`
  ADD PRIMARY KEY (`purchase_header_id`);

--
-- Indexes for table `tbl_purchase_receiving_dtl`
--
ALTER TABLE `tbl_purchase_receiving_dtl`
  ADD PRIMARY KEY (`receiving_dtl_id`);

--
-- Indexes for table `tbl_purchase_receiving_header`
--
ALTER TABLE `tbl_purchase_receiving_header`
  ADD PRIMARY KEY (`receiving_id`);

--
-- Indexes for table `tbl_purchase_return_dtl`
--
ALTER TABLE `tbl_purchase_return_dtl`
  ADD PRIMARY KEY (`return_dtl_id`);

--
-- Indexes for table `tbl_purchase_return_header`
--
ALTER TABLE `tbl_purchase_return_header`
  ADD PRIMARY KEY (`return_header_id`);

--
-- Indexes for table `tbl_role`
--
ALTER TABLE `tbl_role`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `tbl_shift`
--
ALTER TABLE `tbl_shift`
  ADD PRIMARY KEY (`shift_id`);

--
-- Indexes for table `tbl_stock_movements`
--
ALTER TABLE `tbl_stock_movements`
  ADD PRIMARY KEY (`movement_id`);

--
-- Indexes for table `tbl_stock_summary`
--
ALTER TABLE `tbl_stock_summary`
  ADD PRIMARY KEY (`summary_id`);

--
-- Indexes for table `tbl_supplier`
--
ALTER TABLE `tbl_supplier`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indexes for table `tbl_transfer_batch_details`
--
ALTER TABLE `tbl_transfer_batch_details`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_transfer_batch` (`transfer_id`,`product_id`,`batch_id`,`batch_reference`),
  ADD KEY `transfer_id` (`transfer_id`),
  ADD KEY `batch_id` (`batch_id`),
  ADD KEY `idx_transfer_product` (`transfer_id`,`product_id`);

--
-- Indexes for table `tbl_transfer_dtl`
--
ALTER TABLE `tbl_transfer_dtl`
  ADD PRIMARY KEY (`transfer_dtl_id`);

--
-- Indexes for table `tbl_transfer_header`
--
ALTER TABLE `tbl_transfer_header`
  ADD PRIMARY KEY (`transfer_header_id`);

--
-- Indexes for table `tbl_transfer_log`
--
ALTER TABLE `tbl_transfer_log`
  ADD PRIMARY KEY (`transfer_id`);

--
-- Indexes for table `v_expiring_products`
--
ALTER TABLE `v_expiring_products`
  ADD PRIMARY KEY (`product_id`);

--
-- Indexes for table `v_fifo_stock`
--
ALTER TABLE `v_fifo_stock`
  ADD PRIMARY KEY (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_activity_log`
--
ALTER TABLE `tbl_activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_adjustment_details`
--
ALTER TABLE `tbl_adjustment_details`
  MODIFY `adjustment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_adjustment_header`
--
ALTER TABLE `tbl_adjustment_header`
  MODIFY `adjustment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_archive`
--
ALTER TABLE `tbl_archive`
  MODIFY `archive_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_batch`
--
ALTER TABLE `tbl_batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `tbl_brand`
--
ALTER TABLE `tbl_brand`
  MODIFY `brand_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `tbl_category`
--
ALTER TABLE `tbl_category`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `tbl_discount`
--
ALTER TABLE `tbl_discount`
  MODIFY `discount_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_employee`
--
ALTER TABLE `tbl_employee`
  MODIFY `emp_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_fifo_stock`
--
ALTER TABLE `tbl_fifo_stock`
  MODIFY `fifo_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `tbl_location`
--
ALTER TABLE `tbl_location`
  MODIFY `location_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_missing_items_requests`
--
ALTER TABLE `tbl_missing_items_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_pos_sales_details`
--
ALTER TABLE `tbl_pos_sales_details`
  MODIFY `sales_details_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_pos_sales_header`
--
ALTER TABLE `tbl_pos_sales_header`
  MODIFY `sales_header_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_pos_terminal`
--
ALTER TABLE `tbl_pos_terminal`
  MODIFY `terminal_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_pos_transaction`
--
ALTER TABLE `tbl_pos_transaction`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_product`
--
ALTER TABLE `tbl_product`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=99;

--
-- AUTO_INCREMENT for table `tbl_purchase_order_approval`
--
ALTER TABLE `tbl_purchase_order_approval`
  MODIFY `approval_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `tbl_purchase_order_delivery`
--
ALTER TABLE `tbl_purchase_order_delivery`
  MODIFY `delivery_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_purchase_order_dtl`
--
ALTER TABLE `tbl_purchase_order_dtl`
  MODIFY `purchase_dtl_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `tbl_purchase_order_header`
--
ALTER TABLE `tbl_purchase_order_header`
  MODIFY `purchase_header_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `tbl_purchase_receiving_dtl`
--
ALTER TABLE `tbl_purchase_receiving_dtl`
  MODIFY `receiving_dtl_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `tbl_purchase_receiving_header`
--
ALTER TABLE `tbl_purchase_receiving_header`
  MODIFY `receiving_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `tbl_purchase_return_dtl`
--
ALTER TABLE `tbl_purchase_return_dtl`
  MODIFY `return_dtl_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_purchase_return_header`
--
ALTER TABLE `tbl_purchase_return_header`
  MODIFY `return_header_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_role`
--
ALTER TABLE `tbl_role`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_shift`
--
ALTER TABLE `tbl_shift`
  MODIFY `shift_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_stock_movements`
--
ALTER TABLE `tbl_stock_movements`
  MODIFY `movement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=86;

--
-- AUTO_INCREMENT for table `tbl_stock_summary`
--
ALTER TABLE `tbl_stock_summary`
  MODIFY `summary_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `tbl_supplier`
--
ALTER TABLE `tbl_supplier`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_transfer_batch_details`
--
ALTER TABLE `tbl_transfer_batch_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT for table `tbl_transfer_dtl`
--
ALTER TABLE `tbl_transfer_dtl`
  MODIFY `transfer_dtl_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `tbl_transfer_header`
--
ALTER TABLE `tbl_transfer_header`
  MODIFY `transfer_header_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT for table `tbl_transfer_log`
--
ALTER TABLE `tbl_transfer_log`
  MODIFY `transfer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `v_expiring_products`
--
ALTER TABLE `v_expiring_products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `v_fifo_stock`
--
ALTER TABLE `v_fifo_stock`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tbl_missing_items_requests`
--
ALTER TABLE `tbl_missing_items_requests`
  ADD CONSTRAINT `fk_missing_items_employee` FOREIGN KEY (`requested_by`) REFERENCES `tbl_employee` (`emp_id`),
  ADD CONSTRAINT `fk_missing_items_purchase_header` FOREIGN KEY (`purchase_header_id`) REFERENCES `tbl_purchase_order_header` (`purchase_header_id`);

--
-- Constraints for table `tbl_transfer_batch_details`
--
ALTER TABLE `tbl_transfer_batch_details`
  ADD CONSTRAINT `fk_tbd_header` FOREIGN KEY (`transfer_id`) REFERENCES `tbl_transfer_header` (`transfer_header_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
