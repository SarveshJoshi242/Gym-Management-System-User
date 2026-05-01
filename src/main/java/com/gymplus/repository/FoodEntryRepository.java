package com.gymplus.repository;

import com.gymplus.model.FoodEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface FoodEntryRepository extends JpaRepository<FoodEntry, Integer> {
    List<FoodEntry> findByUserIdAndEntryDate(Integer userId, LocalDate entryDate);
}
