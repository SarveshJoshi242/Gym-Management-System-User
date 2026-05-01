package com.gymplus.controller;

import com.gymplus.model.DailyGoal;
import com.gymplus.model.Exercise;
import com.gymplus.model.User;
import com.gymplus.model.ChatLog;
import com.gymplus.model.FoodEntry;
import com.gymplus.model.WaterLog;
import com.gymplus.repository.DailyGoalRepository;
import com.gymplus.repository.ExerciseRepository;
import com.gymplus.repository.UserRepository;
import com.gymplus.repository.ChatLogRepository;
import com.gymplus.repository.FoodEntryRepository;
import com.gymplus.repository.WaterLogRepository;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpEntity;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Since it's all static files, this helps if port differs, though it's served on 8080
public class ApiController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DailyGoalRepository dailyGoalRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;
    
    @Autowired
    private ChatLogRepository chatLogRepository;

    @Autowired
    private FoodEntryRepository foodEntryRepository;

    @Autowired
    private WaterLogRepository waterLogRepository;

    private static final String GEMINI_API_KEY = "AIzaSyAp-BquqDBSRfx27pupORkuLjTquYxuPm0";
    
    private Map<String, Object> successResponse(Object data) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", data);
        return res;
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", false);
        res.put("message", message);
        return res;
    }

    private DailyGoal getOrCreateDailyGoal(User user) {
        LocalDate today = LocalDate.now();
        Optional<DailyGoal> existing = dailyGoalRepository.findByUserIdAndGoalDate(user.getId(), today);
        DailyGoal goal;
        
        if (existing.isPresent()) {
            goal = existing.get();
        } else {
            goal = new DailyGoal();
            goal.setUserId(user.getId());
            goal.setGoalDate(today);
            goal.setWorkoutCompleted(false);
            
            if ("fat_loss".equals(user.getGoal())) {
                goal.setCalories(1800);
                goal.setWaterIntake(3.5);
            } else if ("weight_gain".equals(user.getGoal())) {
                goal.setCalories(3200);
                goal.setWaterIntake(3.0);
            } else {
                goal.setCalories(2400);
                goal.setWaterIntake(2.5);
            }
        }
        
        List<FoodEntry> foods = foodEntryRepository.findByUserIdAndEntryDate(user.getId(), today);
        int totalCals = foods.stream().mapToInt(FoodEntry::getCalories).sum();
        goal.setCaloriesConsumed(totalCals);
        
        List<WaterLog> waters = waterLogRepository.findByUserIdAndLogDate(user.getId(), today);
        double totalWater = waters.stream().mapToDouble(WaterLog::getAmount).sum();
        goal.setWaterConsumed(Math.round(totalWater * 100.0) / 100.0);
        
        return dailyGoalRepository.save(goal);
    }

    private void generateUserRecommendations(User user) {
        String prompt = String.format("The user is %d years old, weight %.1f kg, height %.2f m, BMI: %.1f, goal: %s. " +
            "Generate a highly customized 3-day workout plan and a short list of diet tips. " +
            "CRITICAL INSTRUCTION: You MUST heavily differentiate the workout style based on the goal! " +
            "If the goal is 'fat_loss', focus heavily on HIIT, circuit training, high reps (15+), and intense cardio. " +
            "If the goal is 'weight_gain', focus purely on heavy compound powerlifting, low reps (4-8), and maximum hypertrophy. " +
            "If the goal is 'maintenance', focus on a balanced mix of functional strength and steady-state cardio. " +
            "Return EXACTLY a valid JSON object (NO markdown blocks, NO backticks) with keys 'workoutPlan' and 'dietTips'. Use Markdown formatting inside the string values for readability.", 
            user.getAge(), user.getWeight(), user.getHeight(), user.getBmi(), user.getGoal());
        
        String jsonReply = callGeminiApi(prompt);
        // Strip markdown code blocks just in case the LLM ignores instructions
        if (jsonReply.startsWith("```json")) {
            jsonReply = jsonReply.substring(7, jsonReply.length() - 3).trim();
        } else if (jsonReply.startsWith("```")) {
            jsonReply = jsonReply.substring(3, jsonReply.length() - 3).trim();
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, String> map = mapper.readValue(jsonReply, java.util.Map.class);
            user.setWorkoutPlan(map.getOrDefault("workoutPlan", "Error generating plan."));
            user.setDietTips(map.getOrDefault("dietTips", "Error generating tips."));
        } catch (Exception e) {
            System.err.println("JSON parse error: " + e.getMessage() + " | Reply: " + jsonReply);
            user.setWorkoutPlan("Failed to generate workout plan. Please try again.");
            user.setDietTips("Failed to generate diet tips. Please try again.");
        }
    }

    private Map<String, Object> getUserDashboardData(User user) {
        Map<String, Object> data = new HashMap<>();
        data.put("user", user);
        data.put("goal", getOrCreateDailyGoal(user));
        
        if (user.getWorkoutPlan() == null || user.getDietTips() == null) {
            generateUserRecommendations(user);
            userRepository.save(user);
        }
        
        data.put("workoutPlan", user.getWorkoutPlan());
        data.put("dietTips", user.getDietTips());
        
        return data;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User userRequest) {
        if (userRepository.findByName(userRequest.getName()).isPresent()) {
            return ResponseEntity.ok(errorResponse("Username already taken."));
        }
        
        userRequest.setPassword(BCrypt.hashpw(userRequest.getPassword(), BCrypt.gensalt()));
        User savedUser = userRepository.save(userRequest);
        
        return ResponseEntity.ok(successResponse(getUserDashboardData(savedUser)));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String name = credentials.get("name");
        String password = credentials.get("password");
        
        Optional<User> userOpt = userRepository.findByName(name);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String dbHash = user.getPassword();
            if (dbHash != null && !dbHash.startsWith("$2")) {
                if (password.equals(dbHash)) {
                    // Update to bcrypt for future
                    user.setPassword(BCrypt.hashpw(password, BCrypt.gensalt()));
                    userRepository.save(user);
                    return ResponseEntity.ok(successResponse(getUserDashboardData(user)));
                }
            } else if (dbHash != null) {
                // Fix for Python bcrypt hashes that use $2b$ or $2y$ instead of $2a$
                if (dbHash.startsWith("$2b$") || dbHash.startsWith("$2y$")) {
                    dbHash = "$2a$" + dbHash.substring(4);
                }
                if (BCrypt.checkpw(password, dbHash)) {
                    return ResponseEntity.ok(successResponse(getUserDashboardData(user)));
                }
            }
        }
        return ResponseEntity.ok(errorResponse("Invalid username or password."));
    }

    @GetMapping("/bmi")
    public ResponseEntity<?> getBmi(@RequestParam Double height, @RequestParam Double weight) {
        double bmi = Math.round((weight / (height * height)) * 100.0) / 100.0;
        String category;
        if (bmi < 18.5) category = "Underweight";
        else if (bmi < 25) category = "Normal";
        else if (bmi < 30) category = "Overweight";
        else category = "Obese";
        
        Map<String, Object> data = new HashMap<>();
        data.put("bmi", bmi);
        data.put("category", category);
        data.put("advice", "Based on your BMI, consider " + ("Normal".equals(category) ? "maintaining your current lifestyle." : "consulting a fitness expert."));
        return ResponseEntity.ok(successResponse(data));
    }

    @GetMapping("/exercises/{muscle}")
    public ResponseEntity<?> getExercises(@PathVariable String muscle) {
        List<Exercise> exercises = exerciseRepository.findByMuscleGroupIgnoreCase(muscle);
        return ResponseEntity.ok(successResponse(exercises));
    }

    @GetMapping("/goals/{id}")
    public ResponseEntity<?> getGoals(@PathVariable Integer id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            DailyGoal goal = getOrCreateDailyGoal(userOpt.get());
            return ResponseEntity.ok(successResponse(goal));
        }
        return ResponseEntity.ok(errorResponse("User not found"));
    }

    @GetMapping("/goals/{id}/history")
    public ResponseEntity<?> getGoalHistory(@PathVariable Integer id) {
        List<DailyGoal> history = dailyGoalRepository.findByUserId(id);
        return ResponseEntity.ok(successResponse(history));
    }

    @PostMapping("/goals/{id}/complete")
    public ResponseEntity<?> completeWorkout(@PathVariable Integer id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            DailyGoal goal = getOrCreateDailyGoal(user);
            goal.setWorkoutCompleted(true);
            dailyGoalRepository.save(goal);
            
            LocalDate today = LocalDate.now();
            if (user.getLastWorkoutDate() == null) {
                user.setCurrentStreak(1);
            } else if (user.getLastWorkoutDate().equals(today.minusDays(1))) {
                user.setCurrentStreak((user.getCurrentStreak() == null ? 0 : user.getCurrentStreak()) + 1);
            } else if (!user.getLastWorkoutDate().equals(today)) {
                user.setCurrentStreak(1);
            }
            
            user.setLastWorkoutDate(today);
            userRepository.save(user);
            
            return ResponseEntity.ok(successResponse(getUserDashboardData(user)));
        }
        return ResponseEntity.ok(errorResponse("User not found"));
    }

    @GetMapping("/recommendation/{id}")
    public ResponseEntity<?> getRecommendation(@PathVariable Integer id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            Map<String, Object> data = getUserDashboardData(userOpt.get());
            return ResponseEntity.ok(successResponse(data)); // Has workoutPlan and dietTips
        }
        return ResponseEntity.ok(errorResponse("User not found"));
    }

    @PutMapping("/user/update/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Integer id, @RequestBody User userUpdate) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User existing = userOpt.get();
            boolean resetRecommendations = false;
            
            if (existing.getGoal() == null || !existing.getGoal().equals(userUpdate.getGoal()) ||
                existing.getWeight() == null || !existing.getWeight().equals(userUpdate.getWeight()) ||
                existing.getHeight() == null || !existing.getHeight().equals(userUpdate.getHeight())) {
                resetRecommendations = true;
            }

            existing.setName(userUpdate.getName());
            existing.setAge(userUpdate.getAge());
            existing.setHeight(userUpdate.getHeight());
            existing.setWeight(userUpdate.getWeight());
            existing.setGoal(userUpdate.getGoal());
            
            if (resetRecommendations) {
                existing.setWorkoutPlan(null);
                existing.setDietTips(null);
            }
            
            userRepository.save(existing);
            return ResponseEntity.ok(successResponse(getUserDashboardData(existing)));
        }
        return ResponseEntity.ok(errorResponse("User not found"));
    }

    @PostMapping("/food")
    public ResponseEntity<?> logFood(@RequestBody Map<String, Object> req) {
        Integer userId = ((Number) req.get("userId")).intValue();
        String item = (String) req.get("foodItem");
        Integer cals = ((Number) req.get("calories")).intValue();
        
        FoodEntry entry = new FoodEntry();
        entry.setUserId(userId);
        entry.setFoodItem(item);
        entry.setCalories(cals);
        foodEntryRepository.save(entry);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            return ResponseEntity.ok(successResponse(getOrCreateDailyGoal(userOpt.get())));
        }
        return ResponseEntity.ok(errorResponse("User not found"));
    }

    @PostMapping("/water")
    public ResponseEntity<?> logWater(@RequestBody Map<String, Object> req) {
        Integer userId = ((Number) req.get("userId")).intValue();
        Double amt = ((Number) req.get("amount")).doubleValue();
        
        WaterLog log = new WaterLog();
        log.setUserId(userId);
        log.setAmount(amt);
        waterLogRepository.save(log);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            return ResponseEntity.ok(successResponse(getOrCreateDailyGoal(userOpt.get())));
        }
        return ResponseEntity.ok(errorResponse("User not found"));
    }

    @PostMapping("/assistant")
    public ResponseEntity<?> chatAssistant(@RequestBody Map<String, Object> request) {
        String query = (String) request.get("query");
        Integer userId = ((Number) request.get("userId")).intValue();
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (!userOpt.isPresent()) {
            return ResponseEntity.ok(errorResponse("User not found"));
        }
        User user = userOpt.get();
        
        String context = String.format("You are IronMind AI, a highly intelligent fitness assistant. The user is %s, %d years old, weight %.1f kg, height %.2f m, BMI: %.1f, goal: %s. CRITICAL RULES: 1. You already know the user's height, weight, age, and BMI. DO NOT ask the user to provide this data. 2. Output your response using rich Markdown formatting for readability (use bolding, bullet points, headers, etc.). Keep it engaging and well structured. 3. If asked your name, you are IronMind AI. Answer the user's fitness related query: %s",
                                      user.getName(), user.getAge(), user.getWeight(), user.getHeight(), user.getBmi(), user.getGoal(), query);

        String botReply = callGeminiApi(context);
        
        ChatLog log = new ChatLog();
        log.setUserId(userId);
        log.setQuery(query);
        log.setReply(botReply);
        chatLogRepository.save(log);
        
        Map<String, Object> data = new HashMap<>();
        data.put("reply", botReply);
        return ResponseEntity.ok(successResponse(data));
    }
    
    private String callGeminiApi(String prompt) {
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(8000);
            factory.setReadTimeout(30000);
            RestTemplate restTemplate = new RestTemplate(factory);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + GEMINI_API_KEY;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            String requestBody = "{\"contents\":[{\"parts\":[{\"text\":\"" + prompt.replace("\"", "\\\"").replace("\n", " ") + "\"}]}]}";
            
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
            return "I'm having trouble connecting to my fitness knowledge base right now. Please try again later.";
        } catch (Exception e) {
            System.err.println("Gemini API Error: " + e.getMessage());
            return "I'm having trouble connecting to my fitness knowledge base right now. Please try again later.";
        }
    }
}
