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
import com.gymplus.security.JwtUtil;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpEntity;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.core.type.TypeReference;

@RestController
@RequestMapping("/api")
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

    @Autowired
    private JwtUtil jwtUtil;

    @org.springframework.beans.factory.annotation.Value("${gemini.api.key}")
    private String geminiApiKey;
    
    private String getApiKey() {
        return geminiApiKey;
    }

    // ── Health Check (used by Render to verify the app is alive) ──
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
    
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
        }
        
        // Always recalculate calorie & water targets from current user data
        // Mifflin-St Jeor equation: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
        double weightKg = user.getWeight() != null ? user.getWeight() : 70.0;
        double heightCm = user.getHeight() != null ? user.getHeight() * 100.0 : 170.0; // stored in meters, convert to cm
        int age = user.getAge() != null ? user.getAge() : 25;
        
        double bmr = (10.0 * weightKg) + (6.25 * heightCm) - (5.0 * age) + 5;
        double tdee = bmr * 1.55; // moderate activity multiplier
        
        // Water intake: ~33ml per kg of body weight, adjusted per goal
        double baseWater = Math.round((weightKg * 0.033) * 10.0) / 10.0;
        
        if ("fat_loss".equals(user.getGoal())) {
            goal.setCalories((int) Math.round(tdee - 500)); // caloric deficit
            goal.setWaterIntake(Math.round((baseWater + 0.5) * 10.0) / 10.0); // extra hydration for fat loss
        } else if ("weight_gain".equals(user.getGoal())) {
            goal.setCalories((int) Math.round(tdee + 500)); // caloric surplus
            goal.setWaterIntake(baseWater);
        } else {
            goal.setCalories((int) Math.round(tdee)); // maintenance
            goal.setWaterIntake(baseWater);
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
            Map<String, Object> map = mapper.readValue(jsonReply, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>(){});
            
            Object workoutPlanObj = map.get("workoutPlan");
            if (workoutPlanObj instanceof List) {
                List<?> list = (List<?>) workoutPlanObj;
                StringBuilder sb = new StringBuilder();
                for (Object item : list) {
                    sb.append(item.toString()).append("\n");
                }
                user.setWorkoutPlan(sb.toString().trim());
            } else {
                user.setWorkoutPlan(workoutPlanObj != null ? workoutPlanObj.toString() : "Error generating plan.");
            }
            
            Object dietTipsObj = map.get("dietTips");
            if (dietTipsObj instanceof List) {
                List<?> list = (List<?>) dietTipsObj;
                StringBuilder sb = new StringBuilder();
                for (Object item : list) {
                    sb.append("- ").append(item.toString()).append("\n");
                }
                user.setDietTips(sb.toString().trim());
            } else {
                user.setDietTips(dietTipsObj != null ? dietTipsObj.toString() : "Error generating tips.");
            }
        } catch (Exception e) {
            System.err.println("JSON parse error or API failure: " + e.getMessage() + " | Reply: " + jsonReply);
            
            String goal = user.getGoal() != null ? user.getGoal() : "maintenance";
            if ("fat_loss".equals(goal)) {
                user.setWorkoutPlan("### Day 1: Full Body HIIT\n- Jump rope (5 mins)\n- Burpees (3x15)\n- Mountain Climbers (3x30s)\n\n### Day 2: Cardio\n- 30 mins brisk walk or jog\n\n### Day 3: Core & Cardio\n- Bicycle Crunches (3x20)\n- High Knees (3x30s)\n- Plank (3x60s)");
                user.setDietTips("- **Caloric Deficit:** Consume fewer calories than you burn.\n- **High Protein:** Keep protein intake high to preserve muscle.\n- **Hydration:** Drink at least 3 liters of water daily.");
            } else if ("weight_gain".equals(goal)) {
                user.setWorkoutPlan("### Day 1: Heavy Push\n- Bench Press (4x6)\n- Overhead Press (3x8)\n- Dips (3x10)\n\n### Day 2: Heavy Pull\n- Deadlifts (3x5)\n- Barbell Rows (4x8)\n- Pull-ups (3xMax)\n\n### Day 3: Heavy Legs\n- Squats (4x6)\n- Leg Press (3x10)\n- Calf Raises (4x15)");
                user.setDietTips("- **Caloric Surplus:** Eat more calories than you burn.\n- **Carb Heavy:** Consume complex carbs for energy.\n- **Frequent Meals:** Eat 4-5 times a day to hit your calorie goals.");
            } else {
                user.setWorkoutPlan("### Day 1: Upper Body\n- Push-ups (3x15)\n- Dumbbell Rows (3x12)\n- Shoulder Press (3x12)\n\n### Day 2: Active Recovery\n- Yoga or stretching for 20 mins\n\n### Day 3: Lower Body & Core\n- Bodyweight Squats (3x20)\n- Lunges (3x15 per leg)\n- Plank (3x60s)");
                user.setDietTips("- **Balanced Macros:** Aim for an even split of carbs, protein, and fats.\n- **Consistency:** Focus on sustainable eating habits.\n- **Micronutrients:** Eat a variety of colorful vegetables daily.");
            }
        }
    }

    private Map<String, Object> getUserDashboardData(User user) {
        Map<String, Object> data = new HashMap<>();
        data.put("user", user);
        data.put("goal", getOrCreateDailyGoal(user));
        
        boolean needsRegeneration = false;
        if (user.getWorkoutPlan() == null || user.getDietTips() == null) {
            needsRegeneration = true;
        } else if (user.getWorkoutPlan().contains("Failed") || user.getWorkoutPlan().contains("Error")) {
            needsRegeneration = true;
        } else if (user.getDietTips().contains("Failed") || user.getDietTips().contains("Error")) {
            needsRegeneration = true;
        }

        if (needsRegeneration) {
            generateUserRecommendations(user);
            userRepository.save(user);
        }
        
        data.put("workoutPlan", user.getWorkoutPlan());
        data.put("dietTips", user.getDietTips());
        
        return data;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody User userRequest) {
        // Normalize email
        userRequest.setEmail(userRequest.getEmail().trim().toLowerCase());

        // Check for duplicate email
        if (userRepository.findByEmail(userRequest.getEmail()).isPresent()) {
            return ResponseEntity.ok(errorResponse("Email already exists."));
        }
        
        userRequest.setPassword(BCrypt.hashpw(userRequest.getPassword(), BCrypt.gensalt()));
        User savedUser = userRepository.save(userRequest);

        // Generate JWT token
        String token = jwtUtil.generateToken(savedUser.getEmail());

        Map<String, Object> responseData = getUserDashboardData(savedUser);
        responseData.put("token", token);
        
        return ResponseEntity.ok(successResponse(responseData));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        if (email == null || email.isBlank()) {
            return ResponseEntity.ok(errorResponse("Email is required."));
        }
        if (password == null || password.isBlank()) {
            return ResponseEntity.ok(errorResponse("Password is required."));
        }

        // Normalize email
        email = email.trim().toLowerCase();
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String dbHash = user.getPassword();
            if (dbHash != null && !dbHash.startsWith("$2")) {
                if (password.equals(dbHash)) {
                    // Update to bcrypt for future
                    user.setPassword(BCrypt.hashpw(password, BCrypt.gensalt()));
                    userRepository.save(user);
                    String token = jwtUtil.generateToken(user.getEmail());
                    Map<String, Object> responseData = getUserDashboardData(user);
                    responseData.put("token", token);
                    return ResponseEntity.ok(successResponse(responseData));
                }
            } else if (dbHash != null) {
                // Fix for Python bcrypt hashes that use $2b$ or $2y$ instead of $2a$
                if (dbHash.startsWith("$2b$") || dbHash.startsWith("$2y$")) {
                    dbHash = "$2a$" + dbHash.substring(4);
                }
                if (BCrypt.checkpw(password, dbHash)) {
                    String token = jwtUtil.generateToken(user.getEmail());
                    Map<String, Object> responseData = getUserDashboardData(user);
                    responseData.put("token", token);
                    return ResponseEntity.ok(successResponse(responseData));
                }
            }
        }
        return ResponseEntity.ok(errorResponse("Invalid email or password."));
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

    @GetMapping("/exercises/info")
    public ResponseEntity<?> getExerciseInfo(@RequestParam String name) {
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.ok(errorResponse("Exercise name cannot be empty."));
        }
        
        String prompt = "Provide a clean, brief guide on how to perform the gym exercise: '" + name.trim() + "'. " +
                        "Include a 1-sentence description, 3 simple step-by-step instructions, and 1 safety tip. " +
                        "Format the output strictly as HTML paragraphs <p>, a bold title for safety like <p><strong>Safety Tip:</strong>...</p>, " +
                        "and a ordered list <ol> containing 3 list items <li>. " +
                        "Do not include any markdown or backticks in the response. Return raw HTML text only.";
                        
        String reply = callGeminiApi(prompt);
        if (reply == null || reply.isEmpty() || reply.contains("trouble connecting") || reply.startsWith("I'm having")) {
            // Fallback content if Gemini is unavailable
            String fallbackHtml = "<p>Learn how to perform the " + name.trim() + " exercise to build strength and endurance.</p>" +
                                  "<p><strong>Instructions:</strong></p>" +
                                  "<ol>" +
                                  "<li>Position yourself correctly according to standard guidelines.</li>" +
                                  "<li>Perform the exercise through a full range of motion.</li>" +
                                  "<li>Maintain a controlled tempo for both lifting and lowering phases.</li>" +
                                  "</ol>" +
                                  "<p><strong>Safety Tip:</strong> Keep your core engaged and stop immediately if you feel sharp pain.</p>";
            return ResponseEntity.ok(successResponse(Map.of("html", fallbackHtml)));
        }
        
        return ResponseEntity.ok(successResponse(Map.of("html", reply)));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getProfile() {
        System.out.println("[ApiController] /me called");
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            System.out.println("[ApiController] auth: authenticated=" + auth.isAuthenticated() + ", principal=" + auth.getPrincipal());
        } else {
            System.out.println("[ApiController] auth is null");
        }
        if (auth != null && auth.isAuthenticated()) {
            Object principal = auth.getPrincipal();
            if (principal instanceof String && !"anonymousUser".equals(principal)) {
                String email = (String) principal;
                Optional<User> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent()) {
                    System.out.println("[ApiController] /me success for " + email);
                    return ResponseEntity.ok(successResponse(getUserDashboardData(userOpt.get())));
                } else {
                    System.out.println("[ApiController] /me user not found in database: " + email);
                }
            }
        }
        return ResponseEntity.ok(errorResponse("Unauthorized"));
    }

    @PostMapping("/exercises/{muscle}/exchange")
    public ResponseEntity<?> exchangeExercises(@PathVariable String muscle) {
        String prompt = "Return a JSON array of exactly 5 unique exercises for the muscle group: " + muscle + 
                        ". The JSON must exactly match this format: [{\"name\": \"Incline DB Press\", \"sets\": 3, \"reps\": \"10-12\"}] " +
                        "Do not include any other text, markdown, or backticks. Return raw JSON array only.";
        String responseText = callGeminiApi(prompt);
        if (responseText == null || responseText.isEmpty()) {
            return ResponseEntity.ok(errorResponse("Failed to connect to IronMind AI."));
        }
        
        int start = responseText.indexOf('[');
        int end = responseText.lastIndexOf(']');
        if (start != -1 && end != -1 && end >= start) {
            responseText = responseText.substring(start, end + 1);
        } else {
            return ResponseEntity.ok(errorResponse("AI did not return a valid JSON array format."));
        }
        
        try {
            ObjectMapper mapper = new ObjectMapper();
            List<Exercise> newExercises = mapper.readValue(responseText, new TypeReference<List<Exercise>>(){});
            if (newExercises != null && !newExercises.isEmpty()) {
                for (Exercise ex : newExercises) {
                    ex.setMuscleGroup(muscle);
                }
                List<Exercise> oldExercises = exerciseRepository.findByMuscleGroupIgnoreCase(muscle);
                exerciseRepository.deleteAll(oldExercises);
                List<Exercise> savedExercises = exerciseRepository.saveAll(newExercises);
                return ResponseEntity.ok(successResponse(savedExercises));
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("FAILED TO PARSE: " + responseText);
            return ResponseEntity.ok(errorResponse("Failed to parse AI response."));
        }
        return ResponseEntity.ok(errorResponse("No exercises generated."));
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
    public ResponseEntity<?> completeWorkout(@PathVariable Integer id, @RequestBody(required = false) Map<String, String> requestBody) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            DailyGoal goal = getOrCreateDailyGoal(user);
            goal.setWorkoutCompleted(true);
            if (requestBody != null && requestBody.containsKey("workoutType")) {
                goal.setWorkoutType(requestBody.get("workoutType"));
            }
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
        if (item == null || item.trim().isEmpty()) {
            return ResponseEntity.ok(errorResponse("Food item name cannot be empty."));
        }
        if (item.length() > 100) {
            return ResponseEntity.ok(errorResponse("Food item name is too long."));
        }
        Integer cals = ((Number) req.get("calories")).intValue();
        if (cals <= 0 || cals > 5000) {
            return ResponseEntity.ok(errorResponse("Calories must be between 1 and 5000 kcal."));
        }
        
        FoodEntry entry = new FoodEntry();
        entry.setUserId(userId);
        entry.setFoodItem(item.trim());
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
        if (amt <= 0.0 || amt > 5.0) {
            return ResponseEntity.ok(errorResponse("Water amount must be between 0.01 and 5.0 Litres."));
        }
        
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
        
        ChatLog chatLog = new ChatLog();
        chatLog.setUserId(userId);
        chatLog.setQuery(query);
        chatLog.setReply(botReply);
        chatLogRepository.save(chatLog);
        
        Map<String, Object> data = new HashMap<>();
        data.put("reply", botReply);
        return ResponseEntity.ok(successResponse(data));
    }
    
    private static final String[] GEMINI_MODELS = {
        "gemini-3.5-flash", 
        "gemini-3.1-flash-lite", 
        "gemini-1.5-flash",
        "gemini-2.5-flash"
    };

    private String callGeminiApi(String prompt) {
        if (getApiKey() == null || getApiKey().trim().isEmpty()) {
            System.err.println("[Gemini] API key is missing or empty. Skipping HTTP calls.");
            return "I'm having trouble connecting to my fitness knowledge base right now. Please try again later.";
        }

        long startTime = System.currentTimeMillis();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(12000);
        RestTemplate restTemplate = new RestTemplate(factory);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        String requestBody = "{\"contents\":[{\"parts\":[{\"text\":\"" + prompt.replace("\"", "\\\"").replace("\n", " ") + "\"}]}]}";
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
        
        for (String model : GEMINI_MODELS) {
            for (int attempt = 0; attempt < 2; attempt++) {
                try {
                    String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + getApiKey();
                    System.out.println("[Gemini] Trying " + model + " (attempt " + (attempt + 1) + ") at " + (System.currentTimeMillis() - startTime) + "ms");
                    
                    long callStart = System.currentTimeMillis();
                    ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
                    System.out.println("[Gemini] " + model + " response received in " + (System.currentTimeMillis() - callStart) + "ms");
                    
                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        Map<String, Object> body = response.getBody();
                        List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                        if (candidates != null && !candidates.isEmpty()) {
                            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                            if (parts != null && !parts.isEmpty()) {
                                System.out.println("[Gemini] Success with " + model + " total time: " + (System.currentTimeMillis() - startTime) + "ms");
                                return (String) parts.get(0).get("text");
                            }
                        }
                    }
                    break;
                } catch (Exception e) {
                    String msg = e.getMessage() != null ? e.getMessage() : "";
                    System.err.println("[Gemini] " + model + " failed after " + (System.currentTimeMillis() - startTime) + "ms: " + msg.substring(0, Math.min(80, msg.length())));
                    
                    if (msg.contains("503") && attempt == 0) {
                        System.out.println("[Gemini] Model overloaded, retrying in 5s...");
                        try { Thread.sleep(5000); } catch (InterruptedException ignored) {}
                        continue;
                    }
                    break;
                }
            }
        }
        
        return "I'm having trouble connecting to my fitness knowledge base right now. Please try again later.";
    }
}
