<?php
session_start();

$host = 'localhost';
$db_user = 'root';
$db_password = '';
$db_name = 'healthcare_ai';

$conn = new mysqli($host, $db_user, $db_password, $db_name);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");

function sendResponse($success, $message, $data = null) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

function checkUserLogin() {
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    return $_SESSION['user_id'];
}
?>