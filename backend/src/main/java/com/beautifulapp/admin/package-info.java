/**
 * Painel de administração: números do app, fila de denúncias (revisão em até 24h, exigência da App Store)
 * e gestão de contas (suspender, reativar, excluir). Só para contas com papel ADMIN (lista APP_ADMIN_PHONES).
 * <p>Leitura: consultas SQL de visão geral (como analytics). Escrita: sempre pelas APIs dos módulos ou por eventos,
 * e toda ação fica registrada em admin_action.
 */
@org.springframework.modulith.ApplicationModule(displayName = "Admin")
package com.beautifulapp.admin;
