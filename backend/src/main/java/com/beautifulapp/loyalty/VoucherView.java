package com.beautifulapp.loyalty;

import java.time.Instant;
import java.util.UUID;

public record VoucherView(UUID id, UUID professionalId, String kind, int percent, String label, boolean used, Instant createdAt) {}
