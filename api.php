<?php
require_once 'config.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && !empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($action) {
        case 'register':
            handleRegister($input, $conn);
            break;
        case 'login':
            handleLogin($input, $conn);
            break;
        case 'logout':
            handleLogout();
            break;
        case 'get_dashboard_data':
            getDashboardData($conn);
            break;
        case 'save_prediction':
            savePrediction($input, $conn);
            break;
        case 'get_predictions':
            getPredictions($conn);
            break;
        case 'update_profile':
            updateProfile($input, $conn);
            break;
        case 'get_profile':
            getProfile($conn);
            break;
        default:
            sendResponse(false, 'Invalid action');
    }
}

function handleRegister($data, $conn) {
    if (!isset($data['name'], $data['email'], $data['phone'], $data['dob'], $data['gender'], $data['password'])) {
        sendResponse(false, 'Missing required fields');
    }
    
    $name = $conn->real_escape_string($data['name']);
    $email = $conn->real_escape_string($data['email']);
    $phone = $conn->real_escape_string($data['phone']);
    $dob = $conn->real_escape_string($data['dob']);
    $gender = $conn->real_escape_string($data['gender']);
    $password = password_hash($data['password'], PASSWORD_BCRYPT);
    
    $check = $conn->query("SELECT id FROM users WHERE email = '$email'");
    if ($check->num_rows > 0) {
        sendResponse(false, 'Email already registered');
    }
    
    if ($conn->query("INSERT INTO users (name, email, phone, dob, gender, password) VALUES ('$name', '$email', '$phone', '$dob', '$gender', '$password')")) {
        $user_id = $conn->insert_id;
        $conn->query("INSERT INTO user_health (user_id, height, weight, blood_type) VALUES ($user_id, 0, 0, '')");
        sendResponse(true, 'Registration successful');
    } else {
        sendResponse(false, 'Registration failed');
    }
}

function handleLogin($data, $conn) {
    if (!isset($data['email'], $data['password'])) {
        sendResponse(false, 'Missing email or password');
    }
    
    $email = $conn->real_escape_string($data['email']);
    $result = $conn->query("SELECT id, name, email, phone, dob, gender, password FROM users WHERE email = '$email'");
    
    if ($result->num_rows === 0) {
        sendResponse(false, 'Invalid credentials');
    }
    
    $user = $result->fetch_assoc();
    if (password_verify($data['password'], $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        sendResponse(true, 'Login successful', $user);
    } else {
        sendResponse(false, 'Invalid password');
    }
}

function handleLogout() {
    session_destroy();
    sendResponse(true, 'Logged out');
}

function getDashboardData($conn) {
    $user_id = checkUserLogin();
    if (!$user_id) sendResponse(false, 'Not logged in');
    
    $user = $conn->query("SELECT name, email, phone, dob, gender FROM users WHERE id = $user_id")->fetch_assoc();
    $health = $conn->query("SELECT * FROM user_health WHERE user_id = $user_id")->fetch_assoc();
    $stats = $conn->query("SELECT COUNT(*) as total FROM predictions WHERE user_id = $user_id")->fetch_assoc();
    $recent = $conn->query("SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, assessment_type, risk_level FROM predictions WHERE user_id = $user_id ORDER BY created_at DESC LIMIT 3");
    $recent_data = [];
    while ($row = $recent->fetch_assoc()) {
        $recent_data[] = $row;
    }
    
    sendResponse(true, 'Data retrieved', [
        'user' => $user,
        'health' => $health,
        'stats' => $stats,
        'recent' => $recent_data
    ]);
}

function savePrediction($data, $conn) {
    $user_id = checkUserLogin();
    if (!$user_id) sendResponse(false, 'Not logged in');
    
    $pred_json = $conn->real_escape_string(json_encode($data['predictions']));
    $assessment = $conn->real_escape_string($data['assessment_type']);
    $algorithm = $conn->real_escape_string($data['algorithm']);
    $max_risk = max($data['predictions']);
    $risk_level = ($max_risk > 0.7) ? 'High' : (($max_risk > 0.4) ? 'Medium' : 'Low');
    
    $age = intval($data['age']);
    $gender = $conn->real_escape_string($data['gender']);
    $bmi = floatval($data['bmi']);
    $bp = intval($data['blood_pressure']);
    $chol = intval($data['cholesterol']);
    $sugar = intval($data['blood_sugar']);
    
    if ($conn->query("INSERT INTO predictions (user_id, assessment_type, predictions, algorithm, risk_level, age, gender, bmi, blood_pressure, cholesterol, blood_sugar) VALUES ($user_id, '$assessment', '$pred_json', '$algorithm', '$risk_level', $age, '$gender', $bmi, $bp, $chol, $sugar)")) {
        sendResponse(true, 'Prediction saved', ['risk_level' => $risk_level]);
    } else {
        sendResponse(false, 'Save failed');
    }
}

function getPredictions($conn) {
    $user_id = checkUserLogin();
    if (!$user_id) sendResponse(false, 'Not logged in');
    
    $result = $conn->query("SELECT * FROM predictions WHERE user_id = $user_id ORDER BY created_at DESC LIMIT 10");
    $predictions = [];
    while ($row = $result->fetch_assoc()) {
        $predictions[] = $row;
    }
    sendResponse(true, 'Retrieved', $predictions);
}

function getProfile($conn) {
    $user_id = checkUserLogin();
    if (!$user_id) sendResponse(false, 'Not logged in');
    
    $user = $conn->query("SELECT * FROM users WHERE id = $user_id")->fetch_assoc();
    $health = $conn->query("SELECT * FROM user_health WHERE user_id = $user_id")->fetch_assoc();
    sendResponse(true, 'Retrieved', ['user' => $user, 'health' => $health]);
}

function updateProfile($data, $conn) {
    $user_id = checkUserLogin();
    if (!$user_id) sendResponse(false, 'Not logged in');
    
    if (isset($data['name'])) {
        $name = $conn->real_escape_string($data['name']);
        $phone = $conn->real_escape_string($data['phone']);
        $conn->query("UPDATE users SET name = '$name', phone = '$phone' WHERE id = $user_id");
    }
    
    if (isset($data['height'])) {
        $height = floatval($data['height']);
        $weight = floatval($data['weight']);
        $blood = $conn->real_escape_string($data['blood_type']);
        $conn->query("UPDATE user_health SET height = $height, weight = $weight, blood_type = '$blood' WHERE user_id = $user_id");
    }
    
    sendResponse(true, 'Profile updated');
}
?>