package com.example.demo.aspect;

import com.example.demo.annotation.NoRepeatSubmit;
import com.example.demo.exception.RepeatSubmitException;
import com.example.demo.service.LockCleanupService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.codec.digest.DigestUtils;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.util.concurrent.TimeUnit;

@Aspect
@Component
public class NoRepeatSubmitAspect {

    private static final String LOCK_KEY_PREFIX = "repeat_submit:";
    private static final String USER_KEYS_SUFFIX = ":keys";

    private final RedissonClient redissonClient;
    private final LockCleanupService lockCleanupService;
    private final ObjectMapper objectMapper;

    public NoRepeatSubmitAspect(RedissonClient redissonClient,
                                LockCleanupService lockCleanupService,
                                ObjectMapper objectMapper) {
        this.redissonClient = redissonClient;
        this.lockCleanupService = lockCleanupService;
        this.objectMapper = objectMapper;
    }

    @Around("@annotation(com.example.demo.annotation.NoRepeatSubmit)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        NoRepeatSubmit noRepeatSubmit = method.getAnnotation(NoRepeatSubmit.class);

        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();

        String userId = getUserId(request);
        String requestPath = request.getRequestURI();
        String requestParams = getRequestParams(joinPoint);
        String paramsMd5 = DigestUtils.md5Hex(requestParams);

        String lockKey = LOCK_KEY_PREFIX + userId + ":" + requestPath + ":" + paramsMd5;

        RLock rLock = redissonClient.getLock(lockKey);
        boolean acquired = false;
        try {
            acquired = rLock.tryLock(0, noRepeatSubmit.interval(), TimeUnit.MILLISECONDS);
            if (!acquired) {
                throw new RepeatSubmitException(noRepeatSubmit.message());
            }

            lockCleanupService.trackUserLockKey(userId, lockKey, noRepeatSubmit.interval());

            Object result = joinPoint.proceed();
            return result;
        } catch (RepeatSubmitException e) {
            throw e;
        } catch (Throwable throwable) {
            if (rLock.isHeldByCurrentThread()) {
                rLock.unlock();
            }
            throw throwable;
        }
    }

    private String getUserId(HttpServletRequest request) {
        String userId = request.getHeader("X-User-Id");
        return userId != null ? userId : "anonymous";
    }

    private String getRequestParams(ProceedingJoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            if (args == null || args.length == 0) {
                return "";
            }
            StringBuilder sb = new StringBuilder();
            for (Object arg : args) {
                if (arg != null && !isHttpObject(arg)) {
                    sb.append(objectMapper.writeValueAsString(arg));
                }
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private boolean isHttpObject(Object obj) {
        return obj instanceof javax.servlet.http.HttpServletRequest ||
               obj instanceof javax.servlet.http.HttpServletResponse;
    }
}
