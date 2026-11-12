"use client";

import React, { useEffect, useRef, useState } from "react";
import { Locale } from "@/app/_lib/i18n";
import { useLanguage } from "./LanguageProvider";

function GlobeIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
        </svg>
    );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function ChevronDownIcon({ className = "w-3 h-3" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

interface LocaleOptionConfig {
    locale: Locale;
    shortLabel: string;
    fullLabel: string;
}

const LOCALE_OPTIONS: readonly LocaleOptionConfig[] = [
    { locale: Locale.PtBr, shortLabel: "PT-BR", fullLabel: "Português" },
    { locale: Locale.En, shortLabel: "EN", fullLabel: "English" },
] as const;

const LOCALE_SHORT_LABEL_REGISTRY: Record<Locale, string> = {
    [Locale.PtBr]: "PT-BR",
    [Locale.En]: "EN",
};

export default function LanguageToggle() {
    const { locale, t, setLocale } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={t.nav.selectLanguageLabel}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gh-border bg-gray-50 dark:bg-gh-subtle text-gray-700 dark:text-gh-text hover:bg-gray-100 dark:hover:bg-[#30363d] transition shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <GlobeIcon className="w-4 h-4 text-gray-600 dark:text-gh-muted" />
                <span>{LOCALE_SHORT_LABEL_REGISTRY[locale]}</span>
                <ChevronDownIcon className={`w-3 h-3 text-gray-400 dark:text-gh-muted transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div
                    role="menu"
                    aria-orientation="vertical"
                    className="absolute right-0 mt-2 w-36 rounded-xl border border-gray-200 dark:border-gh-border bg-white dark:bg-gh-surface p-1 shadow-lg shadow-black/15 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                    {LOCALE_OPTIONS.map((option) => {
                        const isSelected = locale === option.locale;

                        return (
                            <button
                                key={option.locale}
                                role="menuitem"
                                type="button"
                                onClick={() => {
                                    setLocale(option.locale);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                                    isSelected
                                        ? "bg-blue-50 dark:bg-gh-subtle text-blue-600 dark:text-gh-blue font-semibold"
                                        : "text-gray-700 dark:text-gh-text hover:bg-gray-100 dark:hover:bg-[#1f242c]"
                                }`}
                            >
                                <span>{option.fullLabel}</span>
                                {isSelected && <CheckIcon className="w-3.5 h-3.5 text-blue-600 dark:text-gh-blue" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

