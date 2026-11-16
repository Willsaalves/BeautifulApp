/**
 * Moderação: denúncias de perfis e conteúdo (stories, avaliações, mensagens) e bloqueio entre contas.
 * Exigência das lojas para apps com conteúdo de usuárias. Com 3 denúncias de pessoas diferentes,
 * story ou avaliação sai do ar até a revisão (evento ContentFlagged).
 */
@org.springframework.modulith.ApplicationModule(displayName = "Moderation")
package com.beautifulapp.moderation;
