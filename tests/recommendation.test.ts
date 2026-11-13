import { describe, expect, it } from "vitest";
import {
    calculateMinimumReadTimeMs,
    classifyReadEngagement,
    countReadableWords,
    evaluateReadProgress,
    rankRelevantPosts,
    ReadEngagementLevel,
    RecommendationReason,
    SHORT_POST_MIN_READ_TIME_MS,
} from "../app/_lib/recommendation";

describe("recommendation and reading verification domain logic", () => {
    describe("countReadableWords & calculateMinimumReadTimeMs", () => {
        it("identifies short posts (< 80 words) and assigns a brief minimum read time", () => {
            const shortContent = "Nota rápida sobre configuração do TypeScript no projeto.";
            const result = calculateMinimumReadTimeMs(shortContent);

            expect(result.wordCount).toBe(8);
            expect(result.isShortPost).toBe(true);
            expect(result.minReadTimeMs).toBe(SHORT_POST_MIN_READ_TIME_MS);
        });

        it("calculates proportional minimum read time for longer posts and strips markdown URLs", () => {
            const words = Array.from({ length: 300 }, (_, i) => `palavra${i}`).join(" ");
            const markdown = `# Título\n\n![capa](/assets/image-123.png)\n\n${words}`;
            const count = countReadableWords(markdown);
            const result = calculateMinimumReadTimeMs(markdown);

            expect(count).toBe(302);
            expect(result.isShortPost).toBe(false);
            expect(result.minReadTimeMs).toBeGreaterThanOrEqual(20_000);
        });
    });

    describe("evaluateReadProgress", () => {
        it("verifies a short post read as soon as the user reaches the end after brief time", () => {
            const metrics = evaluateReadProgress({
                markdown: "Post curto com poucas palavras para leitura rápida.",
                activeTimeMs: 2_000,
                scrollDepth: 1,
                reachedEnd: true,
                enteredAtMs: 1_000,
                completedAtMs: 3_000,
            });

            expect(metrics.isShortPost).toBe(true);
            expect(metrics.isVerifiedRead).toBe(true);
            expect(metrics.engagementLevel).toBe(ReadEngagementLevel.Completed);
        });

        it("rejects verification on a long post if the user scrolls to the end too quickly", () => {
            const longMarkdown = Array.from({ length: 400 }, () => "conteúdo").join(" ");
            const metrics = evaluateReadProgress({
                markdown: longMarkdown,
                activeTimeMs: 2_000,
                scrollDepth: 1,
                reachedEnd: true,
                enteredAtMs: 10_000,
                completedAtMs: 12_000,
            });

            expect(metrics.isShortPost).toBe(false);
            expect(metrics.isVerifiedRead).toBe(false);
            expect(metrics.engagementLevel).toBe(ReadEngagementLevel.Skimmed);
        });

        it("verifies a long post when both end-of-post scroll and minimum reading time are satisfied", () => {
            const longMarkdown = Array.from({ length: 250 }, () => "arquitetura").join(" ");
            const { minReadTimeMs } = calculateMinimumReadTimeMs(longMarkdown);

            const metrics = evaluateReadProgress({
                markdown: longMarkdown,
                activeTimeMs: minReadTimeMs + 1_000,
                scrollDepth: 0.95,
                reachedEnd: true,
                enteredAtMs: 10_000,
                completedAtMs: 10_000 + minReadTimeMs + 1_000,
            });

            expect(metrics.isVerifiedRead).toBe(true);
            expect(metrics.engagementLevel).toBe(ReadEngagementLevel.Completed);
        });

        it("uses server elapsed time as upper bound against inflated client activeTimeMs", () => {
            const longMarkdown = Array.from({ length: 300 }, () => "segurança").join(" ");
            const metrics = evaluateReadProgress({
                markdown: longMarkdown,
                activeTimeMs: 90_000,
                scrollDepth: 1,
                reachedEnd: true,
                serverStartedAtMs: 50_000,
                nowMs: 51_500,
            });

            expect(metrics.effectiveDurationMs).toBe(1_500);
            expect(metrics.isVerifiedRead).toBe(false);
        });
    });

    describe("classifyReadEngagement", () => {
        it("classifies completed, skimmed, bounced, and none accurately", () => {
            expect(
                classifyReadEngagement({
                    completedCount: 1,
                    maxScrollDepth: 1,
                    activeTimeMs: 15_000,
                    readCount: 1,
                })
            ).toBe(ReadEngagementLevel.Completed);

            expect(
                classifyReadEngagement({
                    completedCount: 0,
                    maxScrollDepth: 0.5,
                    activeTimeMs: 3_000,
                    readCount: 1,
                })
            ).toBe(ReadEngagementLevel.Skimmed);

            expect(
                classifyReadEngagement({
                    completedCount: 0,
                    maxScrollDepth: 0.1,
                    activeTimeMs: 800,
                    readCount: 1,
                })
            ).toBe(ReadEngagementLevel.Bounced);

            expect(
                classifyReadEngagement({
                    completedCount: 0,
                    maxScrollDepth: 0,
                    activeTimeMs: 0,
                    readCount: 0,
                })
            ).toBe(ReadEngagementLevel.None);
        });
    });

    describe("rankRelevantPosts", () => {
        const now = new Date("2026-11-12T18:00:00Z");
        const posts = [
            {
                id: 1,
                slug: "react-avancado",
                title: "Padrões Avançados de React e Hooks",
                content: "Como estruturar componentes React desacoplados com hooks customizados.",
                createdAt: new Date("2026-11-10T12:00:00Z"),
                tags: [{ id: 1, name: "React", color: "#61dafb" }],
                _count: { likes: 2, reads: 3 },
                completedReadsCount: 2,
            },
            {
                id: 2,
                slug: "estado-react-performance",
                title: "Otimizando Renderização e Estado no React",
                content: "Guia completo de performance em componentes React e hooks.",
                createdAt: new Date("2026-11-09T12:00:00Z"),
                tags: [{ id: 1, name: "React", color: "#61dafb" }],
                _count: { likes: 1, reads: 1 },
                completedReadsCount: 1,
            },
            {
                id: 3,
                slug: "culinaria-italiana",
                title: "Receita de Massa Artesanal",
                content: "Como preparar molho de tomate fresco e massa em casa.",
                createdAt: new Date("2026-11-11T12:00:00Z"),
                tags: [{ id: 2, name: "Culinária", color: "#ef4444" }],
                _count: { likes: 5, reads: 8 },
                completedReadsCount: 6,
            },
            {
                id: 4,
                slug: "arquitetura-frontend",
                title: "Arquitetura Limpa com Componentes e Hooks",
                content: "Separando domínio e apresentação em aplicações com componentes e hooks.",
                createdAt: new Date("2026-11-08T12:00:00Z"),
                tags: [{ id: 3, name: "Arquitetura", color: "#8b5cf6" }],
                _count: { likes: 1, reads: 1 },
                completedReadsCount: 1,
            },
        ];

        it("falls back to trending/popularity when visitor has no reads or likes", () => {
            const result = rankRelevantPosts(posts, [], now);

            expect(result.reason).toBe(RecommendationReason.Trending);
            expect(result.posts[0]?.slug).toBe("culinaria-italiana");
        });

        it("prioritizes unread posts matching tags and keywords of liked and verified-read posts, demoting already-read posts", () => {
            const result = rankRelevantPosts(
                posts,
                [
                    {
                        postId: 1,
                        liked: true,
                        likedAt: new Date("2026-11-12T17:00:00Z"),
                        readCount: 1,
                        completedCount: 1,
                        maxScrollDepth: 1,
                        activeTimeMs: 45_000,
                        lastReadAt: new Date("2026-11-12T17:00:00Z"),
                    },
                ],
                now
            );

            expect(result.reason).toBe(RecommendationReason.Personalized);
            expect(result.verifiedReadsCount).toBe(1);
            expect(result.likedPostsCount).toBe(1);
            expect(result.posts[0]?.slug).toBe("estado-react-performance");
            expect(result.posts[1]?.slug).toBe("arquitetura-frontend");
            expect(result.posts[result.posts.length - 1]?.slug).toBe("react-avancado");
        });

        it("ignores bounced visits (opened and immediately closed) when building personal profile", () => {
            const result = rankRelevantPosts(
                posts,
                [
                    {
                        postId: 1,
                        liked: false,
                        readCount: 1,
                        completedCount: 0,
                        maxScrollDepth: 0.05,
                        activeTimeMs: 500,
                        lastReadAt: new Date("2026-11-12T17:00:00Z"),
                    },
                ],
                now
            );

            expect(result.reason).toBe(RecommendationReason.Trending);
            expect(result.verifiedReadsCount).toBe(0);
        });
    });
});

