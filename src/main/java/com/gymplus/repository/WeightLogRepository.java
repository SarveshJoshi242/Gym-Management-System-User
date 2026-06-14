package com.gymplus.repository;

import com.gymplus.model.WeightLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeightLogRepository extends JpaRepository<WeightLog, Integer> {
    List<WeightLog> findByUserIdOrderByLogDateAsc(Integer userId);
    Optional<WeightLog> findByUserIdAndLogDate(Integer userId, LocalDate logDate);
}
