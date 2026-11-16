package com.beautifulapp.scheduling.internal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.common.Ids;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.scheduling.WorkDay;
import com.beautifulapp.scheduling.internal.SchedulingDtos.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/me")
@Tag(name = "schedule", description = "Expediente e bloqueios da profissional logada")
class WorkHoursController {
    private final WorkHoursRepository workHours;
    private final TimeBlockRepository blocks;
    private final AvailabilityService availability;
    private final ProfileApi profiles;
    private final Clock clock;

    WorkHoursController(WorkHoursRepository workHours, TimeBlockRepository blocks, AvailabilityService availability, ProfileApi profiles, Clock clock) {
        this.workHours = workHours;
        this.blocks = blocks;
        this.availability = availability;
        this.profiles = profiles;
        this.clock = clock;
    }

    private UUID pro() { return profiles.requireProfessionalId(CurrentAccount.id()); }

    @Operation(summary = "Meu expediente (dias sem linha = folga)")
    @GetMapping("/work-hours")
    List<WorkDay> get() { return availability.workHours(pro()); }

    @Operation(summary = "Substitui o expediente da semana")
    @PutMapping("/work-hours")
    @Transactional
    List<WorkDay> put(@RequestBody List<@Valid WorkDayInput> body) {
        UUID pro = pro();
        if (body.stream().map(WorkDayInput::weekday).distinct().count() != body.size()) {
            throw ApiException.badRequest("WORKDAY_DUPLICATED", "Cada dia da semana só pode aparecer uma vez.");
        }
        for (WorkDayInput d : body) {
            if (!d.end().isAfter(d.start())) throw ApiException.badRequest("WORKDAY_INVALID", "O fim do expediente precisa ser depois do início.");
        }
        workHours.deleteAllOf(pro);
        body.forEach(d -> workHours.save(new WorkHours(pro, (short) d.weekday(), d.start(), d.end())));
        return availability.workHours(pro);
    }

    @Operation(summary = "Meus bloqueios futuros")
    @GetMapping("/blocks")
    List<BlockView> blocks() {
        Instant now = clock.instant();
        return blocks.overlapping(pro(), now, now.plus(Duration.ofDays(365))).stream()
                .map(b -> new BlockView(b.id, b.startsAt, b.endsAt, b.reason)).toList();
    }

    @Operation(summary = "Bloquear um período (folga, almoço…)")
    @PostMapping("/blocks")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    BlockView addBlock(@Valid @RequestBody BlockInput in) {
        if (!in.endsAt().isAfter(in.startsAt())) throw ApiException.badRequest("BLOCK_INVALID", "O fim precisa ser depois do início.");
        TimeBlock b = blocks.save(new TimeBlock(Ids.newId(), pro(), in.startsAt(), in.endsAt(), in.reason(), clock.instant()));
        return new BlockView(b.id, b.startsAt, b.endsAt, b.reason);
    }

    @Operation(summary = "Remover bloqueio")
    @DeleteMapping("/blocks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void removeBlock(@PathVariable UUID id) {
        UUID pro = pro();
        blocks.findById(id).filter(b -> b.professionalId.equals(pro)).ifPresent(blocks::delete);
    }
}
