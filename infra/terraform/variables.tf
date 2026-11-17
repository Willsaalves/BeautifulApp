variable "project" {
  description = "Prefixo dos nomes dos recursos."
  type        = string
  default     = "beautifulapp"
}

variable "environment" {
  description = "staging ou prod."
  type        = string
}

variable "region" {
  description = "Região da AWS. sa-east-1 (São Paulo): dados no Brasil e menor latência; us-east-1: ~30% mais barato."
  type        = string
  default     = "sa-east-1"
}

variable "github_repository" {
  description = "Repositório que pode fazer deploy (owner/repo), via OIDC, sem chave da AWS no GitHub."
  type        = string
}

variable "create_github_oidc_provider" {
  description = "false se a conta AWS já tem o provedor OIDC do GitHub (só pode existir um por conta)."
  type        = bool
  default     = true
}

variable "api_cpu" {
  description = "CPU da task da API (1024 = 1 vCPU)."
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memória da task da API (MB)."
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Quantas cópias da API rodando. 0 desliga (economiza a Fargate)."
  type        = number
  default     = 1
}

variable "db_instance_class" {
  description = "Tamanho do Postgres."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_deletion_protection" {
  description = "Impede apagar o banco por engano (deixe true em produção)."
  type        = bool
  default     = false
}

variable "otp_fixed_code" {
  description = "Código de login fixo (só para testes, sem SMS). VAZIO em produção: com código fixo qualquer pessoa entra em qualquer número."
  type        = string
  default     = ""
}

variable "push_sender" {
  description = "expo (envia push) ou log (só registra)."
  type        = string
  default     = "expo"
}

variable "monthly_budget_usd" {
  description = "Alerta de custo mensal (US$)."
  type        = number
  default     = 100
}

variable "alert_email" {
  description = "E-mail que recebe o alerta de custo. Vazio = sem alerta."
  type        = string
  default     = ""
}
