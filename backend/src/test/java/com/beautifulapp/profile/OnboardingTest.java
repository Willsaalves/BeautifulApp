package com.beautifulapp.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.beautifulapp.ApiTestSupport;

class OnboardingTest extends ApiTestSupport {

    private String token() throws Exception {
        return read(login(newPhone()), "$.accessToken");
    }

    @Test
    void clientOnboardingCreatesProfileRoleAndHandle() throws Exception {
        String token = token();
        String me = postJson("/me/onboarding", json(
                "{'role':'CLIENT','name':'Bruna Álves','bio':'Amo unhas 💜','acceptedTerms':true,'imageConsent':true}"), token, 200);
        assertThat(read(me, "$.roles[0]")).isEqualTo("CLIENT");
        assertThat(read(me, "$.client.handle")).startsWith("brunaalves");
        assertThat(read(me, "$.client.bio")).isEqualTo("Amo unhas 💜");

        // relogar agora devolve isNew=false
        String again = mvc.perform(get("/me").header("Authorization", "Bearer " + token)).andReturn().getResponse().getContentAsString();
        assertThat(read(again, "$.client.name")).isEqualTo("Bruna Álves");
    }

    @Test
    void sameNameGetsDifferentHandle() throws Exception {
        String a = postJson("/me/onboarding", json("{'role':'CLIENT','name':'Ana Paula','acceptedTerms':true}"), token(), 200);
        String b = postJson("/me/onboarding", json("{'role':'CLIENT','name':'Ana Paula','acceptedTerms':true}"), token(), 200);
        assertThat(read(a, "$.client.handle")).isNotEqualTo(read(b, "$.client.handle"));
    }

    @Test
    void termsAreRequired() throws Exception {
        String body = postJson("/me/onboarding", json("{'role':'CLIENT','name':'Bruna','acceptedTerms':false}"), token(), 400);
        assertThat(read(body, "$.code")).isEqualTo("VALIDATION_ERROR");
        assertThat(read(body, "$.fields.acceptedTerms")).isNotBlank();
    }

    @Test
    void professionalNeedsStudioNicheAndNeighborhood() throws Exception {
        String token = token();
        String err = postJson("/me/onboarding", json("{'role':'PROFESSIONAL','name':'Camila','acceptedTerms':true}"), token, 400);
        assertThat(read(err, "$.code")).isEqualTo("PROFESSIONAL_FIELDS");

        String me = postJson("/me/onboarding", json(
                "{'role':'PROFESSIONAL','name':'Camila Rocha','studio':'Camila Nails','niche':'UNHA','neighborhood':'Pinheiros','pixKey':'camila@pix.com','acceptedTerms':true}"),
                token, 200);
        assertThat(read(me, "$.professional.handle")).startsWith("camilanails");
        assertThat(read(me, "$.professional.depositDeadlineHours")).isEqualTo("12");
        assertThat(read(me, "$.professional.city")).isEqualTo("São Paulo");

        // não pode criar duas vezes
        String dup = postJson("/me/onboarding", json(
                "{'role':'PROFESSIONAL','name':'Camila Rocha','studio':'Camila Nails','niche':'UNHA','neighborhood':'Pinheiros','acceptedTerms':true}"),
                token, 409);
        assertThat(read(dup, "$.code")).isEqualTo("PROFILE_EXISTS");
    }

    @Test
    void canHaveBothRoles() throws Exception {
        String token = token();
        postJson("/me/onboarding", json("{'role':'CLIENT','name':'Camila','acceptedTerms':true}"), token, 200);
        String me = postJson("/me/onboarding", json(
                "{'role':'PROFESSIONAL','name':'Camila','studio':'Studio C','niche':'CILIOS','neighborhood':'Centro','acceptedTerms':true}"), token, 200);
        assertThat(me).contains("CLIENT").contains("PROFESSIONAL");
    }

    @Test
    void editProfileWithOwnUploadedPhotoAndCover() throws Exception {
        String token = token();
        postJson("/me/onboarding", json("{'role':'CLIENT','name':'Bruna','acceptedTerms':true}"), token, 200);
        String avatar = read(postJson("/media/upload-url", json("{'kind':'AVATAR','contentType':'image/jpeg','sizeBytes':200000}"), token, 200), "$.key");
        String cover = read(postJson("/media/upload-url", json("{'kind':'COVER','contentType':'image/png','sizeBytes':500000}"), token, 200), "$.key");

        String me = mvc.perform(patch("/me/client-profile").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'photoKey':'%s','coverKey':'%s','bio':'Nova bio'}", avatar, cover)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(read(me, "$.client.photoUrl")).endsWith(avatar);
        assertThat(read(me, "$.client.coverUrl")).endsWith(cover);
        assertThat(read(me, "$.client.bio")).isEqualTo("Nova bio");
    }

    @Test
    void professionalSwitchingToClientAreaCanEditClientProfile() throws Exception {
        String token = token();
        postJson("/me/onboarding", json(
                "{'role':'PROFESSIONAL','name':'Willian','studio':'Studio W','niche':'CABELO','neighborhood':'Centro','acceptedTerms':true}"), token, 200);
        String avatar = read(postJson("/media/upload-url", json("{'kind':'AVATAR','contentType':'image/jpeg','sizeBytes':1000}"), token, 200), "$.key");

        String me = mvc.perform(patch("/me/client-profile").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json("{'photoKey':'%s'}", avatar)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(read(me, "$.client.name")).isEqualTo("Willian");
        assertThat(read(me, "$.client.photoUrl")).endsWith(avatar);
        assertThat(me).contains("CLIENT").contains("PROFESSIONAL");
    }

    @Test
    void cannotUseSomeoneElsesPhoto() throws Exception {
        String other = token();
        String foreignKey = read(postJson("/media/upload-url", json("{'kind':'AVATAR','contentType':'image/jpeg','sizeBytes':1000}"), other, 200), "$.key");

        String token = token();
        String body = postJson("/me/onboarding", json("{'role':'CLIENT','name':'Bruna','photoKey':'%s','acceptedTerms':true}", foreignKey), token, 400);
        assertThat(read(body, "$.code")).isEqualTo("MEDIA_NOT_OWNED");
    }
}
