package com.beautifulapp;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

/** Gera backend/openapi.json — o app gera o cliente TypeScript a partir dele (npm run api:gen). */
class OpenApiExportTest extends ApiTestSupport {
    @Test
    void exportsSpec() throws Exception {
        String spec = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Files.writeString(Path.of("openapi.json"), spec);
    }
}
