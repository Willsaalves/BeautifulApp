package com.beautifulapp.scheduling.internal;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.catalog.CatalogApi;
import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.scheduling.internal.SchedulingDtos.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@Tag(name = "appointments", description = "Agendamentos, sinal via Pix e ajuste de valor")
class AppointmentController {
    private final AppointmentService appointments;
    private final AvailabilityService availability;
    private final CatalogApi catalog;
    private final ProfileApi profiles;
    private final Clock clock;

    AppointmentController(AppointmentService appointments, AvailabilityService availability, CatalogApi catalog, ProfileApi profiles, Clock clock) {
        this.appointments = appointments;
        this.availability = availability;
        this.catalog = catalog;
        this.profiles = profiles;
        this.clock = clock;
    }

    private UUID pro() { return profiles.requireProfessionalId(CurrentAccount.id()); }

    @Operation(summary = "Horários do dia para um serviço (FREE / BUSY / PAST)")
    @GetMapping("/professionals/{id}/availability")
    List<Slot> availability(@PathVariable UUID id, @RequestParam LocalDate date, @RequestParam UUID serviceId) {
        var svc = catalog.activeService(serviceId).filter(s -> s.professionalId().equals(id))
                .orElseThrow(() -> ApiException.notFound("SERVICE_NOT_FOUND", "Serviço não encontrado."));
        return availability.slots(id, date, svc.durationMin());
    }

    // ---------- cliente ----------

    @Operation(summary = "Agendar (preço e sinal calculados no servidor)")
    @PostMapping("/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    AppointmentView create(@Valid @RequestBody CreateAppointment body) {
        return appointments.create(CurrentAccount.id(), body);
    }

    @Operation(summary = "Meus agendamentos (cliente)")
    @GetMapping("/me/appointments")
    List<AppointmentView> mine() { return appointments.mine(CurrentAccount.id()); }

    @Operation(summary = "Detalhe (cliente ou profissional do agendamento)")
    @GetMapping("/appointments/{id}")
    AppointmentView get(@PathVariable UUID id) { return appointments.get(CurrentAccount.id(), id); }

    @Operation(summary = "Enviar comprovante do Pix (receiptKey de upload kind=RECEIPT)")
    @PostMapping("/appointments/{id}/receipt")
    AppointmentView receipt(@PathVariable UUID id, @Valid @RequestBody ReceiptInput body) {
        return appointments.attachReceipt(CurrentAccount.id(), id, body.receiptKey());
    }

    @Operation(summary = "Aceitar novo valor proposto")
    @PostMapping("/appointments/{id}/adjustment/accept")
    AppointmentView accept(@PathVariable UUID id) { return appointments.respondAdjustment(CurrentAccount.id(), id, true); }

    @Operation(summary = "Recusar novo valor proposto")
    @PostMapping("/appointments/{id}/adjustment/decline")
    AppointmentView decline(@PathVariable UUID id) { return appointments.respondAdjustment(CurrentAccount.id(), id, false); }

    @Operation(summary = "Cancelar (cliente ou profissional)")
    @PostMapping("/appointments/{id}/cancel")
    AppointmentView cancel(@PathVariable UUID id) { return appointments.cancel(CurrentAccount.id(), id); }

    // ---------- profissional ----------

    @Operation(summary = "Minha agenda (profissional) no período; padrão: 7 dias atrás até 60 dias à frente")
    @GetMapping("/me/agenda")
    List<AppointmentView> agenda(@RequestParam(required = false) Instant from, @RequestParam(required = false) Instant to) {
        Instant now = clock.instant();
        return appointments.agenda(pro(), from != null ? from : now.minus(Duration.ofDays(7)), to != null ? to : now.plus(Duration.ofDays(60)));
    }

    @Operation(summary = "Confirmar o sinal (comprovante ok)")
    @PostMapping("/appointments/{id}/confirm-deposit")
    AppointmentView confirm(@PathVariable UUID id) { return appointments.confirmDeposit(pro(), id); }

    @Operation(summary = "Recusar comprovante")
    @PostMapping("/appointments/{id}/reject-receipt")
    AppointmentView reject(@PathVariable UUID id) { return appointments.rejectReceipt(pro(), id); }

    @Operation(summary = "Propor novo valor")
    @PostMapping("/appointments/{id}/adjustment")
    AppointmentView adjust(@PathVariable UUID id, @Valid @RequestBody AdjustmentInput body) {
        return appointments.proposeAdjustment(pro(), id, body);
    }

    @Operation(summary = "Concluir atendimento")
    @PostMapping("/appointments/{id}/complete")
    AppointmentView complete(@PathVariable UUID id) { return appointments.complete(pro(), id); }
}
