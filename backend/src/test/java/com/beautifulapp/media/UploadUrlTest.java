package com.beautifulapp.media;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.beautifulapp.ApiTestSupport;

class UploadUrlTest extends ApiTestSupport {

    @Test
    void publicKindsGetPublicUrlPrivateKindsDoNot() throws Exception {
        String token = read(login(newPhone()), "$.accessToken");
        String avatar = postJson("/media/upload-url", json("{'kind':'AVATAR','contentType':'image/webp','sizeBytes':1000}"), token, 200);
        assertThat(read(avatar, "$.key")).startsWith("avatar/").endsWith(".webp");
        assertThat(read(avatar, "$.uploadUrl")).contains("X-Amz-Signature");
        assertThat(read(avatar, "$.publicUrl")).isNotBlank();

        String receipt = postJson("/media/upload-url", json("{'kind':'RECEIPT','contentType':'image/jpeg','sizeBytes':1000}"), token, 200);
        assertThat(read(receipt, "$.publicUrl")).isNull();
    }

    @Test
    void rejectsWrongTypeAndTooLarge() throws Exception {
        String token = read(login(newPhone()), "$.accessToken");
        assertThat(read(postJson("/media/upload-url", json("{'kind':'AVATAR','contentType':'application/pdf','sizeBytes':1000}"), token, 400), "$.code"))
                .isEqualTo("MEDIA_TYPE");
        assertThat(read(postJson("/media/upload-url", json("{'kind':'AVATAR','contentType':'image/jpeg','sizeBytes':99999999}"), token, 400), "$.code"))
                .isEqualTo("MEDIA_SIZE");
    }
}
