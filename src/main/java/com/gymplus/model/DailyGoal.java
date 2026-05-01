package com.gymplus.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "daily_goals")
public class DailyGoal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    private Integer calories;
    private Double waterIntake;
    
    @Column(name = "calories_consumed")
    private Integer caloriesConsumed = 0;

    @Column(name = "water_consumed")
    private Double waterConsumed = 0.0;
    
    @Column(name = "workout_completed")
    private Boolean workoutCompleted = false;

    @Column(name = "goal_date", nullable = false)
    private LocalDate goalDate = LocalDate.now();
}
