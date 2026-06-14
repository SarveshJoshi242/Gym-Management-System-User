package com.gymplus.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "food_entries", indexes = {
    @Index(name = "idx_food_entries_user_date", columnList = "user_id, entry_date")
})
public class FoodEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate = LocalDate.now();

    @Column(name = "food_item", nullable = false)
    private String foodItem;

    @Column(nullable = false)
    private Integer calories;
}
