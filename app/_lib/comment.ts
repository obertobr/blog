import { z } from "zod";

export const CommentAuthorMode = {
    Named: "named",
    Anonymous: "anonymous",
} as const;

export const commentAuthorModeSchema = z.enum([
    CommentAuthorMode.Named,
    CommentAuthorMode.Anonymous,
]);

export type CommentAuthorMode = z.infer<typeof commentAuthorModeSchema>;

export const CommentErrorCode = {
    InvalidInput: "invalid_input",
    NameRequired: "name_required",
    NameTooLong: "name_too_long",
    ContentTooShort: "content_too_short",
    ContentTooLong: "content_too_long",
    Cooldown: "cooldown",
    RateLimited: "rate_limited",
    Duplicate: "duplicate",
    PostNotFound: "post_not_found",
    Unauthorized: "unauthorized",
    GenericError: "generic_error",
} as const;

export const commentErrorCodeSchema = z.enum([
    CommentErrorCode.InvalidInput,
    CommentErrorCode.NameRequired,
    CommentErrorCode.NameTooLong,
    CommentErrorCode.ContentTooShort,
    CommentErrorCode.ContentTooLong,
    CommentErrorCode.Cooldown,
    CommentErrorCode.RateLimited,
    CommentErrorCode.Duplicate,
    CommentErrorCode.PostNotFound,
    CommentErrorCode.Unauthorized,
    CommentErrorCode.GenericError,
]);

export type CommentErrorCode = z.infer<typeof commentErrorCodeSchema>;

export const COMMENT_AUTHOR_MAX_LENGTH = 40;
export const COMMENT_CONTENT_MIN_LENGTH = 2;
export const COMMENT_CONTENT_MAX_LENGTH = 10_000;
export const COMMENT_COUNTER_THRESHOLD = 9_000;
export const COMMENT_COOLDOWN_MS = 1_000;
export const COMMENT_BURST_MAX_COUNT = 10;
export const COMMENT_BURST_COOLDOWN_MS = 60_000;
export const COMMENT_DUPLICATE_WINDOW_MS = 10 * 60_000;

export const COMMENT_NAME_STORAGE_KEY = "blog_comment_author_name";
export const COMMENT_MODE_STORAGE_KEY = "blog_comment_author_mode";

export const createCommentInputSchema = z.object({
    postId: z.number().int().positive(),
    authorMode: commentAuthorModeSchema,
    authorName: z.string().optional(),
    content: z.string(),
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

export interface PreparedComment {
    postId: number;
    isAnonymous: boolean;
    authorName: string | null;
    content: string;
}

export interface PublicComment {
    id: number;
    postId: number;
    authorName: string | null;
    isAnonymous: boolean;
    content: string;
    createdAt: string;
    isOwn: boolean;
}

const CONTROL_AND_BIDI_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

export function normalizeAuthorName(raw: string): string {
    return raw
        .replace(CONTROL_AND_BIDI_REGEX, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizeCommentText(raw: string): string {
    return raw
        .replace(/\r\n?/g, "\n")
        .replace(CONTROL_AND_BIDI_REGEX, "")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim();
}

export function parseCommentAuthorMode(value: unknown): CommentAuthorMode | null {
    const parsed = commentAuthorModeSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

export function evaluateCommentRateLimit(
    recentCreatedAtMsDesc: number[],
    nowMs: number = Date.now()
): { allowed: true } | { allowed: false; errorCode: CommentErrorCode; retryAfterSeconds: number } {
    if (recentCreatedAtMsDesc.length === 0) {
        return { allowed: true };
    }

    const latestMs = recentCreatedAtMsDesc[0];
    const sinceLatestMs = nowMs - latestMs;

    if (sinceLatestMs < COMMENT_COOLDOWN_MS) {
        return {
            allowed: false,
            errorCode: CommentErrorCode.Cooldown,
            retryAfterSeconds: Math.max(1, Math.ceil((COMMENT_COOLDOWN_MS - sinceLatestMs) / 1000)),
        };
    }

    if (sinceLatestMs >= COMMENT_BURST_COOLDOWN_MS) {
        return { allowed: true };
    }

    let streakCount = 1;
    for (let i = 0; i < recentCreatedAtMsDesc.length - 1; i++) {
        const gapMs = recentCreatedAtMsDesc[i] - recentCreatedAtMsDesc[i + 1];
        if (gapMs >= COMMENT_BURST_COOLDOWN_MS) {
            break;
        }
        streakCount += 1;
    }

    if (streakCount >= COMMENT_BURST_MAX_COUNT) {
        return {
            allowed: false,
            errorCode: CommentErrorCode.Cooldown,
            retryAfterSeconds: Math.max(1, Math.ceil((COMMENT_BURST_COOLDOWN_MS - sinceLatestMs) / 1000)),
        };
    }

    return { allowed: true };
}

export function validateAndPrepareComment(
    input: unknown
): { ok: true; data: PreparedComment } | { ok: false; errorCode: CommentErrorCode } {
    const parsed = createCommentInputSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, errorCode: CommentErrorCode.InvalidInput };
    }

    const { postId, authorMode, authorName, content } = parsed.data;

    const isAnonymous = authorMode === CommentAuthorMode.Anonymous;
    let resolvedName: string | null = null;

    if (!isAnonymous) {
        const normalized = normalizeAuthorName(authorName ?? "");
        if (!normalized) {
            return { ok: false, errorCode: CommentErrorCode.NameRequired };
        }
        if (normalized.length > COMMENT_AUTHOR_MAX_LENGTH) {
            return { ok: false, errorCode: CommentErrorCode.NameTooLong };
        }
        resolvedName = normalized;
    }

    const normalizedContent = normalizeCommentText(content);
    if (normalizedContent.length < COMMENT_CONTENT_MIN_LENGTH) {
        return { ok: false, errorCode: CommentErrorCode.ContentTooShort };
    }
    if (normalizedContent.length > COMMENT_CONTENT_MAX_LENGTH) {
        return { ok: false, errorCode: CommentErrorCode.ContentTooLong };
    }

    return {
        ok: true,
        data: {
            postId,
            isAnonymous,
            authorName: resolvedName,
            content: normalizedContent,
        },
    };
}
