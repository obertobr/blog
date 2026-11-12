"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deletePostAction } from "@/app/_lib/actions";

export default function DeletePostButton({ postId }: { postId: number }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = () => {
        if (!confirm("Tem certeza que deseja excluir este post?")) return;

        startTransition(async () => {
            const result = await deletePostAction(null, postId);
            if (result.success) {
                toast.success(result.message);
                router.push("/");
                router.refresh();
            } else {
                toast.error(result.error || "Erro ao excluir post");
            }
        });
    };

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-red-600 hover:text-red-800 hover:font-bold cursor-pointer transition-all disabled:opacity-50"
        >
            {isPending ? "Excluindo..." : "Excluir Post"}
        </button>
    );
}

