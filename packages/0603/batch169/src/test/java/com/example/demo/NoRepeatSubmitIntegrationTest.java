package com.example.demo;

import com.example.demo.controller.TestController;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NoRepeatSubmitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private TestController.SubmitRequest testRequest;

    @BeforeEach
    void setUp() {
        testRequest = new TestController.SubmitRequest();
        testRequest.setName("testUser");
        testRequest.setContent("testContent");
    }

    @Test
    void testNormalRequest_Success() throws Exception {
        String requestBody = objectMapper.writeValueAsString(testRequest);

        MvcResult result = mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("提交成功"))
                .andExpect(jsonPath("$.data.name").value("testUser"))
                .andReturn();

        assertNotNull(result.getResponse().getContentAsString());
    }

    @Test
    void testRepeatRequestWithinOneSecond_Returns409() throws Exception {
        String requestBody = objectMapper.writeValueAsString(testRequest);

        mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(409))
                .andExpect(jsonPath("$.message").value("请勿在1秒内重复提交"));
    }

    @Test
    void testDifferentUsers_DoNotInterfere() throws Exception {
        String requestBody = objectMapper.writeValueAsString(testRequest);

        mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_A")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_B")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_C")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk());
    }

    @Test
    void testRequestAfterInterval_Success() throws Exception {
        String requestBody = objectMapper.writeValueAsString(testRequest);

        mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk());

        Thread.sleep(1100);

        mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk());
    }

    @Test
    void testDifferentParams_AllowSubmit() throws Exception {
        TestController.SubmitRequest request1 = new TestController.SubmitRequest();
        request1.setName("user1");
        request1.setContent("content1");

        TestController.SubmitRequest request2 = new TestController.SubmitRequest();
        request2.setName("user1");
        request2.setContent("content2");

        mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/testSubmit")
                        .header("X-User-Id", "user_4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isOk());
    }
}
