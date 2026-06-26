package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class IdempotentTokenService {

    private static final String TOKEN_KEY_PREFIX = "idempotent_token:";
    private static final long TOKEN_TTL_MINUTES = 5;

    private final StringRedisTemplate stringRedisTemplate;
    private final DefaultRedisScript<Long> consumeTokenScript;

    public IdempotentTokenService(StringRedisTemplate stringRedisTemplate,
                                  DefaultRedisScript<Long> consumeTokenScript) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.consumeTokenScript = consumeTokenScript;
    }

    public String generateToken(String userId) {
        String token = UUID.randomUUID().toString().replace("-", "");
        String redisKey = TOKEN_KEY_PREFIX + token;
        stringRedisTemplate.opsForValue().set(redisKey, userId, TOKEN_TTL_MINUTES, TimeUnit.MINUTES);
        log.debug("Generated idempotent token for user {}: {}", userId, token);
        return token;
    }

    public boolean validateAndConsume(String token) {
        String redisKey = TOKEN_KEY_PREFIX + token;
        Long result = stringRedisTemplate.execute(consumeTokenScript,
                Collections.singletonList(redisKey),
                "1");
        return result != null && result > 0;
    }
}
