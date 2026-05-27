package com.gymplus.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handle Jakarta validation errors from @Valid and return
     * clean, field-specific error messages.
     * Returns HTTP 200 with success=false to match our API convention.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        // Build a human-readable summary for the 'message' field
        String summary = errors.values().stream()
                .collect(Collectors.joining("; "));

        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", summary.isEmpty() ? "Validation failed" : summary);
        response.put("errors", errors);
        return ResponseEntity.ok(response);
    }
}
