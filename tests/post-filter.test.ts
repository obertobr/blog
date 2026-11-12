import { describe, expect, it } from "vitest";
import {
    buildHomeFilterQueryString,
    buildTagFilterHref,
    extractAvailableTags,
    extractSearchableContent,
    filterPosts,
    HOME_SEARCH_MAX_LENGTH,
    HOME_TAG_FILTER_MAX_LENGTH,
    parseHomeFilterParams,
} from "../app/_lib/post-filter";

const samplePosts = [
    {
        id: 1,
        slug: "intro-react",
        title: "Introdução ao React Hooks",
        content: "Aprenda useState e useEffect com exemplos simples. ![diagram](/assets/abc123.png)",
        tags: [
            { id: 1, name: "React", color: "#61dafb" },
            { id: 2, name: "Frontend", color: "#f97316" },
        ],
    },
    {
        id: 2,
        slug: "prisma-sqlite",
        title: "Banco de Dados com Prisma",
        content: "Modelagem de dados e migrações em SQLite. Veja [documentação](https://prisma.io).",
        tags: [
            { id: 3, name: "Backend", color: "#22c55e" },
            { id: 4, name: "Prisma", color: "#0ea5e9" },
        ],
    },
    {
        id: 3,
        slug: "sem-titulo",
        title: null,
        content: "Notas rápidas sobre TypeScript e arquitetura limpa.",
        tags: [{ id: 1, name: "React", color: "#61dafb" }],
    },
];

describe("post-filter domain logic", () => {
    describe("parseHomeFilterParams", () => {
        it("parses and trims valid query and tag params", () => {
            expect(parseHomeFilterParams({ q: "  react  ", tag: " Frontend " })).toEqual({
                query: "react",
                tag: "Frontend",
            });
        });

        it("reads the first element when search params are arrays", () => {
            expect(parseHomeFilterParams({ q: ["hooks", "other"], tag: ["React"] })).toEqual({
                query: "hooks",
                tag: "React",
            });
        });

        it("returns empty defaults for invalid or oversized inputs", () => {
            expect(
                parseHomeFilterParams({
                    q: "a".repeat(HOME_SEARCH_MAX_LENGTH + 1),
                    tag: "b".repeat(HOME_TAG_FILTER_MAX_LENGTH + 1),
                })
            ).toEqual({ query: "", tag: "" });

            expect(parseHomeFilterParams({ q: 123, tag: null })).toEqual({
                query: "",
                tag: "",
            });
        });
    });

    describe("URL query builders", () => {
        it("builds clean query strings ignoring empty values", () => {
            expect(buildHomeFilterQueryString({ query: "", tag: "" })).toBe("");
            expect(buildHomeFilterQueryString({ query: "hooks", tag: "" })).toBe("q=hooks");
            expect(buildHomeFilterQueryString({ query: "", tag: "React" })).toBe("tag=React");
            expect(buildHomeFilterQueryString({ query: "hooks", tag: "React" })).toBe(
                "q=hooks&tag=React"
            );
        });

        it("builds root or tag-filtered hrefs cleanly", () => {
            expect(buildTagFilterHref("")).toBe("/");
            expect(buildTagFilterHref("Next.js")).toBe("/?tag=Next.js");
        });
    });

    describe("extractAvailableTags", () => {
        it("deduplicates tags across posts and sorts alphabetically", () => {
            const tags = extractAvailableTags(samplePosts);
            expect(tags.map((t) => t.name)).toEqual([
                "Backend",
                "Frontend",
                "Prisma",
                "React",
            ]);
        });
    });

    describe("extractSearchableContent", () => {
        it("keeps readable alt/link labels and drops markdown asset/external URLs", () => {
            const cleaned = extractSearchableContent(
                "Texto ![grafico](/assets/1234.png) e [guia](https://secret-url.test)"
            );
            expect(cleaned).toContain("grafico");
            expect(cleaned).toContain("guia");
            expect(cleaned).not.toContain("/assets/1234.png");
            expect(cleaned).not.toContain("secret-url.test");
        });
    });

    describe("filterPosts", () => {
        it("returns all posts when criteria are empty", () => {
            expect(filterPosts(samplePosts, { query: "", tag: "" })).toHaveLength(3);
        });

        it("filters by title and content ignoring case and Portuguese accents", () => {
            expect(filterPosts(samplePosts, { query: "introducao", tag: "" }).map((p) => p.id)).toEqual([1]);
            expect(filterPosts(samplePosts, { query: "migracoes", tag: "" }).map((p) => p.id)).toEqual([2]);
            expect(filterPosts(samplePosts, { query: "typescript limpa", tag: "" }).map((p) => p.id)).toEqual([3]);
        });

        it("ignores internal asset filename tokens during content search", () => {
            expect(filterPosts(samplePosts, { query: "abc123.png", tag: "" })).toHaveLength(0);
        });

        it("filters by tag case-insensitively and combines with text search", () => {
            expect(filterPosts(samplePosts, { query: "", tag: "react" }).map((p) => p.id)).toEqual([1, 3]);
            expect(
                filterPosts(samplePosts, { query: "typescript", tag: "react" }).map((p) => p.id)
            ).toEqual([3]);
        });
    });
});

