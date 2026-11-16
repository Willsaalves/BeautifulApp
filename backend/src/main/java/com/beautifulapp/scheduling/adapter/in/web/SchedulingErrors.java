package com.beautifulapp.scheduling.adapter.in.web;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.beautifulapp.scheduling.domain.SchedulingException;

/** Erro do domínio → resposta HTTP no mesmo formato do resto da API (ProblemDetail + code). */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
class SchedulingErrors {
    @ExceptionHandler(SchedulingException.class)
    ProblemDetail handle(SchedulingException e) {
        HttpStatus status = switch (e.kind()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
            case INVALID -> HttpStatus.BAD_REQUEST;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
        };
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, e.getMessage());
        pd.setProperty("code", e.code());
        return pd;
    }
}
