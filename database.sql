
USE healthcare_ai;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    dob DATE,
    gender ENUM('male', 'female', 'other'),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Health Information Table
CREATE TABLE IF NOT EXISTS user_health (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    height FLOAT DEFAULT 0,
    weight FLOAT DEFAULT 0,
    blood_type VARCHAR(5),
    allergies TEXT,
    chronic_conditions TEXT,
    medications TEXT,
    family_history TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    assessment_type VARCHAR(100),
    predictions JSON,
    algorithm VARCHAR(50),
    risk_level ENUM('Low', 'Medium', 'High'),
    age INT,
    gender VARCHAR(10),
    bmi FLOAT,
    blood_pressure INT,
    cholesterol INT,
    blood_sugar INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (user_id, created_at)
);

-- Health Assessment History Table
CREATE TABLE IF NOT EXISTS assessment_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    assessment_date DATE,
    assessment_type VARCHAR(100),
    risk_level VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_date ON predictions(created_at);