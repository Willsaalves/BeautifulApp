package com.beautifulapp.discovery.internal;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.*;

import com.beautifulapp.discovery.internal.DiscoveryDtos.*;
import com.beautifulapp.profile.Niche;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "discovery", description = "Encontrar profissionais e designs")
class DiscoveryController {
    private final DiscoveryService discovery;

    DiscoveryController(DiscoveryService discovery) { this.discovery = discovery; }

    @Operation(summary = "Buscar profissionais por nicho, texto e distância (lat/lng da cliente)")
    @GetMapping("/professionals")
    List<ProfessionalCard> search(@RequestParam(required = false) Niche niche,
                                  @RequestParam(required = false) String q,
                                  @RequestParam(required = false) Double lat,
                                  @RequestParam(required = false) Double lng,
                                  @RequestParam(required = false) Double radiusKm,
                                  @RequestParam(defaultValue = "30") int limit) {
        return discovery.search(new DiscoveryService.Query(niche, q, lat, lng, radiusKm, limit));
    }

    @Operation(summary = "Página pública da profissional: perfil + serviços + designs + blocos")
    @GetMapping("/professionals/{id}")
    PublicPage page(@PathVariable UUID id) {
        return discovery.page(id);
    }

    @Operation(summary = "Vitrine de Trending Designs (mais perto / mais recentes)")
    @GetMapping("/designs/trending")
    List<TrendingDesign> trending(@RequestParam(required = false) Niche niche,
                                  @RequestParam(required = false) Double lat,
                                  @RequestParam(required = false) Double lng,
                                  @RequestParam(defaultValue = "20") int limit) {
        return discovery.trending(niche, lat, lng, limit);
    }
}
