package com.gymplus.repository;

import com.gymplus.model.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExerciseRepository extends JpaRepository<Exercise, Integer> {
    List<Exercise> findByMuscleGroupIgnoreCase(String muscleGroup);
}
