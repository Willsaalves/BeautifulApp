package com.beautifulapp.profile.internal;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.common.Ids;
import com.beautifulapp.profile.Niche;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** "Seus próximos procedimentos": o plano da cliente (unhas, cílios, criolipólise… e até quando). */
@Entity
@Table(name = "next_procedure")
class NextProcedure {
    @Id UUID id;
    @Column(name = "client_account_id", nullable = false) UUID clientAccountId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) Niche niche;
    @Column(nullable = false) String label;
    @Column(name = "target_date", nullable = false) LocalDate targetDate;
    @Column(nullable = false) boolean done;
    @Column(nullable = false) int position;

    protected NextProcedure() {}
}

interface NextProcedureRepository extends JpaRepository<NextProcedure, UUID> {
    List<NextProcedure> findByClientAccountIdOrderByPosition(UUID clientAccountId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from NextProcedure n where n.clientAccountId = :client")
    void deleteAllOf(UUID client);
}

@RestController
@RequestMapping("/me/next-procedures")
@Tag(name = "me")
class NextProcedureController {
    private final NextProcedureRepository repo;

    NextProcedureController(NextProcedureRepository repo) { this.repo = repo; }

    record Item(UUID id, @NotNull Niche niche, @NotBlank @Size(max = 80) String label, @NotNull LocalDate targetDate, boolean done) {}

    @Operation(summary = "Meus próximos procedimentos")
    @GetMapping
    @Transactional(readOnly = true)
    List<Item> list() {
        return repo.findByClientAccountIdOrderByPosition(CurrentAccount.id()).stream()
                .map(n -> new Item(n.id, n.niche, n.label, n.targetDate, n.done)).toList();
    }

    @Operation(summary = "Salva a lista inteira (ordem, feitos e datas)")
    @PutMapping
    @Transactional
    List<Item> replace(@RequestBody List<@Valid Item> body) {
        if (body.size() > 30) throw ApiException.badRequest("TOO_MANY", "Máximo de 30 procedimentos.");
        UUID me = CurrentAccount.id();
        repo.deleteAllOf(me);
        for (int i = 0; i < body.size(); i++) {
            Item it = body.get(i);
            NextProcedure n = new NextProcedure();
            n.id = it.id() != null ? it.id() : Ids.newId();
            n.clientAccountId = me;
            n.niche = it.niche();
            n.label = it.label().trim();
            n.targetDate = it.targetDate();
            n.done = it.done();
            n.position = i;
            repo.save(n);
        }
        return list();
    }
}
