package com.beautifulapp.scheduling.domain;

/** Regra de negócio violada. O adaptador web traduz o tipo em status HTTP; o código vai para o app. */
public class SchedulingException extends RuntimeException {
    public enum Kind { NOT_FOUND, CONFLICT, INVALID, FORBIDDEN }

    private final Kind kind;
    private final String code;

    public SchedulingException(Kind kind, String code, String message) {
        super(message);
        this.kind = kind;
        this.code = code;
    }

    public Kind kind() { return kind; }
    public String code() { return code; }

    public static SchedulingException notFound() {
        return new SchedulingException(Kind.NOT_FOUND, "APPOINTMENT_NOT_FOUND", "Agendamento não encontrado.");
    }

    public static SchedulingException notFound(String code, String message) {
        return new SchedulingException(Kind.NOT_FOUND, code, message);
    }

    public static SchedulingException invalidState(AppointmentStatus status) {
        return new SchedulingException(Kind.CONFLICT, "INVALID_STATE", "Ação indisponível: o agendamento está %s.".formatted(status.label()));
    }

    public static SchedulingException slotUnavailable(String message) {
        return new SchedulingException(Kind.CONFLICT, "SLOT_UNAVAILABLE", message);
    }

    public static SchedulingException invalid(String code, String message) {
        return new SchedulingException(Kind.INVALID, code, message);
    }

    public static SchedulingException forbidden(String code, String message) {
        return new SchedulingException(Kind.FORBIDDEN, code, message);
    }
}
