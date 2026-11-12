"use client";

import { useEffect, useRef } from "react";
import { recordPostReadAction } from "@/app/_lib/actions";

interface PostReadTrackerProps {
    postId: number;
}

export default function PostReadTracker({ postId }: PostReadTrackerProps) {
    const trackedPostIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (trackedPostIdRef.current === postId) {
            return;
        }
        trackedPostIdRef.current = postId;
        void recordPostReadAction(postId);
    }, [postId]);

    return null;
}

