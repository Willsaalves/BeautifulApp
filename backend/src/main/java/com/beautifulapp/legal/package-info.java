/**
 * Textos legais: Termos de Uso e Política de Privacidade (resources/legal/*.md, com os dados da empresa em _dados.yml).
 * Publica as páginas públicas exigidas pelas lojas (/legal/termos, /legal/privacidade) e informa a versão em vigor,
 * usada para registrar o aceite e pedir um novo aceite quando o texto muda.
 */
@org.springframework.modulith.ApplicationModule(displayName = "Legal")
package com.beautifulapp.legal;
