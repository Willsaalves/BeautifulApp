/**
 * Mídia: URLs pré-assinadas para o app enviar fotos direto ao S3 (ou R2/MinIO em testes).
 * Comprovantes e referências ficam em prefixos privados; avatar, capa, portfólio e stories são públicos via CDN.
 */
@org.springframework.modulith.ApplicationModule(displayName = "Media")
package com.beautifulapp.media;
