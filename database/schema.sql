CREATE DATABASE IF NOT EXISTS gym_management;
USE gym_management;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    age INT,
    height DOUBLE,
    weight DOUBLE,
    goal VARCHAR(255),
    bmi DOUBLE,
    workout_plan TEXT,
    diet_tips TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_streak INT DEFAULT 0,
    last_workout_date DATE
);

-- Daily Goals Table
CREATE TABLE IF NOT EXISTS daily_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    calories INT,
    water_intake DOUBLE,
    calories_consumed INT DEFAULT 0,
    water_consumed DOUBLE DEFAULT 0.0,
    workout_completed BOOLEAN DEFAULT FALSE,
    goal_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    muscle_group VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sets INT,
    reps VARCHAR(255)
);

-- Food Entries Table
CREATE TABLE IF NOT EXISTS food_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_item VARCHAR(255) NOT NULL,
    calories INT NOT NULL,
    entry_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Water Logs Table
CREATE TABLE IF NOT EXISTS water_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DOUBLE NOT NULL,
    log_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat Logs Table
CREATE TABLE IF NOT EXISTS chat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    query TEXT NOT NULL,
    reply TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
