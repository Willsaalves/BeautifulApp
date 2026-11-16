package com.beautifulapp.legal.internal;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.beautifulapp.legal.LegalApi;

/** Lê os textos uma vez na subida, troca as variáveis ({{empresa}} etc.) e gera o HTML das páginas públicas. */
@Service
class LegalDocuments implements LegalApi {
    record Doc(String slug, String title, String markdown, String html) {}

    static final List<String> SLUGS = List.of("termos", "privacidade");

    private final Map<String, String> vars;
    private final Map<String, Doc> docs = new LinkedHashMap<>();

    LegalDocuments() {
        this.vars = parseVars(read("legal/_dados.yml"));
        for (String slug : SLUGS) {
            String md = substitute(read("legal/" + slug + ".md"));
            String title = md.lines().filter(l -> l.startsWith("# ")).findFirst().map(l -> l.substring(2).trim()).orElse(slug);
            docs.put(slug, new Doc(slug, title, md, Markdown.toHtml(md)));
        }
    }

    @Override
    public String version() { return vars.getOrDefault("versao", "1"); }

    Optional<Doc> doc(String slug) { return Optional.ofNullable(docs.get(slug)); }

    List<Doc> all() { return List.copyOf(docs.values()); }

    Map<String, String> vars() { return vars; }

    private String substitute(String text) {
        Matcher m = Pattern.compile("\\{\\{(\\w+)}}").matcher(text);
        StringBuilder out = new StringBuilder();
        while (m.find()) m.appendReplacement(out, Matcher.quoteReplacement(vars.getOrDefault(m.group(1), m.group(0))));
        return m.appendTail(out).toString();
    }

    /** YAML bem simples: linhas "chave: valor" (aspas opcionais), comentários com #. */
    static Map<String, String> parseVars(String yml) {
        Map<String, String> out = new LinkedHashMap<>();
        for (String line : yml.lines().toList()) {
            String l = line.strip();
            if (l.isEmpty() || l.startsWith("#") || !l.contains(":")) continue;
            String key = l.substring(0, l.indexOf(':')).trim();
            String value = l.substring(l.indexOf(':') + 1).trim();
            if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) value = value.substring(1, value.length() - 1);
            out.put(key, value);
        }
        return out;
    }

    private static String read(String path) {
        try {
            return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Texto legal não encontrado: " + path, e);
        }
    }

    /** Markdown do jeito que os textos usam: títulos, parágrafos, listas, tabelas, **negrito** e [links](outro-doc). */
    static final class Markdown {
        private Markdown() {}

        static String toHtml(String md) {
            StringBuilder html = new StringBuilder();
            List<String> lines = md.lines().toList();
            List<String> para = new ArrayList<>();
            for (int i = 0; i < lines.size(); i++) {
                String l = lines.get(i);
                String t = l.strip();
                if (t.startsWith("|")) {
                    flush(para, html);
                    List<String> rows = new ArrayList<>();
                    while (i < lines.size() && lines.get(i).strip().startsWith("|")) rows.add(lines.get(i++).strip());
                    i--;
                    table(rows, html);
                } else if (t.startsWith("- ")) {
                    flush(para, html);
                    html.append("<ul>");
                    while (i < lines.size() && lines.get(i).strip().startsWith("- ")) html.append("<li>").append(inline(lines.get(i++).strip().substring(2))).append("</li>");
                    i--;
                    html.append("</ul>\n");
                } else if (t.startsWith("#")) {
                    flush(para, html);
                    int level = (int) t.chars().takeWhile(c -> c == '#').count();
                    html.append("<h").append(level).append('>').append(inline(t.substring(level).trim())).append("</h").append(level).append(">\n");
                } else if (t.isEmpty()) {
                    flush(para, html);
                } else {
                    para.add(t);
                }
            }
            flush(para, html);
            return html.toString();
        }

        private static void flush(List<String> para, StringBuilder html) {
            if (para.isEmpty()) return;
            html.append("<p>").append(inline(String.join(" ", para))).append("</p>\n");
            para.clear();
        }

        private static void table(List<String> rows, StringBuilder html) {
            html.append("<table>");
            for (int r = 0; r < rows.size(); r++) {
                if (rows.get(r).matches("\\|[\\s|:-]+\\|")) continue; // linha separadora
                String[] cells = rows.get(r).replaceAll("^\\||\\|$", "").split("\\|");
                String tag = r == 0 ? "th" : "td";
                html.append("<tr>");
                for (String c : cells) html.append('<').append(tag).append('>').append(inline(c.trim())).append("</").append(tag).append('>');
                html.append("</tr>");
            }
            html.append("</table>\n");
        }

        static String inline(String s) {
            String e = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
            e = e.replaceAll("\\*\\*(.+?)\\*\\*", "<strong>$1</strong>");
            return e.replaceAll("\\[([^]]+)]\\(([a-z-]+)\\)", "<a href=\"/legal/$2\">$1</a>");
        }
    }
}
