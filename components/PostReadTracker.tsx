"use client";

import React, { useEffect, useRef } from "react";
import { recordPostReadAction, recordPostReadProgressAction } from "@/app/_lib/actions";
import {
    PARTIAL_READ_MIN_TIME_MS,
    PARTIAL_READ_SCROLL_THRESHOLD,
    VERIFIED_SCROLL_DEPTH_THRESHOLD,
} from "@/app/_lib/recommendation";

interface PostReadTrackerProps {
    postId: number;
    minReadTimeMs: number;
}

export default function PostReadTracker({ postId, minReadTimeMs }: PostReadTrackerProps) {
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const enteredAtMs = Date.now();
        let activeSegmentStartMs: number | null =
            document.visibilityState === "visible" ? enteredAtMs : null;
        let accumulatedActiveMs = 0;
        let maxScrollDepth = 0;
        let reachedEnd = false;
        let completedSent = false;
        let completionTimer: ReturnType<typeof setTimeout> | null = null;

        void recordPostReadAction(postId);

        const getActiveTimeMs = () => {
            const currentSegment =
                activeSegmentStartMs !== null ? Date.now() - activeSegmentStartMs : 0;
            return Math.max(0, Math.round(accumulatedActiveMs + currentSegment));
        };

        const computeViewportScrollDepth = () => {
            const sentinel = sentinelRef.current;
            if (!sentinel) return maxScrollDepth;

            const rect = sentinel.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
            const sentinelPageTop = rect.top + window.scrollY;
            if (sentinelPageTop <= 0) return 1;

            const currentBottom = window.scrollY + viewportHeight;
            const ratio = Math.min(1, Math.max(0, currentBottom / sentinelPageTop));
            return ratio;
        };

        const clearCompletionTimer = () => {
            if (completionTimer !== null) {
                clearTimeout(completionTimer);
                completionTimer = null;
            }
        };

        const trySendVerifiedCompletion = () => {
            if (completedSent || !reachedEnd) {
                return;
            }

            const activeTimeMs = getActiveTimeMs();
            const remainingMs = minReadTimeMs - activeTimeMs;

            if (remainingMs <= 0) {
                completedSent = true;
                clearCompletionTimer();
                void recordPostReadProgressAction({
                    postId,
                    activeTimeMs,
                    scrollDepth: Math.max(maxScrollDepth, VERIFIED_SCROLL_DEPTH_THRESHOLD),
                    reachedEnd: true,
                    enteredAtMs,
                    completedAtMs: Date.now(),
                });
                return;
            }

            if (document.visibilityState === "visible" && completionTimer === null) {
                completionTimer = setTimeout(() => {
                    completionTimer = null;
                    trySendVerifiedCompletion();
                }, remainingMs + 50);
            }
        };

        const updateScrollProgress = () => {
            const depth = computeViewportScrollDepth();
            if (depth > maxScrollDepth) {
                maxScrollDepth = depth;
            }
            if (maxScrollDepth >= VERIFIED_SCROLL_DEPTH_THRESHOLD) {
                reachedEnd = true;
                trySendVerifiedCompletion();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                if (activeSegmentStartMs !== null) {
                    accumulatedActiveMs += Date.now() - activeSegmentStartMs;
                    activeSegmentStartMs = null;
                }
                clearCompletionTimer();
            } else if (document.visibilityState === "visible") {
                if (activeSegmentStartMs === null) {
                    activeSegmentStartMs = Date.now();
                }
                trySendVerifiedCompletion();
            }
        };

        let observer: IntersectionObserver | null = null;
        if (typeof IntersectionObserver !== "undefined" && sentinelRef.current) {
            observer = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            reachedEnd = true;
                            maxScrollDepth = 1;
                            trySendVerifiedCompletion();
                        }
                    }
                },
                { threshold: 0.1 }
            );
            observer.observe(sentinelRef.current);
        }

        updateScrollProgress();
        window.addEventListener("scroll", updateScrollProgress, { passive: true });
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearCompletionTimer();
            observer?.disconnect();
            window.removeEventListener("scroll", updateScrollProgress);
            document.removeEventListener("visibilitychange", handleVisibilityChange);

            if (!completedSent) {
                const finalActiveMs = getActiveTimeMs();
                if (
                    maxScrollDepth >= PARTIAL_READ_SCROLL_THRESHOLD ||
                    finalActiveMs >= PARTIAL_READ_MIN_TIME_MS
                ) {
                    void recordPostReadProgressAction({
                        postId,
                        activeTimeMs: finalActiveMs,
                        scrollDepth: maxScrollDepth,
                        reachedEnd: false,
                        enteredAtMs,
                    });
                }
            }
        };
    }, [postId, minReadTimeMs]);

    return <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />;
}
