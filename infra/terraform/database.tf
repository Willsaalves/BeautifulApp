# Postgres 16 gerenciado (PostGIS, pg_trgm e btree_gist são criados pelo Flyway na primeira subida da API).
# A senha é gerada e guardada pelo próprio RDS no Secrets Manager (não passa pelo Terraform).

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "main" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  db_name                     = "glammi"
  username                    = "glammi"
  manage_master_user_password = true

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period    = 7
  backup_window              = "06:00-07:00" # 3h–4h em Brasília
  maintenance_window         = "sun:07:00-sun:08:00"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true

  deletion_protection       = var.db_deletion_protection
  skip_final_snapshot       = !var.db_deletion_protection
  final_snapshot_identifier = var.db_deletion_protection ? "${local.name}-final" : null

  performance_insights_enabled = false
}
