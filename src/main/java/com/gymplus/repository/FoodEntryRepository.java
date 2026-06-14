package com.gymplus.repository;

import com.gymplus.model.FoodEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface FoodEntryRepository extends JpaRepository<FoodEntry, Integer> {
    List<FoodEntry> findByUserIdAndEntryDate(Integer userId, LocalDate entryDate);

    @Query("SELECT COALESCE(SUM(f.calories), 0) FROM FoodEntry f WHERE f.userId = :userId AND f.entryDate = :entryDate")
    Integer sumCaloriesByUserIdAndEntryDate(@Param("userId") Integer userId, @Param("entryDate") LocalDate entryDate);
}
