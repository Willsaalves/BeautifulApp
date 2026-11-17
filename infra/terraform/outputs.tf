output "api_url" {
  description = "Coloque no mobile/.env.local como EXPO_PUBLIC_API_URL."
  value       = local.api_url
}

output "media_url" {
  description = "Onde as fotos públicas são servidas."
  value       = local.media_url
}

output "privacy_policy_url" {
  description = "URL da Política de Privacidade para a App Store e a Play Store."
  value       = "${local.api_url}/legal/privacidade"
}

output "github_variables" {
  description = "Variáveis para cadastrar no GitHub (Settings → Secrets and variables → Actions → Variables)."
  value = {
    AWS_REGION          = var.region
    AWS_DEPLOY_ROLE_ARN = aws_iam_role.deploy.arn
    ECR_REPOSITORY      = aws_ecr_repository.api.name
    ECS_CLUSTER         = aws_ecs_cluster.main.name
    ECS_SERVICE         = aws_ecs_service.api.name
  }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "database_endpoint" {
  description = "Só acessível de dentro da VPC (API ou CloudShell com o grupo admin)."
  value       = aws_db_instance.main.address
}

output "database_secret_arn" {
  description = "Senha do banco (gerada pelo RDS)."
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "admin_security_group_id" {
  description = "Grupo para o ambiente de VPC do CloudShell que acessa o banco."
  value       = aws_security_group.admin.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "queues" {
  value = { for k, q in aws_sqs_queue.events : k => q.url }
}

output "logs" {
  description = "Logs da API no CloudWatch."
  value       = aws_cloudwatch_log_group.api.name
}
