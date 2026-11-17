# Segredos da API no Secrets Manager. A ECS injeta como variáveis de ambiente; não ficam no código nem na imagem.
# Observação: os valores gerados aqui também ficam no estado do Terraform (bucket privado e criptografado).

# Chaves fixas do JWT: sem elas cada reinício da API geraria chaves novas e derrubaria todas as sessões
resource "tls_private_key" "jwt" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "random_password" "otp_pepper" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "api" {
  name                    = "${local.name}/api"
  description             = "Chaves do JWT e pepper do OTP da API"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "api" {
  secret_id = aws_secretsmanager_secret.api.id
  secret_string = jsonencode({
    jwtPrivateKey = tls_private_key.jwt.private_key_pem_pkcs8
    jwtPublicKey  = tls_private_key.jwt.public_key_pem
    otpPepper     = random_password.otp_pepper.result
  })
}
