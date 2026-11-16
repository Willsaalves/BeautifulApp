package com.beautifulapp.scheduling.adapter.in.web;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.scheduling.adapter.in.web.SchedulingDtos.*;
import com.beautifulapp.scheduling.application.port.in.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/** Adaptador HTTP: converte requisição em caso de uso e o resultado em JSON. Não tem regra de negócio. */
@RestController
@Tag(name = "appointments", description = "Agendamentos, sinal via Pix e ajuste de valor")
class AppointmentController {
    private final ClientAppointments client;
    private final ProfessionalAppointments professional;
    private final SharedAppointments shared;
    private final ManageSchedule schedule;
    private final ProfileApi profiles;
    private final Clock clock;

    AppointmentController(ClientAppointments client, ProfessionalAppointments professional, SharedAppointments shared, ManageSchedule schedule,
                          ProfileApi profiles, Clock clock) {
        this.client = client;
        this.professional = professional;
        this.shared = shared;
        this.schedule = schedule;
        this.profiles = profiles;
        this.clock = clock;
    }

    private UUID pro() { return profiles.requireProfessionalId(CurrentAccount.id()); }

    private static List<AppointmentView> views(List<AppointmentDetails> list) { return list.stream().map(AppointmentView::of).toList(); }

    @Operation(summary = "Horários do dia para um serviço (FREE / BUSY / PAST)")
    @GetMapping("/professionals/{id}/availability")
    List<Slot> availability(@PathVariable UUID id, @RequestParam LocalDate date, @RequestParam UUID serviceId) {
        return schedule.slots(id, serviceId, date).stream().map(Slot::of).toList();
    }

    // ---------- cliente ----------

    @Operation(summary = "Agendar (preço e sinal calculados no servidor)")
    @PostMapping("/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    AppointmentView create(@Valid @RequestBody CreateAppointment body) {
        Map<UUID, UUID> selections = body.selections() == null ? Map.of()
                : body.selections().stream().collect(Collectors.toMap(SelectionInput::optionId, SelectionInput::choiceId, (x, y) -> y));
        return AppointmentView.of(client.book(new BookAppointmentCommand(CurrentAccount.id(), body.serviceId(), body.startsAt(), selections,
                body.designId(), body.referenceKey(), body.notes(), body.voucherId())));
    }

    @Operation(summary = "Meus agendamentos (cliente)")
    @GetMapping("/me/appointments")
    List<AppointmentView> mine() { return views(client.mine(CurrentAccount.id())); }

    @Operation(summary = "Detalhe (cliente ou profissional do agendamento)")
    @GetMapping("/appointments/{id}")
    AppointmentView get(@PathVariable UUID id) { return AppointmentView.of(shared.get(CurrentAccount.id(), id)); }

    @Operation(summary = "Enviar comprovante do Pix (receiptKey de upload kind=RECEIPT)")
    @PostMapping("/appointments/{id}/receipt")
    AppointmentView receipt(@PathVariable UUID id, @Valid @RequestBody ReceiptInput body) {
        return AppointmentView.of(client.attachReceipt(CurrentAccount.id(), id, body.receiptKey()));
    }

    @Operation(summary = "Aceitar novo valor proposto")
    @PostMapping("/appointments/{id}/adjustment/accept")
    AppointmentView accept(@PathVariable UUID id) { return AppointmentView.of(client.respondAdjustment(CurrentAccount.id(), id, true)); }

    @Operation(summary = "Recusar novo valor proposto")
    @PostMapping("/appointments/{id}/adjustment/decline")
    AppointmentView decline(@PathVariable UUID id) { return AppointmentView.of(client.respondAdjustment(CurrentAccount.id(), id, false)); }

    @Operation(summary = "Cancelar (cliente ou profissional)")
    @PostMapping("/appointments/{id}/cancel")
    AppointmentView cancel(@PathVariable UUID id) { return AppointmentView.of(shared.cancel(CurrentAccount.id(), id)); }

    // ---------- profissional ----------

    @Operation(summary = "Minha agenda (profissional) no período; padrão: 7 dias atrás até 60 dias à frente")
    @GetMapping("/me/agenda")
    List<AppointmentView> agenda(@RequestParam(required = false) Instant from, @RequestParam(required = false) Instant to) {
        Instant now = clock.instant();
        return views(professional.agenda(pro(), from != null ? from : now.minus(Duration.ofDays(7)), to != null ? to : now.plus(Duration.ofDays(60))));
    }

    @Operation(summary = "Confirmar o sinal (comprovante ok)")
    @PostMapping("/appointments/{id}/confirm-deposit")
    AppointmentView confirm(@PathVariable UUID id) { return AppointmentView.of(professional.confirmDeposit(pro(), id)); }

    @Operation(summary = "Recusar comprovante")
    @PostMapping("/appointments/{id}/reject-receipt")
    AppointmentView reject(@PathVariable UUID id) { return AppointmentView.of(professional.rejectReceipt(pro(), id)); }

    @Operation(summary = "Propor novo valor")
    @PostMapping("/appointments/{id}/adjustment")
    AppointmentView adjust(@PathVariable UUID id, @Valid @RequestBody AdjustmentInput body) {
        return AppointmentView.of(professional.proposeAdjustment(pro(), id, body.newPriceCents(), body.note()));
    }

    @Operation(summary = "Concluir atendimento")
    @PostMapping("/appointments/{id}/complete")
    AppointmentView complete(@PathVariable UUID id) { return AppointmentView.of(professional.complete(pro(), id)); }
}
