"use client";

import React, { FormEvent, useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createCommentAction, deleteCommentAction } from "@/app/_lib/actions";
import {
    COMMENT_AUTHOR_MAX_LENGTH,
    COMMENT_CONTENT_MAX_LENGTH,
    COMMENT_COUNTER_THRESHOLD,
    COMMENT_MODE_STORAGE_KEY,
    COMMENT_NAME_STORAGE_KEY,
    CommentAuthorMode,
    CommentErrorCode,
    parseCommentAuthorMode,
    PublicComment,
} from "@/app/_lib/comment";
import { Dictionary } from "@/app/_lib/i18n";
import ConfirmModal from "./ConfirmModal";
import { useLanguage } from "./LanguageProvider";
import RelativeDate from "./RelativeDate";

type CommentSimpleErrorKey = Exclude<
    keyof Dictionary["comments"]["errors"],
    "cooldownPrefix" | "cooldownSuffix"
>;

const COMMENT_ERROR_KEY_REGISTRY: Partial<Record<CommentErrorCode, CommentSimpleErrorKey>> = {
    [CommentErrorCode.InvalidInput]: "invalidInput",
    [CommentErrorCode.NameRequired]: "nameRequired",
    [CommentErrorCode.NameTooLong]: "nameTooLong",
    [CommentErrorCode.ContentTooShort]: "contentTooShort",
    [CommentErrorCode.ContentTooLong]: "contentTooLong",
    [CommentErrorCode.RateLimited]: "rateLimited",
    [CommentErrorCode.Duplicate]: "duplicate",
    [CommentErrorCode.PostNotFound]: "postNotFound",
    [CommentErrorCode.Unauthorized]: "unauthorized",
    [CommentErrorCode.GenericError]: "genericError",
};

function resolveCommentErrorMessage(
    errorCode: CommentErrorCode,
    t: Dictionary,
    retryAfterSeconds?: number
): string {
    if (errorCode === CommentErrorCode.Cooldown) {
        const seconds = retryAfterSeconds ?? 1;
        return `${t.comments.errors.cooldownPrefix} ${seconds}${t.comments.errors.cooldownSuffix}`;
    }

    const messageKey = COMMENT_ERROR_KEY_REGISTRY[errorCode] ?? "genericError";
    return t.comments.errors[messageKey];
}

interface CommentsSectionProps {
    postId: number;
    initialComments: PublicComment[];
    initialSavedName: string | null;
    isAdmin: boolean;
}

