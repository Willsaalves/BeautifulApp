# Entrada pela internet:
#   app ──HTTPS──> CloudFront (api) ──> balanceador (ALB) ──> API (ECS)
#   app ──HTTPS──> CloudFront (mídia) ──> S3 (só fotos públicas)
# O CloudFront dá HTTPS com o domínio *.cloudfront.net sem precisar comprar domínio.

resource "aws_lb" "api" {
  name               = "${local.name}-api"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  idle_timeout       = 60
}

resource "aws_lb_target_group" "api" {
  name                 = "${local.name}-api"
  port                 = 8080
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 20

  health_check {
    path                = "/actuator/health/readiness"
    matcher             = "200"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

data "aws_cloudfront_cache_policy" "disabled" { name = "Managed-CachingDisabled" }
data "aws_cloudfront_cache_policy" "optimized" { name = "Managed-CachingOptimized" }
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" { name = "Managed-AllViewerExceptHostHeader" }

resource "aws_cloudfront_distribution" "api" {
  enabled         = true
  comment         = "${local.name} API"
  price_class     = "PriceClass_All" # inclui o ponto de presença de São Paulo
  is_ipv6_enabled = true

  origin {
    origin_id   = "alb"
    domain_name = aws_lb.api.dns_name
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 60
    }
  }

  # API: nada em cache, repassa todos os cabeçalhos (inclusive Authorization) e o corpo
  default_cache_behavior {
    target_origin_id         = "alb"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    compress                 = true
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate { cloudfront_default_certificate = true }
}

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${local.name}-media"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "media" {
  enabled         = true
  comment         = "${local.name} fotos públicas"
  price_class     = "PriceClass_All"
  is_ipv6_enabled = true

  origin {
    origin_id                = "s3"
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  # fotos nunca mudam (cada upload ganha uma chave nova): cache longo
  default_cache_behavior {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    compress               = true
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate { cloudfront_default_certificate = true }
}
