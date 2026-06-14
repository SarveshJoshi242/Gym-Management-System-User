package com.gymplus.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "water_logs", indexes = {
    @Index(name = "idx_water_logs_user_date", columnList = "user_id, log_date")
})
public class WaterLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate = LocalDate.now();

    @Column(nullable = false)
    private Double amount;
}
