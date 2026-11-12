"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { restoreVisitorHashAction } from "@/app/_lib/actions";
import { parseVisitorHash, VISITOR_STORAGE_KEY } from "@/app/_lib/visitor";

interface VisitorSyncProps {
    initialVisitorHash: string | null;
}

export default function VisitorSync({ initialVisitorHash }: VisitorSyncProps) {
    const router = useRouter();
    const syncedRef = useRef(false);

    useEffect(() => {
        if (syncedRef.current) return;
        syncedRef.current = true;

        try {
            const storedHash = parseVisitorHash(window.localStorage.getItem(VISITOR_STORAGE_KEY));
            const serverHash = parseVisitorHash(initialVisitorHash);

            if (storedHash) {
                if (storedHash !== serverHash) {
                    void restoreVisitorHashAction(storedHash).then((res) => {
                        if (res.success) {
                            router.refresh();
                        }
                    });
                }
                return;
            }

            if (serverHash) {
                window.localStorage.setItem(VISITOR_STORAGE_KEY, serverHash);
            }
        } catch {
        }
    }, [initialVisitorHash, router]);

    return null;
}

