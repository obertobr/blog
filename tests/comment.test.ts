import { describe, expect, it } from "vitest";
import {
    COMMENT_AUTHOR_MAX_LENGTH,
    COMMENT_CONTENT_MAX_LENGTH,
    CommentAuthorMode,
    CommentErrorCode,
    evaluateCommentRateLimit,
    normalizeAuthorName,
    normalizeCommentText,
    parseCommentAuthorMode,
    validateAndPrepareComment,
} from "../app/_lib/comment";

describe("comment Domain Logic", () => {
    describe("parseCommentAuthorMode", () => {
        it("parses supported author modes and rejects unknown values", () => {
            expect(parseCommentAuthorMode("named")).toBe(CommentAuthorMode.Named);
            expect(parseCommentAuthorMode("anonymous")).toBe(CommentAuthorMode.Anonymous);
            expect(parseCommentAuthorMode("other")).toBeNull();
            expect(parseCommentAuthorMode(null)).toBeNull();
        });
    });

    describe("normalization & sanitization", () => {
        it("strips control characters and bidi overrides from author names", () => {
            expect(normalizeAuthorName("  João\u202E \t Silva\u0000  ")).toBe("João Silva");
        });

        it("collapses excessive blank lines and strips control characters from content", () => {
            const raw = "Linha 1\r\n\r\n\r\n\r\n\r\nLinha 2\u0007\u202E";
            expect(normalizeCommentText(raw)).toBe("Linha 1\n\n\nLinha 2");
        });
    });

    describe("validateAndPrepareComment", () => {
        it("accepts a valid named comment and normalizes fields", () => {
            const result = validateAndPrepareComment({
                postId: 1,
                authorMode: CommentAuthorMode.Named,
                authorName: "  Maria  Clara ",
                content: "  Excelente artigo!  ",
            });

            expect(result).toEqual({
                ok: true,
                data: {
                    postId: 1,
                    isAnonymous: false,
                    authorName: "Maria Clara",
                    content: "Excelente artigo!",
                },
            });
        });

        it("accepts anonymous comment and ignores any authorName passed", () => {
            const result = validateAndPrepareComment({
                postId: 2,
                authorMode: CommentAuthorMode.Anonymous,
                authorName: "ShouldBeIgnored",
                content: "Muito bom!",
            });

            expect(result).toEqual({
                ok: true,
                data: {
                    postId: 2,
                    isAnonymous: true,
                    authorName: null,
                    content: "Muito bom!",
                },
            });
        });

        it("validates required name and max lengths up to 10,000 characters", () => {
            expect(COMMENT_CONTENT_MAX_LENGTH).toBe(10_000);

            expect(
                validateAndPrepareComment({
                    postId: 1,
                    authorMode: CommentAuthorMode.Named,
                    authorName: "   ",
                    content: "Texto válido",
                })
            ).toEqual({ ok: false, errorCode: CommentErrorCode.NameRequired });

            expect(
                validateAndPrepareComment({
                    postId: 1,
                    authorMode: CommentAuthorMode.Named,
                    authorName: "a".repeat(COMMENT_AUTHOR_MAX_LENGTH + 1),
                    content: "Texto válido",
                })
            ).toEqual({ ok: false, errorCode: CommentErrorCode.NameTooLong });

            expect(
                validateAndPrepareComment({
                    postId: 1,
                    authorMode: CommentAuthorMode.Anonymous,
                    content: "a",
                })
            ).toEqual({ ok: false, errorCode: CommentErrorCode.ContentTooShort });

            expect(
                validateAndPrepareComment({
                    postId: 1,
                    authorMode: CommentAuthorMode.Anonymous,
                    content: "a".repeat(COMMENT_CONTENT_MAX_LENGTH),
                }).ok
            ).toBe(true);

            expect(
                validateAndPrepareComment({
                    postId: 1,
                    authorMode: CommentAuthorMode.Anonymous,
                    content: "a".repeat(COMMENT_CONTENT_MAX_LENGTH + 1),
                })
            ).toEqual({ ok: false, errorCode: CommentErrorCode.ContentTooLong });
        });
    });

    describe("evaluateCommentRateLimit", () => {
        const now = 1_000_000;

        it("allows first comment", () => {
            expect(evaluateCommentRateLimit([], now)).toEqual({ allowed: true });
        });

        it("enforces minimum 1-second cooldown between comments", () => {
            expect(evaluateCommentRateLimit([now - 500], now)).toEqual({
                allowed: false,
                errorCode: CommentErrorCode.Cooldown,
                retryAfterSeconds: 1,
            });
            expect(evaluateCommentRateLimit([now - 1_000], now)).toEqual({ allowed: true });
        });

        it("allows up to 9 consecutive comments spaced by >= 1s, then pauses 1 minute after 10 comments", () => {
            const nineRecentDesc = Array.from({ length: 9 }, (_, i) => now - (i + 1) * 1500);
            expect(evaluateCommentRateLimit(nineRecentDesc, now)).toEqual({ allowed: true });

            const tenRecentDesc = Array.from({ length: 10 }, (_, i) => now - (i + 1) * 1500);
            expect(evaluateCommentRateLimit(tenRecentDesc, now)).toEqual({
                allowed: false,
                errorCode: CommentErrorCode.Cooldown,
                retryAfterSeconds: 59,
            });
        });

        it("resets burst streak once 1 minute has elapsed since the last comment", () => {
            const tenOlderThanOneMin = Array.from(
                { length: 10 },
                (_, i) => now - 60_000 - i * 1500
            );
            expect(evaluateCommentRateLimit(tenOlderThanOneMin, now)).toEqual({ allowed: true });
        });
    });
});
