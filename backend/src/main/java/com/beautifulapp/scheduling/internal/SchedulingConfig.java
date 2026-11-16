package com.beautifulapp.scheduling.internal;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Liga as tarefas periódicas (expiração do sinal). Desligável em testes: app.scheduling.jobs=false */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.scheduling.jobs", havingValue = "true", matchIfMissing = true)
class SchedulingConfig {}
