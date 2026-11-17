package com.beautifulapp.admin.internal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

final class AdminDtos {
    private AdminDtos() {}

    /** slaBreached: há denúncia aberta há mais de 24h (prazo da App Store). */
    record Overview(long clients, long professionals, long newAccounts7d, long suspendedAccounts, long appointments7d,
                    long completed30d, long revenue30dCents, long openReports, Instant oldestOpenReportAt, boolean slaBreached,
                    long outboxPending) {}

    /** Prévia do que foi denunciado. exists=false: o conteúdo já foi apagado (ex: story vencido). */
    record Preview(boolean exists, String title, String text, String imageUrl, UUID authorAccountId, String authorName,
                   boolean hidden, UUID professionalId) {}

    /** Denúncias agrupadas por alvo: várias pessoas denunciando o mesmo story viram um item só. */
    record ReportGroup(String targetType, UUID targetId, int reports, int reporters, List<String> reasons, List<String> details,
                       Instant firstAt, Instant lastAt, Preview preview) {}

    enum Decision { DISMISS, REMOVE_CONTENT, SUSPEND_AUTHOR }

    record ResolveInput(@NotNull Decision decision, @Size(max = 500) String note) {}

    record AccountRow(UUID accountId, String phone, String name, UUID professionalId, boolean client, boolean professional,
                      boolean admin, Instant createdAt, Instant suspendedAt, Instant deletedAt, int openReports) {}

    record AccountDetail(AccountRow account, String email, String suspendedReason, String bio, String photoUrl, String neighborhood,
                         long appointmentsAsClient, long appointmentsAsProfessional, long completedAsProfessional,
                         List<ReportGroup> openReports, List<AuditEntry> history) {}

    record SuspendInput(@NotBlank @Size(max = 300) String reason) {}

    record AuditEntry(UUID id, UUID adminAccountId, String adminName, String action, String targetType, UUID targetId,
                      String note, Instant createdAt) {}
}
