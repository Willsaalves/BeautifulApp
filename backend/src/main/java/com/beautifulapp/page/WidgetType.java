package com.beautifulapp.page;

public enum WidgetType {
    CAPA, GALERIA, PORCENTAGEM, CONTAGEM, TEXTO, TRENDING, FIDELIDADE, AVALIACOES, SERVICOS, AGENDA;

    public boolean fixed() { return this == SERVICOS || this == AGENDA; }
}
