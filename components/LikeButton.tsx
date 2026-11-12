"use client";

import React, { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { toggleLikeAction } from "@/app/_lib/actions";
import { useLanguage } from "./LanguageProvider";
import ThumbsUpIcon from "./ThumbsUpIcon";

interface LikeButtonProps {
    postId: number;
    initialLiked: boolean;
    initialLikesCount: number;
}

export default function LikeButton({
    postId,
    initialLiked,
    initialLikesCount,
}: LikeButtonProps) {
    const { t } = useLanguage();
    const [liked, setLiked] = useState(initialLiked);
    const [likesCount, setLikesCount] = useState(initialLikesCount);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setLiked(initialLiked);
        setLikesCount(initialLikesCount);
    }, [initialLiked, initialLikesCount]);

    const handleToggleLike = () => {
        if (isPending) return;

        const prevLiked = liked;
        const prevCount = likesCount;
        const nextLiked = !prevLiked;
        const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

        setLiked(nextLiked);
        setLikesCount(nextCount);

        startTransition(async () => {
            const result = await toggleLikeAction(postId);
            if ("error" in result) {
                setLiked(prevLiked);
                setLikesCount(prevCount);
                toast.error(t.likes.error);
                return;
            }

            setLiked(result.liked);
            setLikesCount(result.likesCount);
        });
    };

    return (
        <button
            type="button"
            onClick={handleToggleLike}
            disabled={isPending}
            aria-pressed={liked}
            aria-label={liked ? t.likes.ariaUnlike : t.likes.ariaLike}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md border text-sm font-medium transition-colors cursor-pointer disabled:opacity-70 ${
                liked
                    ? "border-sky-300 dark:border-gh-blue/60 bg-sky-50 dark:bg-sky-950/35 text-sky-700 dark:text-gh-blue hover:bg-sky-100 dark:hover:bg-sky-950/55"
                    : "border-gray-300 dark:border-gh-border bg-white dark:bg-gh-subtle text-gray-700 dark:text-gh-text hover:bg-gray-100 dark:hover:bg-[#30363d]/60 hover:border-gray-400 dark:hover:border-gh-muted"
            }`}
        >
            <ThumbsUpIcon
                filled={liked}
                className={`w-4 h-4 transition-transform ${liked ? "scale-110 text-sky-600 dark:text-gh-blue" : ""}`}
            />
            <span>{liked ? t.likes.liked : t.likes.like}</span>
            <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-xs font-semibold tabular-nums ${
                    liked
                        ? "bg-sky-200/70 dark:bg-sky-900/60 text-sky-800 dark:text-gh-blue"
                        : "bg-gray-100 dark:bg-gh-canvas text-gray-600 dark:text-gh-muted"
                }`}
            >
                {likesCount}
            </span>
        </button>
    );
}
