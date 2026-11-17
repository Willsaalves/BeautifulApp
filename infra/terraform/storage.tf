# Fotos e comprovantes. O bucket é privado:
# - fotos públicas (avatar, capa, portfólio, story, design) são servidas pelo CloudFront de mídia;
# - comprovantes e referências só abrem por link temporário gerado pela API.

resource "aws_s3_bucket" "media" {
  bucket = "${local.name}-media-${local.account_id}"
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "media" {
  bucket = aws_s3_bucket.media.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

# O app envia a foto direto para o S3 com URL pré-assinada (o navegador, no modo web, precisa de CORS)
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id
  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  # stories duram 24h; os arquivos saem depois de 8 dias (o banco limpa os registros com 7)
  rule {
    id     = "stories"
    status = "Enabled"
    filter { prefix = "story/" }
    expiration { days = 8 }
  }

  rule {
    id     = "uploads-incompletos"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload { days_after_initiation = 1 }
  }
}

# Só o CloudFront de mídia lê, e só os prefixos públicos
data "aws_iam_policy_document" "media_bucket" {
  statement {
    sid     = "CloudFrontLePublicas"
    actions = ["s3:GetObject"]
    resources = [for p in ["avatar", "cover", "portfolio", "story", "design"] : "${aws_s3_bucket.media.arn}/${p}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.media.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "media" {
  bucket     = aws_s3_bucket.media.id
  policy     = data.aws_iam_policy_document.media_bucket.json
  depends_on = [aws_s3_bucket_public_access_block.media]
}
