package com.example.demo.exception;

public class IdempotentTokenException extends RuntimeException {

    public IdempotentTokenException(String message) {
        super(message);
    }
}
