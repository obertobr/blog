"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deletePostAction } from "@/app/_lib/actions";
import { useLanguage } from "./LanguageProvider";

export default function DeletePostButton({ postId }: { postId: number }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { t } = useLanguage();

    const handleDelete = () => {
        if (!confirm(t.post.deleteConfirm)) return;

        startTransition(async () => {
            const result = await deletePostAction(null, postId);
            if (result.success) {
                toast.success(result.message);
                router.push("/");
                router.refresh();
            } else {
                toast.error(result.error || t.post.deleteError);
            }
        });
    };

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:font-bold cursor-pointer transition-all disabled:opacity-50"
        >
            {isPending ? t.post.deleting : t.post.deletePost}
        </button>
    );
}
