# Filas dos eventos (módulo messaging). Cada uma tem uma fila de mensagens com erro (DLQ):
# depois de 5 tentativas de processamento sem sucesso, a mensagem vai para lá, em vez de travar a fila.

locals {
  queues = toset(["appointment-events", "account-events"])
}

resource "aws_sqs_queue" "dlq" {
  for_each                  = local.queues
  name                      = "${local.name}-${each.key}-dlq"
  message_retention_seconds = 1209600 # 14 dias
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "events" {
  for_each                   = local.queues
  name                       = "${local.name}-${each.key}"
  message_retention_seconds  = 345600 # 4 dias
  visibility_timeout_seconds = 60
  receive_wait_time_seconds  = 20
  sqs_managed_sse_enabled    = true
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 5
  })
}
