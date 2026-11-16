package com.beautifulapp.scheduling.adapter.in.web;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.scheduling.WorkDay;
import com.beautifulapp.scheduling.adapter.in.web.SchedulingDtos.*;
import com.beautifulapp.scheduling.application.port.in.ManageSchedule;
import com.beautifulapp.scheduling.domain.WorkingHours;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/me")
@Tag(name = "schedule", description = "Expediente e bloqueios da profissional logada")
class WorkHoursController {
    private final ManageSchedule schedule;
    private final ProfileApi profiles;

    WorkHoursController(ManageSchedule schedule, ProfileApi profiles) {
        this.schedule = schedule;
        this.profiles = profiles;
    }

    private UUID pro() { return profiles.requireProfessionalId(CurrentAccount.id()); }

    private static List<WorkDay> days(List<WorkingHours> week) {
        return week.stream().map(w -> new WorkDay(w.weekday(), w.start(), w.end())).toList();
    }

    @Operation(summary = "Meu expediente (dias sem linha = folga)")
    @GetMapping("/work-hours")
    List<WorkDay> get() { return days(schedule.week(pro())); }

    @Operation(summary = "Substitui o expediente da semana")
    @PutMapping("/work-hours")
    List<WorkDay> put(@RequestBody List<@Valid WorkDayInput> body) {
        return days(schedule.replaceWeek(pro(), body.stream().map(d -> new WorkingHours(d.weekday(), d.start(), d.end())).toList()));
    }

    @Operation(summary = "Meus bloqueios futuros")
    @GetMapping("/blocks")
    List<BlockView> blocks() { return schedule.futureBlocks(pro()).stream().map(BlockView::of).toList(); }

    @Operation(summary = "Bloquear um período (folga, almoço…)")
    @PostMapping("/blocks")
    @ResponseStatus(HttpStatus.CREATED)
    BlockView addBlock(@Valid @RequestBody BlockInput in) {
        return BlockView.of(schedule.addBlock(pro(), in.startsAt(), in.endsAt(), in.reason()));
    }

    @Operation(summary = "Remover bloqueio")
    @DeleteMapping("/blocks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removeBlock(@PathVariable UUID id) { schedule.removeBlock(pro(), id); }
}
