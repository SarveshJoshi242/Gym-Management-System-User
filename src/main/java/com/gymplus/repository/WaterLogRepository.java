package com.gymplus.repository;

import com.gymplus.model.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface WaterLogRepository extends JpaRepository<WaterLog, Integer> {
    List<WaterLog> findByUserIdAndLogDate(Integer userId, LocalDate logDate);
}
