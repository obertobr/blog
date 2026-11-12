"use client";

import React, { useEffect } from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title,
    description,
    confirmLabel,
    cancelLabel,
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isLoading) {
                onCancel();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isLoading, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]"
            onClick={() => {
                if (!isLoading) onCancel();
            }}
        >
            <div
                className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gh-border bg-white dark:bg-gh-surface p-5 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3
                    id="confirm-modal-title"
                    className="text-base font-semibold text-gray-900 dark:text-gh-text"
                >
                    {title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gh-muted">
                    {description}
                </p>
                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={onCancel}
                        className="px-3.5 py-1.5 rounded-md border border-gray-300 dark:border-gh-border bg-white dark:bg-gh-subtle text-xs font-medium text-gray-700 dark:text-gh-text hover:bg-gray-50 dark:hover:bg-[#30363d]/60 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={onConfirm}
                        className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-[#da3633] dark:hover:bg-[#f85149] transition-colors cursor-pointer disabled:opacity-60"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

