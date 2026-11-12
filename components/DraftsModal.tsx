"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { deletePostAction, listDraftsAction } from "@/app/_lib/actions";
import { useLanguage } from "./LanguageProvider";
import RelativeDate from "./RelativeDate";

interface DraftItem {
    id: number;
    title: string | null;
    slug: string;
    updatedAt: string | Date;
    content: string;
    tags: string[];
}

function getDraftDisplayTitle(title: string | null, content: string, fallback: string): string {
    const trimmed = title?.trim();
    if (trimmed) return trimmed;

    const firstNonEmptyLine = content
        .split("\n")
        .map(line => line.replace(/^[#*`_>\-\s]+/, "").trim())
        .find(line => line.length > 0);

    return firstNonEmptyLine ? firstNonEmptyLine.slice(0, 60) : fallback;
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
    const { t } = useLanguage();
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
        if (!window.confirm(t.draftsModal.deleteConfirm)) return;

        const res = await deletePostAction(null, id);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success(t.draftsModal.deletedSuccess);
            setDrafts(prev => prev.filter(d => d.id !== id));
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gh-surface rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] border border-gray-200 dark:border-gh-border overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gh-border flex justify-between items-center bg-gray-50 dark:bg-gh-subtle">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gh-text">{t.draftsModal.title}</h2>
                        <p className="text-xs text-gray-500 dark:text-gh-muted">{t.draftsModal.subtitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gh-text p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#30363d] text-lg leading-none transition cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gh-border">
                    {loading && (
                        <div className="py-12 text-center text-sm text-gray-500 dark:text-gh-muted">
                            {t.draftsModal.loading}
                        </div>
                    )}

                    {!loading && drafts.length === 0 && (
                        <div className="py-12 text-center text-sm text-gray-500 dark:text-gh-muted">
                            {t.draftsModal.empty}
                        </div>
                    )}

                    {!loading && drafts.map(draft => {
                        const isCurrent = currentDraftId === draft.id;

                        return (
                            <div
                                key={draft.id}
                                onClick={() => {
                                    onSelectDraft(draft.id);
                                    onClose();
                                }}
                                className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between gap-4 hover:bg-sky-50 dark:hover:bg-gh-subtle ${
                                    isCurrent ? "bg-sky-50/80 dark:bg-gh-subtle border border-sky-300 dark:border-gh-blue/50" : ""
                                }`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-gh-text truncate">
                                            {getDraftDisplayTitle(draft.title, draft.content, t.draftsModal.untitledDraft)}
                                        </h3>
                                        {isCurrent && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                                                {t.draftsModal.inEditing}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gh-muted truncate mt-0.5">
                                        {draft.content ? draft.content.replace(/[#*`_>]/g, "").slice(0, 120) : t.draftsModal.noContent}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400 dark:text-gh-muted">
                                        <RelativeDate date={draft.updatedAt} prefix={t.draftsModal.lastChanged} className="text-[11px] text-gray-400 dark:text-gh-muted" />
                                        {draft.tags.length > 0 && (
                                            <>
                                                <span>•</span>
                                                <span className="truncate">{t.draftsModal.tagsPrefix} {draft.tags.join(", ")}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={(e) => handleDelete(e, draft.id)}
                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-xs transition cursor-pointer"
                                        title={t.draftsModal.deleteTooltip}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-3 border-t border-gray-200 dark:border-gh-border bg-gray-50 dark:bg-gh-subtle flex justify-between items-center text-xs text-gray-500 dark:text-gh-muted">
                    <span>{drafts.length} {t.draftsModal.savedDraftsSuffix}</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-white dark:bg-gh-canvas border border-gray-300 dark:border-gh-border rounded-lg text-gray-700 dark:text-gh-text hover:bg-gray-100 dark:hover:bg-[#30363d] font-medium transition cursor-pointer"
                    >
                        {t.draftsModal.close}
                    </button>
                </div>
            </div>
        </div>
    );
}
