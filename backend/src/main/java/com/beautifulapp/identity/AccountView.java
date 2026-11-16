package com.beautifulapp.identity;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record AccountView(UUID id, String phone, String email, Set<Role> roles, Instant createdAt) {}
