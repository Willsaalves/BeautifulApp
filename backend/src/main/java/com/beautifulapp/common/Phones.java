package com.beautifulapp.common;

import java.util.regex.Pattern;

/** Normaliza celular brasileiro para E.164 (+55DDD9XXXXXXXX). */
public final class Phones {
    private static final Pattern BR_MOBILE = Pattern.compile("^\\+55[1-9]{2}9\\d{8}$");

    private Phones() {}

    public static String normalize(String raw) {
        if (raw == null) throw invalid();
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() == 11) digits = "55" + digits;
        String e164 = "+" + digits;
        if (!BR_MOBILE.matcher(e164).matches()) throw invalid();
        return e164;
    }

    private static ApiException invalid() {
        return ApiException.badRequest("PHONE_INVALID", "Informe um celular válido com DDD, ex: (11) 98765-4321.");
    }
}
