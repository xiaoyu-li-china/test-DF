package com.example.demo.exception;

public class RepeatSubmitException extends RuntimeException {

    public RepeatSubmitException(String message) {
        super(message);
    }
}
