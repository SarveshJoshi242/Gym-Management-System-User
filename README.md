# 💪 GymPlus Software

[![Deployment Status: Working](https://img.shields.io/badge/Deployment_Status-Working-brightgreen?style=for-the-badge)](https://gym-management-system-user.vercel.app/)
**Live Demo:** [https://gym-management-system-user.vercel.app/](https://gym-management-system-user.vercel.app/)

GymPlus is a modern, AI-powered gym management dashboard built to track fitness goals, recommend personalized workouts, and maintain a seamless fitness journey. With features ranging from daily calorie tracking to dynamic LLM-generated exercise routines via Google Gemini, GymPlus provides an all-in-one smart interface for health enthusiasts.

---

## ✨ Core Features
- **AI-Powered Exercise Recommendations**: Uses Google's Gemini AI to dynamically generate and "exchange" specific muscle-group workouts on demand.
- **Goal & Progress Tracking**: Real-time calorie and water intake monitoring with interactive visual activity rings.
- **Smart Diet & Workout Planner**: Automated diet tips and workout structures based on user profile and BMI.
- **Modern UI/UX**: Dark mode aesthetic with glassmorphism elements, custom scrollbars, and fluid animations built with vanilla HTML/CSS/JS.
- **Secure Authentication**: Encrypted user credentials using BCrypt.

---

## 🛠️ Tech Stack
- **Backend**: Java, Spring Boot, Spring Data JPA
- **Database**: MySQL 8+
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **AI Integration**: Google Generative AI (Gemini 2.5 Flash API)
- **Build Tool**: Maven

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### 1. Prerequisites
- **Java 21+** installed (`java -version`)
- **Maven** installed (`mvn -version`)
- **MySQL** installed and running on default port `3306`

### 2. Database Setup
1. Log into your local MySQL server:
   ```bash
   mysql -u root -p
   ```
2. Execute the schema script located in the `database/` folder to create the database and tables:
   ```bash
   source database/schema.sql;
   ```

### 3. Application Configuration
1. Navigate to the resources directory:
   ```bash
   cd src/main/resources
   ```
2. Create a copy of the example configuration file:
   ```bash
   cp application.example.properties application.properties
   ```
3. Open `application.properties` and add your secure credentials. Or, you can set the following environment variables on your system:
   - `DB_USERNAME` (default is `root`)
   - `DB_PASSWORD` (your MySQL password)
   - `DB_URL` (default is `jdbc:mysql://localhost:3306/gym_management`)
   - `GEMINI_API_KEY` (your Google Gemini API key)

### 4. Build and Run
1. Return to the root project directory where `pom.xml` is located.
2. Compile and start the Spring Boot application using Maven:
   ```bash
   mvn clean spring-boot:run
   ```
3. The server will start on `http://localhost:8080`.

---

## 💡 Usage Guide
1. Navigate to `http://localhost:8080` in your browser.
2. Register a new account by filling in your height, weight, and fitness goal.
3. Your BMI will be calculated automatically, and initial workout/diet recommendations will be generated.
4. Go to the **Exercises** tab, select a muscle group, and click **Generate New** to see the IronMind AI fetch brand new exercises!
