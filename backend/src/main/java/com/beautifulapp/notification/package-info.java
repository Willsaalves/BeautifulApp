/**
 * Notificações: caixa de entrada no app + push (Expo). Escuta eventos de agendamento e recebe pedidos de outros módulos
 * (chat). O push sai só depois do commit, para nunca avisar algo que foi desfeito.
 */
@org.springframework.modulith.ApplicationModule(displayName = "Notification")
package com.beautifulapp.notification;
