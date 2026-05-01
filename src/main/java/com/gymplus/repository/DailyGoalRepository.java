package com.gymplus.repository;

import com.gymplus.model.DailyGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

import java.util.List;

public interface DailyGoalRepository extends JpaRepository<DailyGoal, Integer> {
    Optional<DailyGoal> findByUserIdAndGoalDate(Integer userId, LocalDate goalDate);
    List<DailyGoal> findByUserId(Integer userId);
}
