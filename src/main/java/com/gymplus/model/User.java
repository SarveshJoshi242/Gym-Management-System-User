package com.gymplus.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String password;

    private Integer age;
    private Double height;
    private Double weight;
    private String goal;
    
    @Column(nullable = true)
    private Double bmi;

    @Column(columnDefinition = "TEXT")
    private String workoutPlan;

    @Column(columnDefinition = "TEXT")
    private String dietTips;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "current_streak", columnDefinition = "INT DEFAULT 0")
    private Integer currentStreak = 0;

    @Column(name = "last_workout_date")
    private LocalDate lastWorkoutDate;
    
    // Calculate BMI before saving if needed
    @PrePersist
    @PreUpdate
    public void calculateBmi() {
        if (weight != null && height != null && height > 0) {
            this.bmi = Math.round((weight / (height * height)) * 100.0) / 100.0;
        }
    }
}
