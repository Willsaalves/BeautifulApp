package com.beautifulapp.loyalty.internal;

import java.time.Clock;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.AppointmentCompleted;
import com.beautifulapp.common.Ids;
import com.beautifulapp.loyalty.LoyaltyApi;
import com.beautifulapp.loyalty.VoucherView;
import com.beautifulapp.profile.ProfileApi;

import jakarta.validation.constraints.*;

@Service
class LoyaltyService implements LoyaltyApi {
    static final int FEEDBACK_PERCENT = 10;

    private final ProgramRepository programs;
    private final BalanceRepository balances;
    private final VoucherRepository vouchers;
    private final ProfileApi profiles;
    private final Clock clock;
    private final ZoneId zone;

    LoyaltyService(ProgramRepository programs, BalanceRepository balances, VoucherRepository vouchers, ProfileApi profiles, Clock clock,
                   @Value("${app.scheduling.zone:America/Sao_Paulo}") String zone) {
        this.programs = programs;
        this.balances = balances;
        this.vouchers = vouchers;
        this.profiles = profiles;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    record ProgramView(boolean enabled, long goalCents, int discountPercent) {}

    record ProgramInput(boolean enabled, @Min(100) long goalCents, @Min(1) @Max(100) int discountPercent) {}

    record CardView(UUID professionalId, String studio, String photoUrl, boolean enabled, long goalCents, int discountPercent,
                    long spentCents, long inCycleCents, int percent, long remainingCents, int cycles) {}

    // ---------- programa (profissional) ----------

    @Transactional(readOnly = true)
    ProgramView program(UUID pro) {
        return programs.findById(pro).map(p -> new ProgramView(p.enabled, p.goalCents, p.discountPercent))
                .orElse(new ProgramView(false, 50_000, 10));
    }

    @Transactional
    ProgramView saveProgram(UUID pro, ProgramInput in) {
        LoyaltyProgram p = programs.findById(pro).orElseGet(() -> new LoyaltyProgram(pro, false, in.goalCents(), in.discountPercent()));
        p.enabled = in.enabled();
        p.goalCents = in.goalCents();
        p.discountPercent = in.discountPercent();
        programs.save(p);
        return program(pro);
    }

    // ---------- cartões e vouchers (cliente) ----------

    @Transactional(readOnly = true)
    List<CardView> cards(UUID client) {
        return balances.findByClientAccountId(client).stream().map(b -> {
            ProgramView prog = program(b.professionalId);
            var pro = profiles.publicProfessional(b.professionalId).orElse(null);
            long inCycle = b.spentCents % prog.goalCents();
            int percent = (int) Math.min(100, Math.round(inCycle * 100.0 / prog.goalCents()));
            return new CardView(b.professionalId, pro == null ? "" : pro.studio(), pro == null ? null : pro.photoUrl(),
                    prog.enabled(), prog.goalCents(), prog.discountPercent(), b.spentCents, inCycle, percent,
                    prog.goalCents() - inCycle, (int) (b.spentCents / prog.goalCents()));
        }).toList();
    }

    @Transactional(readOnly = true)
    List<VoucherView> vouchers(UUID client) {
        return vouchers.findByClientAccountIdOrderByCreatedAtDesc(client).stream().map(LoyaltyService::view).toList();
    }

    // ---------- API para outros módulos ----------

    @Override
    @Transactional
    public int redeem(UUID client, UUID pro, UUID voucherId, UUID appointmentId) {
        Voucher v = vouchers.findById(voucherId).filter(x -> x.clientAccountId.equals(client))
                .orElseThrow(() -> ApiException.badRequest("VOUCHER_INVALID", "Voucher não encontrado."));
        if (v.usedAt != null) throw ApiException.badRequest("VOUCHER_USED", "Esse voucher já foi usado.");
        if (v.professionalId != null && !v.professionalId.equals(pro)) {
            throw ApiException.badRequest("VOUCHER_OTHER_PROFESSIONAL", "Esse voucher é de outra profissional.");
        }
        v.usedAt = clock.instant();
        v.usedAppointmentId = appointmentId;
        return v.percent;
    }

    @Override
    @Transactional
    public void release(UUID appointmentId) {
        vouchers.findByUsedAppointmentId(appointmentId).forEach(v -> {
            v.usedAt = null;
            v.usedAppointmentId = null;
        });
    }

    @Override
    @Transactional
    public Optional<VoucherView> grantFeedbackVoucher(UUID client) {
        String ym = YearMonth.now(clock.withZone(zone)).toString();
        if (vouchers.existsByClientAccountIdAndKindAndYearMonth(client, "FEEDBACK", ym)) return Optional.empty();
        Voucher v = new Voucher(Ids.newId(), client, null, "FEEDBACK", FEEDBACK_PERCENT, "Bônus do mês por avaliar", clock.instant());
        v.yearMonth = ym;
        return Optional.of(view(vouchers.save(v)));
    }

    /** Soma o valor pago e emite um voucher para cada meta batida (idempotente por ciclo). */
    @EventListener
    @Transactional
    public void onCompleted(AppointmentCompleted e) {
        LoyaltyBalance b = balances.lock(e.clientAccountId(), e.professionalId())
                .orElseGet(() -> balances.save(new LoyaltyBalance(e.clientAccountId(), e.professionalId())));
        b.spentCents += e.paidCents();
        var prog = programs.findById(e.professionalId()).orElse(null);
        if (prog == null || !prog.enabled) return;
        int cycles = (int) (b.spentCents / prog.goalCents);
        String studio = profiles.publicProfessional(e.professionalId()).map(p -> p.studio()).orElse("");
        while (b.cyclesRewarded < cycles) {
            b.cyclesRewarded++;
            Voucher v = new Voucher(Ids.newId(), e.clientAccountId(), e.professionalId(), "LOYALTY", prog.discountPercent,
                    "Fidelidade " + studio, clock.instant());
            v.cycle = b.cyclesRewarded;
            vouchers.save(v);
        }
    }

    static VoucherView view(Voucher v) {
        return new VoucherView(v.id, v.professionalId, v.kind, v.percent, v.label, v.usedAt != null, v.createdAt);
    }
}
