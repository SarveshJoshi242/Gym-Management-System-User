package com.gymplus.repository;

import com.gymplus.model.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface WaterLogRepository extends JpaRepository<WaterLog, Integer> {
    List<WaterLog> findByUserIdAndLogDate(Integer userId, LocalDate logDate);

    @Query("SELECT COALESCE(SUM(w.amount), 0.0) FROM WaterLog w WHERE w.userId = :userId AND w.logDate = :logDate")
    Double sumAmountByUserIdAndLogDate(@Param("userId") Integer userId, @Param("logDate") LocalDate logDate);
}
