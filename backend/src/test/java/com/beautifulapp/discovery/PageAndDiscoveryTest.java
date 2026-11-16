package com.beautifulapp.discovery;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.beautifulapp.ApiTestSupport;
import com.jayway.jsonpath.JsonPath;

class PageAndDiscoveryTest extends ApiTestSupport {

    static final String SERVICE = "{'name':'%s','niche':'%s','durationMin':60,'priceCents':%d,'depositPercent':30,'returnIntervalDays':21}";

    // Pinheiros (SP) e pontos de referência
    static final double LAT = -23.5614, LNG = -46.6820;

    @Test
    void pageStartsWithDefaultsAndRequiresFixedBlocks() throws Exception {
        String token = newProfessional("Bia Brows", "SOBRANCELHA", null, null);
        String defaults = getJson("/me/page/widgets", token);
        List<String> types = JsonPath.read(defaults, "$[*].type");
        assertThat(types).containsExactly("CAPA", "SERVICOS", "AGENDA", "GALERIA", "AVALIACOES");
        assertThat(read(defaults, "$[0].title")).isEqualTo("Bia Brows");

        String missing = send("PUT", "/me/page/widgets", json("[{'type':'CAPA'},{'type':'SERVICOS'}]"), token, 400);
        assertThat(read(missing, "$.code")).isEqualTo("PAGE_FIXED_REQUIRED");

        String cover = upload(token, "COVER");
        String photo = upload(token, "PORTFOLIO");
        String saved = send("PUT", "/me/page/widgets", json("""
                [{'type':'CAPA','title':'BIA BROWS','imageKey':'%s','color':'#E8DCF2'},
                 {'type':'CONTAGEM','title':'Black Friday','target':'2030-01-01T00:00:00Z'},
                 {'type':'AGENDA'},{'type':'SERVICOS'},
                 {'type':'GALERIA','title':'Portfólio','images':['%s']},
                 {'type':'PORCENTAGEM','title':'Agenda de dezembro','value':82}]""", cover, photo), token, 200);
        List<String> order = JsonPath.read(saved, "$[*].type");
        assertThat(order).containsExactly("CAPA", "CONTAGEM", "AGENDA", "SERVICOS", "GALERIA", "PORCENTAGEM");
        assertThat(read(saved, "$[0].imageUrl")).endsWith(cover);
        assertThat(read(saved, "$[4].imageUrls[0]")).endsWith(photo);
        assertThat(read(saved, "$[2].fixed")).isEqualTo("true");

        // salvar de novo com os mesmos ids funciona (o app reenvia a lista toda)
        String again = send("PUT", "/me/page/widgets", json("[{'id':'%s','type':'AGENDA'},{'type':'SERVICOS'}]", read(saved, "$[2].id")), token, 200);
        assertThat(read(again, "$[0].id")).isEqualTo(read(saved, "$[2].id"));
    }

    @Test
    void pageRejectsSomeoneElsesImage() throws Exception {
        String token = newProfessional("A", "UNHA", null, null);
        String foreign = upload(newProfessional("B", "UNHA", null, null), "COVER");
        String body = send("PUT", "/me/page/widgets", json("[{'type':'CAPA','imageKey':'%s'},{'type':'SERVICOS'},{'type':'AGENDA'}]", foreign), token, 400);
        assertThat(read(body, "$.code")).isEqualTo("MEDIA_NOT_OWNED");
    }

