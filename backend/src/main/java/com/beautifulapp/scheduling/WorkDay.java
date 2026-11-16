package com.beautifulapp.scheduling;

import java.time.LocalTime;

/** Expediente de um dia da semana (0 = domingo … 6 = sábado). */
public record WorkDay(int weekday, LocalTime start, LocalTime end) {}
