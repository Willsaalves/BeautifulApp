# A API roda no ECS Fargate (sem servidor para administrar). Em sub-rede pública com IP próprio (sem NAT),
# mas o grupo de segurança só aceita conexões do balanceador.

resource "aws_ecs_cluster" "main" {
  name = local.name
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}-api"
  retention_in_days = 30
}

locals {
  api_url   = "https://${aws_cloudfront_distribution.api.domain_name}"
  media_url = "https://${aws_cloudfront_distribution.media.domain_name}"
  db_secret = aws_db_instance.main.master_user_secret[0].secret_arn

  api_environment = {
    SPRING_PROFILES_ACTIVE     = "aws"
    SPRING_DATASOURCE_URL      = "jdbc:postgresql://${aws_db_instance.main.address}:${aws_db_instance.main.port}/glammi"
    SPRING_DATASOURCE_USERNAME = aws_db_instance.main.username
    APP_JWT_ISSUER             = local.api_url
    APP_OTP_FIXED_CODE         = var.otp_fixed_code
    APP_PUSH_SENDER            = var.push_sender
    APP_ADMIN_PHONES           = join(",", var.admin_phones)
    APP_MEDIA_BUCKET           = aws_s3_bucket.media.bucket
    APP_MEDIA_REGION           = var.region
    APP_MEDIA_PUBLIC_URL       = local.media_url
    APP_EVENTS_SQS_REGION      = var.region
    APP_EVENTS_QUEUE_PREFIX    = "${local.name}-"
  }

  api_secrets = {
    SPRING_DATASOURCE_PASSWORD = "${local.db_secret}:password::"
    APP_JWT_PRIVATE_KEY        = "${aws_secretsmanager_secret.api.arn}:jwtPrivateKey::"
    APP_JWT_PUBLIC_KEY         = "${aws_secretsmanager_secret.api.arn}:jwtPublicKey::"
    APP_OTP_PEPPER             = "${aws_secretsmanager_secret.api.arn}:otpPepper::"
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.api.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name         = "api"
    image        = "${aws_ecr_repository.api.repository_url}:latest"
    essential    = true
    portMappings = [{ containerPort = 8080, protocol = "tcp" }]
    environment  = [for k, v in local.api_environment : { name = k, value = v }]
    secrets      = [for k, v in local.api_secrets : { name = k, valueFrom = v }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.api.name
        awslogs-region        = var.region
        awslogs-stream-prefix = "api"
      }
    }
  }])
}

resource "aws_ecs_service" "api" {
  name                              = "api"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.api.arn
  desired_count                     = var.api_desired_count
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 180 # a primeira subida roda as migrações do banco
  enable_execute_command            = true

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  deployment_circuit_breaker {
    enable   = true
    rollback = true # se a versão nova não subir, volta para a anterior sozinho
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.http]
}
