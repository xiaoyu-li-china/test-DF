package com.example.demo.controller;

import com.example.demo.annotation.IdempotentToken;
import com.example.demo.annotation.NoRepeatSubmit;
import com.example.demo.service.IdempotentTokenService;
import com.example.demo.service.LockCleanupService;
import lombok.Data;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TestController {

    private final LockCleanupService lockCleanupService;
    private final IdempotentTokenService idempotentTokenService;

    public TestController(LockCleanupService lockCleanupService,
                          IdempotentTokenService idempotentTokenService) {
        this.lockCleanupService = lockCleanupService;
        this.idempotentTokenService = idempotentTokenService;
    }

    @GetMapping("/token")
    public Map<String, Object> getToken(HttpServletRequest request) {
        String userId = request.getHeader("X-User-Id");
        if (userId == null) {
            userId = "anonymous";
        }
        String token = idempotentTokenService.generateToken(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("token", token);
        result.put("message", "Token获取成功，5分钟内有效，提交时需通过X-Idempotent-Token头携带");
        return result;
    }

    @PostMapping("/submit")
    @NoRepeatSubmit(interval = 3000, message = "请勿在3秒内重复提交")
    public Map<String, Object> submit(@RequestBody SubmitRequest request) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "提交成功");
        result.put("data", request);
        return result;
    }

    @PostMapping("/testSubmit")
    @NoRepeatSubmit(interval = 1000, message = "请勿在1秒内重复提交")
    public Map<String, Object> testSubmit(@RequestBody SubmitRequest request) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "提交成功");
        result.put("data", request);
        return result;
    }

    @PostMapping("/order")
    @NoRepeatSubmit
    public Map<String, Object> createOrder(@RequestBody OrderRequest request) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "订单创建成功");
        result.put("data", request);
        return result;
    }

    @PostMapping("/transfer")
    @IdempotentToken
    public Map<String, Object> transfer(@RequestBody TransferRequest request) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "转账成功");
        result.put("data", request);
        return result;
    }

    @PostMapping("/payment")
    @NoRepeatSubmit(interval = 3000, message = "请勿在3秒内重复提交")
    @IdempotentToken(message = "无效的支付凭证，请重新获取Token")
    public Map<String, Object> payment(@RequestBody PaymentRequest request) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "支付成功");
        result.put("data", request);
        return result;
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        String userId = request.getHeader("X-User-Id");
        if (userId != null) {
            lockCleanupService.releaseUserLocks(userId);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "登出成功，已释放该用户所有防重复提交锁");
        return result;
    }

    @Data
    public static class SubmitRequest {
        private String name;
        private String content;
    }

    @Data
    public static class OrderRequest {
        private String orderNo;
        private Integer amount;
    }

    @Data
    public static class TransferRequest {
        private String fromAccount;
        private String toAccount;
        private Integer amount;
    }

    @Data
    public static class PaymentRequest {
        private String orderId;
        private Integer amount;
        private String payMethod;
    }
}
