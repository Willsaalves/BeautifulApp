package com.beautifulapp.page;

import java.util.List;
import java.util.UUID;

public interface PageApi {
    /** Blocos da página na ordem; se a profissional ainda não montou, devolve a página padrão. */
    List<WidgetView> widgets(UUID professionalId);
}
