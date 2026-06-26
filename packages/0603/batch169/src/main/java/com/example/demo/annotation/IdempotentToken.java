package com.example.demo.annotation;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface IdempotentToken {

    String headerName() default "X-Idempotent-Token";

    String message() default "非法或已过期的幂等Token";
}
