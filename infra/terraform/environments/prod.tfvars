# Produção (lojas). Só suba depois do login por SMS/WhatsApp estar pronto.
environment       = "prod"
region            = "sa-east-1"
github_repository = "Willsaalves/BeautifulApp"

otp_fixed_code              = "" # NUNCA código fixo em produção
create_github_oidc_provider = false # o staging já criou o provedor nesta conta (se for a mesma conta)

api_cpu                = 1024
api_memory             = 2048
api_desired_count      = 2 # duas cópias: uma pode cair ou ser atualizada sem tirar o app do ar
db_instance_class      = "db.t4g.small"
db_deletion_protection = true

monthly_budget_usd = 200
alert_email        = ""
