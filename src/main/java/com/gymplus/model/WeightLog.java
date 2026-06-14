package com.gymplus.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "weight_logs", indexes = {
    @Index(name = "idx_weight_logs_user_date", columnList = "user_id, log_date")
})
public class WeightLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(nullable = false)
    private Double weight;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate = LocalDate.now();
}
