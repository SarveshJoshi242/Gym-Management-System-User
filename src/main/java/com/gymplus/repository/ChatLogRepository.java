package com.gymplus.repository;

import com.gymplus.model.ChatLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatLogRepository extends JpaRepository<ChatLog, Integer> {
}
