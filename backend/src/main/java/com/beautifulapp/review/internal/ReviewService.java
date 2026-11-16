package com.beautifulapp.review.internal;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import com.beautifulapp.common.ApiException;
import com.beautifulapp.common.CurrentAccount;
import com.beautifulapp.common.Ids;
import com.beautifulapp.loyalty.LoyaltyApi;
import com.beautifulapp.loyalty.VoucherView;
import com.beautifulapp.profile.ProfileApi;
import com.beautifulapp.review.ReviewApi;
import com.beautifulapp.scheduling.SchedulingApi;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

@Service
class ReviewService implements ReviewApi {
    private final ReviewRepository reviews;
    private final SchedulingApi scheduling;
    private final LoyaltyApi loyalty;
    private final ProfileApi profiles;
    private final Clock clock;

    ReviewService(ReviewRepository reviews, SchedulingApi scheduling, LoyaltyApi loyalty, ProfileApi profiles, Clock clock) {
        this.reviews = reviews;
        this.scheduling = scheduling;
        this.loyalty = loyalty;
        this.profiles = profiles;
        this.clock = clock;
    }

    record ReviewInput(@Min(1) @Max(5) int rating, @Size(max = 500) String comment) {}

    record ReviewResult(ReviewView review, VoucherView voucher) {}

    record MyReview(UUID appointmentId, UUID professionalId, int rating, String comment) {}

    @Transactional
    ReviewResult create(UUID client, UUID appointmentId, ReviewInput in) {
        var a = scheduling.appointment(appointmentId).filter(x -> x.clientAccountId().equals(client))
                .orElseThrow(() -> ApiException.notFound("APPOINTMENT_NOT_FOUND", "Agendamento não encontrado."));
        if (!"COMPLETED".equals(a.status())) throw ApiException.conflict("NOT_COMPLETED", "Só dá para avaliar depois do atendimento concluído.");
        if (reviews.existsByAppointmentId(appointmentId)) throw ApiException.conflict("ALREADY_REVIEWED", "Você já avaliou este atendimento.");
        Review r = reviews.save(new Review(Ids.newId(), appointmentId, client, a.professionalId(), in.rating(),
                StringUtils.hasText(in.comment()) ? in.comment().trim() : null, clock.instant()));
        VoucherView voucher = loyalty.grantFeedbackVoucher(client).orElse(null);
        return new ReviewResult(view(r), voucher);
    }

    @Transactional(readOnly = true)
    List<MyReview> mine(UUID client) {
        return reviews.findByClientAccountIdOrderByCreatedAtDesc(client).stream()
                .map(r -> new MyReview(r.appointmentId, r.professionalId, r.rating, r.comment)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewView> recent(UUID professionalId, int limit) {
        return reviews.findByProfessionalIdAndHiddenAtIsNullOrderByCreatedAtDesc(professionalId, PageRequest.of(0, Math.min(Math.max(limit, 1), 50)))
                .stream().map(this::view).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Summary summary(UUID professionalId) {
        Object[] row = reviews.summary(professionalId).get(0);
        double avg = ((Number) row[0]).doubleValue();
        return new Summary(Math.round(avg * 10) / 10.0, ((Number) row[1]).intValue());
    }

    private ReviewView view(Review r) {
        var c = profiles.clientSummary(r.clientAccountId).orElse(null);
        return new ReviewView(r.id, r.appointmentId, c == null ? "Cliente" : c.name(), c == null ? null : c.photoUrl(), r.rating, r.comment, r.createdAt);
    }
}

@RestController
@Tag(name = "reviews", description = "Avaliações")
class ReviewController {
    private final ReviewService reviews;

    ReviewController(ReviewService reviews) { this.reviews = reviews; }

    @Operation(summary = "Avaliar atendimento concluído (a 1ª do mês ganha voucher do app)")
    @PostMapping("/appointments/{id}/review")
    @ResponseStatus(HttpStatus.CREATED)
    ReviewService.ReviewResult create(@PathVariable UUID id, @Valid @RequestBody ReviewService.ReviewInput body) {
        return reviews.create(CurrentAccount.id(), id, body);
    }

    @Operation(summary = "Minhas avaliações (cliente)")
    @GetMapping("/me/reviews")
    List<ReviewService.MyReview> mine() { return reviews.mine(CurrentAccount.id()); }

    @Operation(summary = "Avaliações de uma profissional")
    @GetMapping("/professionals/{id}/reviews")
    List<ReviewApi.ReviewView> list(@PathVariable UUID id, @RequestParam(defaultValue = "20") int limit) {
        return reviews.recent(id, limit);
    }
}
