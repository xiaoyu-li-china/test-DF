package com.example.demo.aspect;

import com.example.demo.annotation.IdempotentToken;
import com.example.demo.exception.IdempotentTokenException;
import com.example.demo.service.IdempotentTokenService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;

@Aspect
@Component
public class IdempotentTokenAspect {

    private final IdempotentTokenService idempotentTokenService;

    public IdempotentTokenAspect(IdempotentTokenService idempotentTokenService) {
        this.idempotentTokenService = idempotentTokenService;
    }

    @Around("@annotation(com.example.demo.annotation.IdempotentToken)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        IdempotentToken idempotentToken = method.getAnnotation(IdempotentToken.class);

        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();

        String token = request.getHeader(idempotentToken.headerName());
        if (token == null || token.isEmpty()) {
            throw new IdempotentTokenException("缺少幂等Token请求头: " + idempotentToken.headerName());
        }

        boolean valid = idempotentTokenService.validateAndConsume(token);
        if (!valid) {
            throw new IdempotentTokenException(idempotentToken.message());
        }

        return joinPoint.proceed();
    }
}
