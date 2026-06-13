package com.gymplus.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            System.out.println("[JwtFilter] Processing token: " + token.substring(0, Math.min(15, token.length())) + "...");
            try {
                boolean isValid = jwtUtil.validateToken(token);
                System.out.println("[JwtFilter] Token validation result: " + isValid);
                if (isValid) {
                    String email = jwtUtil.extractEmail(token);
                    System.out.println("[JwtFilter] Extracted email: " + email);

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(email, null, Collections.emptyList());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception e) {
                System.err.println("[JwtFilter] Error validating token: " + e.getMessage());
            }
        } else {
            System.out.println("[JwtFilter] No valid Authorization header found");
        }

        filterChain.doFilter(request, response);
    }
}