    @Test
    void searchByNicheDistanceAndText() throws Exception {
        String tag = "t" + System.nanoTime(); // isola dos dados de outros testes
        String near = newProfessional("Perto " + tag, "UNHA", LAT + 0.009, LNG);       // ~1 km
        String far = newProfessional("Longe " + tag, "UNHA", LAT + 0.09, LNG);         // ~10 km
        String lash = newProfessional("Lash " + tag, "CILIOS", LAT, LNG + 0.005);      // nicho diferente
        postJson("/me/services", json(SERVICE, "Manutenção de gel", "UNHA", 12000), near, 201);
        postJson("/me/services", json(SERVICE, "Alongamento em gel", "UNHA", 18000), near, 201);
        postJson("/me/services", json(SERVICE, "Esmaltação", "UNHA", 5000), far, 201);
        postJson("/me/services", json(SERVICE, "Volume russo", "CILIOS", 22000), lash, 201);
        String client = newClient();

        String all = getJson("/professionals?niche=UNHA&q=" + tag + "&lat=" + LAT + "&lng=" + LNG, client);
        List<String> studios = JsonPath.read(all, "$[*].studio");
        assertThat(studios).containsExactly("Perto " + tag, "Longe " + tag);
        assertThat(((Number) JsonPath.read(all, "$[0].distanceKm")).doubleValue()).isBetween(0.8, 1.2);
        assertThat(read(all, "$[0].minPriceCents")).isEqualTo("12000");
        assertThat(read(all, "$[0].servicesCount")).isEqualTo("2");

        String within5 = getJson("/professionals?niche=UNHA&q=" + tag + "&lat=" + LAT + "&lng=" + LNG + "&radiusKm=5", client);
        assertThat((List<String>) JsonPath.read(within5, "$[*].studio")).containsExactly("Perto " + tag);

        // busca por nome do serviço + nicho do serviço
        String volume = getJson("/professionals?q=Volume&niche=CILIOS&lat=" + LAT + "&lng=" + LNG, client);
        assertThat((List<String>) JsonPath.read(volume, "$[*].studio")).contains("Lash " + tag);
    }

    @Test
    void publicPageAndTrendingDesigns() throws Exception {
        String pro = newProfessional("Camila Nails", "UNHA", LAT, LNG);
        String serviceId = read(postJson("/me/services", json(SERVICE, "Alongamento", "UNHA", 18000), pro, 201), "$.id");
        String key = upload(pro, "DESIGN");
        postJson("/me/designs", json("{'serviceId':'%s','name':'PINK','imageKey':'%s','priceDeltaCents':0}", serviceId, key), pro, 201);
        String proId = read(getJson("/me", pro), "$.professional.id");

        String client = newClient();
        String page = getJson("/professionals/" + proId, client);
        assertThat(read(page, "$.professional.studio")).isEqualTo("Camila Nails");
        assertThat(read(page, "$.services[0].name")).isEqualTo("Alongamento");
        assertThat(read(page, "$.designs[0].name")).isEqualTo("PINK");
        assertThat(read(page, "$.widgets[0].type")).isEqualTo("CAPA");

        String trending = getJson("/designs/trending?niche=UNHA&lat=" + LAT + "&lng=" + LNG, client);
        assertThat(trending).contains("PINK").contains(proId);

        send("GET", "/professionals/00000000-0000-7000-8000-000000000000", null, client, 404);
    }

    @Test
    void favorites() throws Exception {
        String pro = newProfessional("Fav Studio", "UNHA", null, null);
        String proId = read(getJson("/me", pro), "$.professional.id");
        String client = newClient();

        send("PUT", "/me/favorites/" + proId, null, client, 204);
        send("PUT", "/me/favorites/" + proId, null, client, 204); // idempotente
        assertThat(read(getJson("/me", client), "$.favorites[0]")).isEqualTo(proId);
        assertThat(read(getJson("/me/favorites", client), "$.length()")).isEqualTo("1");

        send("DELETE", "/me/favorites/" + proId, null, client, 204);
        assertThat(read(getJson("/me/favorites", client), "$.length()")).isEqualTo("0");
        send("PUT", "/me/favorites/00000000-0000-7000-8000-000000000000", null, client, 404);
    }

    @Test
    void professionalSetsLocationLater() throws Exception {
        String pro = newProfessional("Sem Local", "UNHA", null, null);
        String me = send("PATCH", "/me/professional", json("{'latitude':%s,'longitude':%s}", LAT, LNG), pro, 200);
        assertThat(read(me, "$.professional.latitude")).isEqualTo(String.valueOf(LAT));
        String half = send("PATCH", "/me/professional", json("{'latitude':%s}", LAT), pro, 400);
        assertThat(read(half, "$.code")).isEqualTo("LOCATION_INCOMPLETE");
    }
}