export default function CommentsSection({
    postId,
    initialComments,
    initialSavedName,
    isAdmin,
}: CommentsSectionProps) {
    const { locale, t } = useLanguage();
    const [comments, setComments] = useState<PublicComment[]>(initialComments);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [authorMode, setAuthorMode] = useState<CommentAuthorMode>(CommentAuthorMode.Anonymous);
    const [authorName, setAuthorName] = useState<string>(initialSavedName ?? "");
    const [content, setContent] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setComments(initialComments);
    }, [initialComments]);

    useEffect(() => {
        try {
            const storedMode = parseCommentAuthorMode(
                window.localStorage.getItem(COMMENT_MODE_STORAGE_KEY)
            );
            if (storedMode) {
                setAuthorMode(storedMode);
            }

            const storedName = window.localStorage.getItem(COMMENT_NAME_STORAGE_KEY);
            const resolvedInitialName = storedName || initialSavedName || "";
            if (resolvedInitialName) {
                setAuthorName(resolvedInitialName);
                if (!storedName && initialSavedName) {
                    window.localStorage.setItem(COMMENT_NAME_STORAGE_KEY, initialSavedName);
                }
            }
        } catch {
        }
    }, [initialSavedName]);

    const isAnonymous = authorMode === CommentAuthorMode.Anonymous;
    const isNearLimit = content.length >= COMMENT_COUNTER_THRESHOLD;

    const handleToggleAnonymous = (checked: boolean) => {
        const nextMode = checked ? CommentAuthorMode.Anonymous : CommentAuthorMode.Named;
        setAuthorMode(nextMode);
        try {
            window.localStorage.setItem(COMMENT_MODE_STORAGE_KEY, nextMode);
        } catch {
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isPending) return;

        startTransition(async () => {
            const result = await createCommentAction({
                postId,
                authorMode,
                authorName: isAnonymous ? undefined : authorName,
                content,
            });

            if (!result.success) {
                toast.error(
                    resolveCommentErrorMessage(result.errorCode, t, result.retryAfterSeconds)
                );
                return;
            }

            setComments((prev) => [result.comment, ...prev]);
            setContent("");
            setIsComposerOpen(false);

            if (!result.comment.isAnonymous && result.comment.authorName) {
                setAuthorName(result.comment.authorName);
                try {
                    window.localStorage.setItem(
                        COMMENT_NAME_STORAGE_KEY,
                        result.comment.authorName
                    );
                } catch {
                }
            }

            toast.success(t.comments.submittedSuccess);
        });
    };

    const handleConfirmDeleteComment = async () => {
        if (confirmDeleteId === null) return;

        const targetId = confirmDeleteId;
        setDeletingId(targetId);
        try {
            const result = await deleteCommentAction(targetId);
            if (!result.success) {
                toast.error(resolveCommentErrorMessage(result.errorCode, t));
                return;
            }

            setComments((prev) => prev.filter((item) => item.id !== targetId));
            setConfirmDeleteId(null);
            toast.success(t.comments.deletedSuccess);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section
            id="comments"
            className="m-5 mt-4 bg-white dark:bg-gh-surface border border-gray-300 dark:border-gh-border rounded-lg shadow-xs overflow-hidden"
        >
            <div className="px-5 py-2.5 border-b border-gray-200 dark:border-gh-border bg-gray-50/70 dark:bg-gh-subtle/50">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gh-text">
                    {t.comments.title}
                </h2>
            </div>

            {!isComposerOpen ? (
                <button
                    type="button"
                    onClick={() => setIsComposerOpen(true)}
                    aria-expanded={false}
                    className="w-full px-5 py-2 border-b border-gray-200 dark:border-gh-border text-center text-xs font-medium text-sky-600 dark:text-gh-blue hover:bg-gray-50 dark:hover:bg-gh-subtle/40 transition-colors cursor-pointer"
                >
                    {t.comments.newComment}
                </button>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="px-5 py-3.5 border-b border-gray-200 dark:border-gh-border space-y-2.5 bg-gray-50/30 dark:bg-gh-canvas/30"
                >
                    <div className="flex items-center gap-2 flex-wrap">
                        <input
                            id="comment-author-name"
                            type="text"
                            disabled={isAnonymous}
                            maxLength={COMMENT_AUTHOR_MAX_LENGTH}
                            value={isAnonymous ? "" : authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            placeholder={isAnonymous ? t.comments.anonymousLabel : t.comments.namePlaceholder}
                            aria-label={t.comments.namePlaceholder}
                            className="flex-1 min-w-[180px] max-w-xs px-2.5 py-1 text-sm rounded-md border border-gray-300 dark:border-gh-border bg-white dark:bg-gh-canvas text-gray-900 dark:text-gh-text placeholder-gray-400 dark:placeholder-gh-muted focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-gh-blue disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <label
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer select-none transition-colors ${
                                isAnonymous
                                    ? "border-sky-300 dark:border-gh-blue/60 bg-sky-50 dark:bg-sky-950/35 text-sky-700 dark:text-gh-blue"
                                    : "border-gray-300 dark:border-gh-border bg-white dark:bg-gh-canvas text-gray-600 dark:text-gh-muted hover:text-gray-900 dark:hover:text-gh-text"
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => handleToggleAnonymous(e.target.checked)}
                                className="w-3.5 h-3.5 accent-sky-600 dark:accent-gh-blue cursor-pointer"
                            />
                            <span>{t.comments.modeAnonymous}</span>
                        </label>
                    </div>

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={COMMENT_CONTENT_MAX_LENGTH}
                        rows={3}
                        placeholder={t.comments.contentPlaceholder}
                        aria-label={t.comments.contentPlaceholder}
                        className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gh-border bg-white dark:bg-gh-canvas text-gray-900 dark:text-gh-text placeholder-gray-400 dark:placeholder-gh-muted focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-gh-blue resize-y min-h-[72px]"
                    />

                    <div className="flex items-center justify-end gap-3">
                        {isNearLimit && (
                            <span
                                className={`text-[11px] tabular-nums ${
                                    content.length >= COMMENT_CONTENT_MAX_LENGTH - 200
                                        ? "text-amber-600 dark:text-amber-400 font-medium"
                                        : "text-gray-500 dark:text-gh-muted"
                                }`}
                            >
                                {content.length} / {COMMENT_CONTENT_MAX_LENGTH}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsComposerOpen(false)}
                            className="px-3 py-1 rounded-md border border-gray-300 dark:border-gh-border bg-white dark:bg-gh-canvas text-xs font-medium text-gray-600 dark:text-gh-muted hover:text-gray-900 dark:hover:text-gh-text transition-colors cursor-pointer"
                        >
                            {t.comments.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-3.5 py-1 rounded-md text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 dark:bg-[#238636] dark:hover:bg-[#2ea043] transition-colors cursor-pointer disabled:opacity-60"
                        >
                            {isPending ? t.comments.submitting : t.comments.submit}
                        </button>
                    </div>
                </form>
            )}

            <div className="divide-y divide-gray-200 dark:divide-gh-border">
                {comments.length === 0 ? (
                    <p className="px-5 py-4 text-xs text-gray-500 dark:text-gh-muted text-center">
                        {t.comments.empty}
                    </p>
                ) : (
                    comments.map((comment) => {
                        const displayAuthor =
                            comment.isAnonymous || !comment.authorName
                                ? t.comments.anonymousLabel
                                : comment.authorName;
                        const canDelete = isAdmin || comment.isOwn;

                        return (
                            <article key={comment.id} className="px-5 py-3">
                                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                        <span
                                            className={`font-semibold ${
                                                comment.isOwn
                                                    ? "text-sky-600 dark:text-gh-blue"
                                                    : "text-gray-900 dark:text-gh-text"
                                            }`}
                                        >
                                            {displayAuthor}
                                        </span>
                                        <span className="text-gray-300 dark:text-gh-border">•</span>
                                        <RelativeDate
                                            date={comment.createdAt}
                                            locale={locale}
                                            className="text-gray-500 dark:text-gh-muted"
                                        />
                                    </div>
                                    {canDelete && (
                                        <button
                                            type="button"
                                            disabled={deletingId === comment.id}
                                            onClick={() => setConfirmDeleteId(comment.id)}
                                            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:font-bold cursor-pointer transition-all disabled:opacity-50"
                                        >
                                            {deletingId === comment.id
                                                ? t.comments.deletingLabel
                                                : t.comments.deleteLabel}
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-800 dark:text-gh-text whitespace-pre-wrap break-words leading-snug">
                                    {comment.content}
                                </p>
                            </article>
                        );
                    })
                )}
            </div>
            <ConfirmModal
                isOpen={confirmDeleteId !== null}
                title={t.comments.deleteConfirmTitle}
                description={t.comments.deleteConfirm}
                confirmLabel={deletingId !== null ? t.comments.deletingLabel : t.comments.deleteLabel}
                cancelLabel={t.comments.cancel}
                isLoading={deletingId !== null}
                onConfirm={handleConfirmDeleteComment}
                onCancel={() => setConfirmDeleteId(null)}
            />
        </section>
    );
}
