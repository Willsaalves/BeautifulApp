/**
 * Mensageria: leva os eventos marcados com @Externalized para filas (SQS na AWS; ElasticMQ em desenvolvimento).
 * <p>Outbox: o Spring Modulith grava cada evento na tabela event_publication na mesma transação da mudança.
 * Depois do commit, ele é enviado à fila; se o envio falhar, fica pendente e é reenviado (job a cada minuto e ao reiniciar).
 * Assim nenhum evento se perde, e nenhum evento sai de uma transação que foi desfeita.
 */
@org.springframework.modulith.ApplicationModule(displayName = "Messaging")
package com.beautifulapp.messaging;
