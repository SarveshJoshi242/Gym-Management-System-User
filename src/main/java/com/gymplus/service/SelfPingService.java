package com.gymplus.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class SelfPingService {

    @Value("${RENDER_EXTERNAL_URL:}")
    private String renderExternalUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Pings the application's health endpoint every 10 minutes (600,000 milliseconds)
     * if the RENDER_EXTERNAL_URL environment variable is set.
     */
    @Scheduled(fixedRate = 600000, initialDelay = 60000)
    public void pingSelf() {
        if (renderExternalUrl == null || renderExternalUrl.trim().isEmpty()) {
            System.out.println("[SelfPingService] RENDER_EXTERNAL_URL is not set. Skipping self-ping.");
            return;
        }

        try {
            String url = renderExternalUrl.trim();
            if (!url.endsWith("/")) {
                url += "/";
            }
            url += "api/health";

            System.out.println("[SelfPingService] Pinging self at: " + url);
            String response = restTemplate.getForObject(url, String.class);
            System.out.println("[SelfPingService] Response: " + response);
        } catch (Exception e) {
            System.err.println("[SelfPingService] Failed to ping self: " + e.getMessage());
        }
    }
}
