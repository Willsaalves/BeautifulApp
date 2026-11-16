package com.beautifulapp.profile.internal;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.CurrentAccount;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/me/favorites")
@Tag(name = "me")
class FavoriteController {
    private final FavoriteRepository favorites;
    private final ProfessionalRepository professionals;
    private final Clock clock;

    FavoriteController(FavoriteRepository favorites, ProfessionalRepository professionals, Clock clock) {
        this.favorites = favorites;
        this.professionals = professionals;
        this.clock = clock;
    }

    @Operation(summary = "Ids das profissionais favoritas (mais recentes primeiro)")
    @GetMapping
    List<UUID> list() {
        return favorites.findByClientAccountIdOrderByCreatedAtDesc(CurrentAccount.id()).stream().map(Favorite::professionalId).toList();
    }

    @Operation(summary = "Favoritar profissional (idempotente)")
    @PutMapping("/{professionalId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void add(@PathVariable UUID professionalId) {
        if (!professionals.existsById(professionalId)) throw ApiException.notFound("PROFESSIONAL_NOT_FOUND", "Profissional não encontrada.");
        UUID me = CurrentAccount.id();
        if (!favorites.existsById(new Favorite.Key(me, professionalId))) favorites.save(new Favorite(me, professionalId, clock.instant()));
    }

    @Operation(summary = "Desfavoritar (idempotente)")
    @DeleteMapping("/{professionalId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void remove(@PathVariable UUID professionalId) {
        favorites.deleteById(new Favorite.Key(CurrentAccount.id(), professionalId));
    }
}
