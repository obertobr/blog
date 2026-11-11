import { describe, expect, it } from "vitest";
import { markdownToHtml, slugify } from "../app/_lib/util";

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
});

