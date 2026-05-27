package com.gymplus.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
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

    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 50, message = "Name must be between 3 and 50 characters")
    @Pattern(regexp = "^[A-Za-z ]+$", message = "Name should contain only letters and spaces")
    @Column(nullable = false, length = 50)
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    @Column(nullable = false, length = 100)
    private String password;

    @Min(value = 10, message = "Age must be at least 10")
    @Max(value = 120, message = "Age must be at most 120")
    @Column(nullable = false)
    private Integer age;

    @DecimalMin(value = "0.5", message = "Height must be at least 0.5 metres")
    @DecimalMax(value = "3.0", message = "Height must be at most 3.0 metres")
    @Column(nullable = false)
    private Double height;

    @DecimalMin(value = "20.0", message = "Weight must be at least 20 kg")
    @DecimalMax(value = "400.0", message = "Weight must be at most 400 kg")
    @Column(nullable = false)
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
