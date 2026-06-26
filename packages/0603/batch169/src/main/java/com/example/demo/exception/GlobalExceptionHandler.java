package com.example.demo.exception;

import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RepeatSubmitException.class)
    public ResponseEntity<ErrorResponse> handleRepeatSubmitException(RepeatSubmitException e) {
        ErrorResponse error = new ErrorResponse();
        error.setCode(HttpStatus.CONFLICT.value());
        error.setMessage(e.getMessage());
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(IdempotentTokenException.class)
    public ResponseEntity<ErrorResponse> handleIdempotentTokenException(IdempotentTokenException e) {
        ErrorResponse error = new ErrorResponse();
        error.setCode(HttpStatus.CONFLICT.value());
        error.setMessage(e.getMessage());
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @Data
    public static class ErrorResponse {
        private int code;
        private String message;
    }
}
