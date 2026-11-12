"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deletePostAction } from "@/app/_lib/actions";
import ConfirmModal from "./ConfirmModal";
import { useLanguage } from "./LanguageProvider";

export default function DeletePostButton({ postId }: { postId: number }) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { t } = useLanguage();

    const handleConfirmDelete = () => {
        startTransition(async () => {
            const result = await deletePostAction(null, postId);
            if (result.success) {
                setIsConfirmOpen(false);
                toast.success(result.message);
                router.push("/");
                router.refresh();
            } else {
                toast.error(result.error || t.post.deleteError);
            }
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                disabled={isPending}
                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:font-bold cursor-pointer transition-all disabled:opacity-50"
            >
                {isPending ? t.post.deleting : t.post.deletePost}
            </button>
            <ConfirmModal
                isOpen={isConfirmOpen}
                title={t.post.deleteConfirmTitle}
                description={t.post.deleteConfirm}
                confirmLabel={isPending ? t.post.deleting : t.post.deletePost}
                cancelLabel={t.comments.cancel}
                isLoading={isPending}
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsConfirmOpen(false)}
            />
        </>
    );
}
