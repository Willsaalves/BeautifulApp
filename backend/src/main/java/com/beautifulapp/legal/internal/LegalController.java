package com.beautifulapp.legal.internal;

import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.beautifulapp.common.ApiException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "legal", description = "Termos de Uso e Política de Privacidade (públicos)")
class LegalController {
    private final LegalDocuments legal;

    LegalController(LegalDocuments legal) { this.legal = legal; }

    record LegalInfo(String version, List<LegalDocInfo> documents) {}
    record LegalDocInfo(String slug, String title, String url) {}

    @Operation(summary = "Versão em vigor e links dos textos legais")
    @GetMapping("/legal")
    LegalInfo info() {
        return new LegalInfo(legal.version(), legal.all().stream().map(d -> new LegalDocInfo(d.slug(), d.title(), "/legal/" + d.slug())).toList());
    }

    @Operation(summary = "Página pública (HTML) do texto: use a URL de /legal/privacidade na App Store e na Play Store")
    @GetMapping(value = "/legal/{slug}", produces = MediaType.TEXT_HTML_VALUE)
    ResponseEntity<String> page(@PathVariable String slug) {
        var doc = legal.doc(slug).orElseThrow(() -> ApiException.notFound("LEGAL_NOT_FOUND", "Documento não encontrado."));
        String app = legal.vars().getOrDefault("app", "BeautifulApp");
        String html = """
                <!doctype html>
                <html lang="pt-BR"><head><meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%s · %s</title>
                <style>
                  :root { --bg:#FAF6FB; --text:#221A20; --muted:#6F6370; --accent:#8E6BB8; --line:#E9DFEF; --card:#fff; }
                  @media (prefers-color-scheme: dark) { :root { --bg:#1A1418; --text:#F4EEF3; --muted:#B7AAB5; --accent:#C9AEEA; --line:#3A2F38; --card:#241C22; } }
                  body { margin:0; background:var(--bg); color:var(--text);
                         font:16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                  main { max-width:760px; margin:0 auto; padding:32px 16px 64px; }
                  h1 { font-family: "Playfair Display", Georgia, serif; font-size:34px; line-height:1.15; margin:0 0 8px; }
                  h2 { font-size:19px; margin:32px 0 8px; }
                  a { color:var(--accent); }
                  table { width:100%%; border-collapse:collapse; background:var(--card); border-radius:12px; overflow:hidden; font-size:14px; }
                  th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
                  th { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
                  nav { display:flex; gap:16px; font-size:14px; margin-bottom:24px; }
                </style></head>
                <body><main>
                <nav><strong>%s</strong><a href="/legal/termos">Termos de Uso</a><a href="/legal/privacidade">Privacidade</a></nav>
                %s
                </main></body></html>
                """.formatted(doc.title(), app, app, doc.html());
        return ResponseEntity.ok().cacheControl(CacheControl.noCache()).contentType(MediaType.TEXT_HTML).body(html);
    }
}
