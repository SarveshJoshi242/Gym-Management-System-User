package com.gymplus;

import com.gymplus.model.Exercise;
import com.gymplus.repository.ExerciseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Arrays;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(ExerciseRepository exerciseRepository) {
        return args -> {
            exerciseRepository.deleteAll();

            // Chest
            Exercise e1 = new Exercise(); e1.setMuscleGroup("chest"); e1.setName("Bench Press"); e1.setSets(4); e1.setReps("8-10");
            Exercise e2 = new Exercise(); e2.setMuscleGroup("chest"); e2.setName("Incline Dumbbell Press"); e2.setSets(3); e2.setReps("10-12");
            Exercise e3 = new Exercise(); e3.setMuscleGroup("chest"); e3.setName("Cable Fly"); e3.setSets(3); e3.setReps("12-15");
            Exercise e4 = new Exercise(); e4.setMuscleGroup("chest"); e4.setName("Push-Ups"); e4.setSets(4); e4.setReps("Max");
            Exercise e5 = new Exercise(); e5.setMuscleGroup("chest"); e5.setName("Chest Dips"); e5.setSets(3); e5.setReps("8-12");

            // Back
            Exercise e6 = new Exercise(); e6.setMuscleGroup("back"); e6.setName("Deadlift"); e6.setSets(4); e6.setReps("6");
            Exercise e7 = new Exercise(); e7.setMuscleGroup("back"); e7.setName("Pull-Ups"); e7.setSets(4); e7.setReps("Max");
            Exercise e8 = new Exercise(); e8.setMuscleGroup("back"); e8.setName("Barbell Row"); e8.setSets(4); e8.setReps("8-10");
            Exercise e9 = new Exercise(); e9.setMuscleGroup("back"); e9.setName("Lat Pulldown"); e9.setSets(3); e9.setReps("10-12");
            Exercise e10 = new Exercise(); e10.setMuscleGroup("back"); e10.setName("T-Bar Row"); e10.setSets(3); e10.setReps("8-12");

            // Legs
            Exercise e11 = new Exercise(); e11.setMuscleGroup("legs"); e11.setName("Squat"); e11.setSets(4); e11.setReps("8-10");
            Exercise e12 = new Exercise(); e12.setMuscleGroup("legs"); e12.setName("Leg Press"); e12.setSets(3); e12.setReps("12-15");
            Exercise e13 = new Exercise(); e13.setMuscleGroup("legs"); e13.setName("Walking Lunges"); e13.setSets(3); e13.setReps("12 per leg");
            Exercise e14 = new Exercise(); e14.setMuscleGroup("legs"); e14.setName("Leg Extensions"); e14.setSets(3); e14.setReps("15");
            Exercise e15 = new Exercise(); e15.setMuscleGroup("legs"); e15.setName("Calf Raises"); e15.setSets(4); e15.setReps("20");

            // Shoulders
            Exercise e16 = new Exercise(); e16.setMuscleGroup("shoulders"); e16.setName("Overhead Press"); e16.setSets(4); e16.setReps("8-10");
            Exercise e17 = new Exercise(); e17.setMuscleGroup("shoulders"); e17.setName("Lateral Raises"); e17.setSets(4); e17.setReps("12-15");
            Exercise e18 = new Exercise(); e18.setMuscleGroup("shoulders"); e18.setName("Front Raises"); e18.setSets(3); e18.setReps("12");
            Exercise e19 = new Exercise(); e19.setMuscleGroup("shoulders"); e19.setName("Face Pulls"); e19.setSets(3); e19.setReps("15");

            // Arms
            Exercise e20 = new Exercise(); e20.setMuscleGroup("arms"); e20.setName("Bicep Curls"); e20.setSets(3); e20.setReps("12");
            Exercise e21 = new Exercise(); e21.setMuscleGroup("arms"); e21.setName("Tricep Pushdown"); e21.setSets(3); e21.setReps("12-15");
            Exercise e22 = new Exercise(); e22.setMuscleGroup("arms"); e22.setName("Hammer Curls"); e22.setSets(3); e22.setReps("10-12");
            Exercise e23 = new Exercise(); e23.setMuscleGroup("arms"); e23.setName("Skull Crushers"); e23.setSets(3); e23.setReps("10-12");

            // Core
            Exercise e24 = new Exercise(); e24.setMuscleGroup("core"); e24.setName("Plank"); e24.setSets(3); e24.setReps("60s");
            Exercise e25 = new Exercise(); e25.setMuscleGroup("core"); e25.setName("Russian Twists"); e25.setSets(3); e25.setReps("20 per side");
            Exercise e26 = new Exercise(); e26.setMuscleGroup("core"); e26.setName("Crunches"); e26.setSets(3); e26.setReps("20");
            Exercise e27 = new Exercise(); e27.setMuscleGroup("core"); e27.setName("Hanging Leg Raises"); e27.setSets(3); e27.setReps("12-15");

            exerciseRepository.saveAll(Arrays.asList(
                e1, e2, e3, e4, e5, e6, e7, e8, e9, e10, 
                e11, e12, e13, e14, e15, e16, e17, e18, e19, e20, 
                e21, e22, e23, e24, e25, e26, e27
            ));
        };
    }
}
