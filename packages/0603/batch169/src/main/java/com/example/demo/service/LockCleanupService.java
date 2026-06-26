package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class LockCleanupService {

    private static final String USER_KEYS_PREFIX = "repeat_submit_user_keys:";

    private final RedissonClient redissonClient;
    private final RedisTemplate<String, Object> redisTemplate;

    public LockCleanupService(RedissonClient redissonClient,
                              RedisTemplate<String, Object> redisTemplate) {
        this.redissonClient = redissonClient;
        this.redisTemplate = redisTemplate;
    }

    public void trackUserLockKey(String userId, String lockKey, long ttlMs) {
        try {
            String userKeysKey = USER_KEYS_PREFIX + userId;
            redisTemplate.opsForSet().add(userKeysKey, lockKey);
            redisTemplate.expire(userKeysKey, ttlMs + 1000, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            log.warn("Failed to track lock key for user {}: {}", userId, e.getMessage());
        }
    }

    public void releaseUserLocks(String userId) {
        String userKeysKey = USER_KEYS_PREFIX + userId;
        Set<Object> lockKeys = redisTemplate.opsForSet().members(userKeysKey);
        if (lockKeys == null || lockKeys.isEmpty()) {
            return;
        }

        for (Object lockKeyObj : lockKeys) {
            String lockKey = (String) lockKeyObj;
            try {
                RLock rLock = redissonClient.getLock(lockKey);
                if (rLock.isLocked()) {
                    rLock.forceUnlock();
                    log.info("Force released lock for user {}: {}", userId, lockKey);
                }
            } catch (Exception e) {
                log.warn("Failed to release lock {} for user {}: {}", lockKey, userId, e.getMessage());
            }
        }

        redisTemplate.delete(userKeysKey);
    }
}
