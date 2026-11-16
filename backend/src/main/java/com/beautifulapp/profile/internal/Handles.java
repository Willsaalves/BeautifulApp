package com.beautifulapp.profile.internal;

import java.text.Normalizer;
import java.util.function.Predicate;

/** "Dra. Camila Rocha" → "camilarocha" (com sufixo numérico se já existir). */
final class Handles {
    private Handles() {}

    static String from(String name, Predicate<String> taken) {
        String base = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase()
                .replaceFirst("^dra?\\.\\s*", "")
                .replaceAll("[^a-z0-9]", "");
        if (base.isEmpty()) base = "usuaria";
        if (base.length() > 20) base = base.substring(0, 20);
        String candidate = base;
        for (int i = 2; taken.test(candidate); i++) candidate = base + i;
        return candidate;
    }
}
