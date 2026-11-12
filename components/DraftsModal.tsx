"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { deletePostAction, listDraftsAction } from "@/app/_lib/actions";

interface DraftItem {
    id: number;
    title: string | null;
    slug: string;
    updatedAt: string | Date;
    content: string;
    tags: string[];
}

function getDraftDisplayTitle(title: string | null, content: string): string {
    const trimmed = title?.trim();
    if (trimmed) return trimmed;

    const firstNonEmptyLine = content
        .split("\n")
        .map(line => line.replace(/^[#*`_>\-\s]+/, "").trim())
        .find(line => line.length > 0);

    return firstNonEmptyLine ? firstNonEmptyLine.slice(0, 60) : "Rascunho sem título";
}

interface DraftsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDraft: (id: number) => void;
    currentDraftId?: number | null;
}

export default function DraftsModal({
    isOpen,
    onClose,
    onSelectDraft,
    currentDraftId,
}: DraftsModalProps) {
    const [drafts, setDrafts] = useState<DraftItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        listDraftsAction().then(res => {
            setLoading(false);
            if (res.error) {
                toast.error(res.error);
            } else {
                setDrafts(res.drafts || []);
            }
        });
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!window.confirm("Deseja realmente excluir este rascunho?")) return;

        const res = await deletePostAction(null, id);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Rascunho excluído");
            setDrafts(prev => prev.filter(d => d.id !== id));
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] border border-gray-200 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Meus Rascunhos</h2>
                        <p className="text-xs text-gray-500">Selecione um rascunho salvo para continuar a edição</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200 text-lg leading-none transition"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 divide-y divide-gray-100">
                    {loading && (
                        <div className="py-12 text-center text-sm text-gray-500">
                            Carregando rascunhos...
                        </div>
                    )}

                    {!loading && drafts.length === 0 && (
                        <div className="py-12 text-center text-sm text-gray-500">
                            Nenhum rascunho encontrado. Os rascunhos são salvos automaticamente enquanto você escreve.
                        </div>
                    )}

                    {!loading && drafts.map(draft => {
                        const isCurrent = currentDraftId === draft.id;
                        const dateFormatted = new Date(draft.updatedAt).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                        });

                        return (
                            <div
                                key={draft.id}
                                onClick={() => {
                                    onSelectDraft(draft.id);
                                    onClose();
                                }}
                                className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between gap-4 hover:bg-sky-50 ${
                                    isCurrent ? "bg-sky-50/80 border border-sky-300" : ""
                                }`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {getDraftDisplayTitle(draft.title, draft.content)}
                                        </h3>
                                        {isCurrent && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-200 text-sky-800">
                                                Em edição
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                        {draft.content ? draft.content.replace(/[#*`_>]/g, "").slice(0, 120) : "Sem conteúdo"}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                                        <span>Última alteração: {dateFormatted}</span>
                                        {draft.tags.length > 0 && (
                                            <>
                                                <span>•</span>
                                                <span className="truncate">Tags: {draft.tags.join(", ")}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={(e) => handleDelete(e, draft.id)}
                                        className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 text-xs transition"
                                        title="Excluir rascunho"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                    <span>{drafts.length} rascunho(s) salvo(s)</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

