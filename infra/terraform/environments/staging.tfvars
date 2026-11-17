# Ambiente de testes (TestFlight / testes internos).
environment       = "staging"
region            = "sa-east-1"
github_repository = "Willsaalves/BeautifulApp"

# Código de login fixo enquanto o envio por SMS/WhatsApp não existe.
# ATENÇÃO: com código fixo qualquer pessoa entra em qualquer número. Só para testes fechados.
otp_fixed_code = "123456"

api_cpu           = 512
api_memory        = 1024
api_desired_count = 1
db_instance_class = "db.t4g.micro"

monthly_budget_usd = 100
alert_email        = "" # coloque seu e-mail para receber alerta de custo
