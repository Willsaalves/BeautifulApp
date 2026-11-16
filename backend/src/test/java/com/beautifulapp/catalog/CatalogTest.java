package com.beautifulapp.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.beautifulapp.ApiTestSupport;

class CatalogTest extends ApiTestSupport {

    static final String SERVICE = """
            {'name':'Alongamento em gel','niche':'UNHA','durationMin':150,'priceCents':18000,'depositPercent':30,
             'returnIntervalDays':21,'requiresReference':true,
             'options':[{'label':'Formato','choices':[{'label':'Quadrada','priceDeltaCents':0},{'label':'Stiletto','priceDeltaCents':2000}]}]}""";

    @Test
    void professionalManagesServicesKeepingOptionIds() throws Exception {
        String token = newProfessional("Camila Nails", "UNHA", null, null);
        String created = postJson("/me/services", json(SERVICE), token, 201);
        String id = read(created, "$.id");
        String optionId = read(created, "$.options[0].id");
        String stilettoId = read(created, "$.options[0].choices[1].id");
        assertThat(read(created, "$.options[0].choices[1].priceDeltaCents")).isEqualTo("2000");

        // edita: mantém a opção e a escolha Stiletto (por id), troca o preço e adiciona outra opção
        String updated = send("PUT", "/me/services/" + id, json("""
                {'name':'Alongamento em gel','niche':'UNHA','durationMin':150,'priceCents':19000,'depositPercent':30,'returnIntervalDays':21,
                 'options':[{'id':'%s','label':'Formato','choices':[{'id':'%s','label':'Stiletto','priceDeltaCents':2500}]},
                            {'label':'Tamanho','choices':[{'label':'Longo','priceDeltaCents':3000}]}]}""", optionId, stilettoId), token, 200);
        assertThat(read(updated, "$.priceCents")).isEqualTo("19000");
        assertThat(read(updated, "$.options[0].id")).isEqualTo(optionId);
        assertThat(read(updated, "$.options[0].choices[0].id")).isEqualTo(stilettoId);
        assertThat(read(updated, "$.options[0].choices[0].priceDeltaCents")).isEqualTo("2500");
        assertThat(read(updated, "$.options[1].label")).isEqualTo("Tamanho");
        assertThat(read(updated, "$.options.length()")).isEqualTo("2");

        assertThat(read(getJson("/me/services", token), "$.length()")).isEqualTo("1");
        send("DELETE", "/me/services/" + id, null, token, 204);
        assertThat(read(getJson("/me/services", token), "$.length()")).isEqualTo("0");
    }

    @Test
    void clientCannotManageServices() throws Exception {
        String body = postJson("/me/services", json(SERVICE), newClient(), 403);
        assertThat(read(body, "$.code")).isEqualTo("NOT_PROFESSIONAL");
    }

    @Test
    void cannotEditAnotherProfessionalsService() throws Exception {
        String a = newProfessional("Studio A", "UNHA", null, null);
        String b = newProfessional("Studio B", "UNHA", null, null);
        String id = read(postJson("/me/services", json(SERVICE), a, 201), "$.id");
        send("PUT", "/me/services/" + id, json(SERVICE), b, 404);
    }

    @Test
    void invalidServiceIsRejected() throws Exception {
        String body = postJson("/me/services", json("{'name':'X','niche':'UNHA','durationMin':2,'priceCents':-1,'depositPercent':150,'returnIntervalDays':10}"),
                newProfessional("S", "UNHA", null, null), 400);
        assertThat(read(body, "$.code")).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void designsUseOwnUploadedImageAndOwnService() throws Exception {
        String token = newProfessional("Camila Nails", "UNHA", null, null);
        String serviceId = read(postJson("/me/services", json(SERVICE), token, 201), "$.id");
        String key = upload(token, "DESIGN");

        String design = postJson("/me/designs", json("{'serviceId':'%s','name':'pink','imageKey':'%s','priceDeltaCents':3500}", serviceId, key), token, 201);
        assertThat(read(design, "$.name")).isEqualTo("PINK");
        assertThat(read(design, "$.imageUrl")).endsWith(key);

        // aceita a URL pública no lugar da chave (o app guarda URLs)
        String byUrl = postJson("/me/designs", json("{'serviceId':'%s','name':'MEGA','imageKey':'%s','priceDeltaCents':0}",
                serviceId, read(design, "$.imageUrl")), token, 201);
        assertThat(read(byUrl, "$.imageKey")).isEqualTo(key);

        // imagem de outra conta → recusado
        String foreign = upload(newProfessional("Outra", "UNHA", null, null), "DESIGN");
        assertThat(read(postJson("/me/designs", json("{'serviceId':'%s','name':'X','imageKey':'%s','priceDeltaCents':0}", serviceId, foreign), token, 400), "$.code"))
                .isEqualTo("MEDIA_NOT_OWNED");

        assertThat(read(getJson("/me/designs", token), "$.length()")).isEqualTo("2");
        send("DELETE", "/me/designs/" + read(design, "$.id"), null, token, 204);
        assertThat(read(getJson("/me/designs", token), "$.length()")).isEqualTo("1");
    }
}
