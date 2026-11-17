# Repositório das imagens da API (o deploy do GitHub envia para cá)
resource "aws_ecr_repository" "api" {
  name                 = "${local.name}-api"
  image_tag_mutability = "MUTABLE" # a tag "latest" aponta para a versão em produção
  force_delete         = !var.db_deletion_protection

  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Guarda as 15 imagens mais recentes"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 15 }
      action       = { type = "expire" }
    }]
  })
}
