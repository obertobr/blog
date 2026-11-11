import { describe, expect, it } from "vitest";
import { extractAssetUrls, markdownToHtml, slugify } from "../app/_lib/util";

describe("slugify", () => {
    it("converts title to lowercase slug with hyphens", () => {
        expect(slugify("Hello World")).toBe("hello-world");
    });

    it("removes accents and special characters", () => {
        expect(slugify("Programação em Português & Acentuação")).toBe("programacao-em-portugues-acentuacao");
    });

    it("handles multiple consecutive hyphens and trims edges", () => {
        expect(slugify("---Next.js --- React 19---")).toBe("nextjs-react-19");
    });
});

describe("markdownToHtml", () => {
    it("converts basic markdown to html", async () => {
        const md = "# Titulo\n\nEste e um paragrafo.";
        const html = await markdownToHtml(md);

        expect(html).toContain("<h1>Titulo</h1>");
        expect(html).toContain("<p>Este e um paragrafo.</p>");
    });

    it("converts markdown tables with GFM", async () => {
        const md = "| Coluna 1 | Coluna 2 |\n| --- | --- |\n| Valor 1 | Valor 2 |";
        const html = await markdownToHtml(md);

        expect(html).toContain("<table>");
        expect(html).toContain("<th>Coluna 1</th>");
        expect(html).toContain("<td>Valor 1</td>");
    });

    it("highlights code blocks with shiki", async () => {
        const md = "```ts\nconst x: number = 42;\n```";
        const html = await markdownToHtml(md);

        expect(html).toContain("<pre");
        expect(html).toContain("<code");
        expect(html).toContain("github-dark");
    });

    it("converts markdown image syntax to img tag even with spaces", async () => {
        const mdStandard = "![imagem](/assets/foto.png)";
        const htmlStandard = await markdownToHtml(mdStandard);
        expect(htmlStandard).toContain('<img src="/assets/foto.png" alt="imagem"');

        const mdWithSpaces = "![imagem](/assets/Captura de tela 2024-01-29 060705.png)";
        const htmlWithSpaces = await markdownToHtml(mdWithSpaces);
        expect(htmlWithSpaces).toContain('<img src="/assets/Captura%20de%20tela%202024-01-29%20060705.png" alt="imagem"');

        const mdEncoded = "![imagem](/assets/Captura%20de%20tela%202024-01-29%20060705.png)";
        const htmlEncoded = await markdownToHtml(mdEncoded);
        expect(htmlEncoded).toContain('<img src="/assets/Captura%20de%20tela%202024-01-29%20060705.png" alt="imagem"');
    });
});

describe("extractAssetUrls", () => {
    it("extracts asset filenames from markdown content", () => {
        const md = "# Post\n![foto](/assets/foto-1.png)\nTexto com outra imagem: ![img](/assets/foto-2.webp)";
        const assets = extractAssetUrls(md);
        expect(assets).toEqual(["foto-1.png", "foto-2.webp"]);
    });

    it("decodes URL encoded filenames", () => {
        const md = "![alt](/assets/Captura%20de%20tela.png)";
        const assets = extractAssetUrls(md);
        expect(assets).toEqual(["Captura de tela.png"]);
    });

    it("returns empty array when content has no assets", () => {
        const md = "Apenas texto sem imagem";
        expect(extractAssetUrls(md)).toEqual([]);
    });
});

