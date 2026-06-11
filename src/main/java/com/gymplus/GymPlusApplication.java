package com.gymplus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GymPlusApplication {

    public static void main(String[] args) {
        SpringApplication.run(GymPlusApplication.class, args);
    }
}
