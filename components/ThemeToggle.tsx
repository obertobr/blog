"use client";

import React, { useEffect, useRef, useState } from "react";
import { ThemeMode } from "@/app/_lib/theme";
import { useTheme } from "./ThemeProvider";

function SunIcon({ className = "w-4 h-4" }: { className?: string }) {
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
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </svg>
    );
}

function MoonIcon({ className = "w-4 h-4" }: { className?: string }) {
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
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
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

interface ThemeOptionConfig {
    mode: ThemeMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const THEME_OPTIONS: readonly ThemeOptionConfig[] = [
    { mode: ThemeMode.Light, label: "Claro", icon: SunIcon },
    { mode: ThemeMode.Dark, label: "Escuro", icon: MoonIcon },
] as const;

const THEME_ICON_REGISTRY: Record<ThemeMode, React.ComponentType<{ className?: string }>> = {
    [ThemeMode.Light]: SunIcon,
    [ThemeMode.Dark]: MoonIcon,
};

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

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

    const ActiveIcon = mounted ? THEME_ICON_REGISTRY[theme] : SunIcon;
    const activeLabel = mounted ? (theme === ThemeMode.Dark ? "Escuro" : "Claro") : "Tema";

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="Alternar tema visual"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gh-border bg-gray-50 dark:bg-gh-subtle text-gray-700 dark:text-gh-text hover:bg-gray-100 dark:hover:bg-[#30363d] transition shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <ActiveIcon className="w-4 h-4 text-gray-600 dark:text-gh-muted" />
                <span className="hidden sm:inline">
                    {activeLabel}
                </span>
                <ChevronDownIcon className={`w-3 h-3 text-gray-400 dark:text-gh-muted transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div
                    role="menu"
                    aria-orientation="vertical"
                    className="absolute right-0 mt-2 w-32 rounded-xl border border-gray-200 dark:border-gh-border bg-white dark:bg-gh-surface p-1 shadow-lg shadow-black/15 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                    {THEME_OPTIONS.map((option) => {
                        const IconComponent = option.icon;
                        const isSelected = mounted && theme === option.mode;

                        return (
                            <button
                                key={option.mode}
                                role="menuitem"
                                type="button"
                                onClick={() => {
                                    setTheme(option.mode);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                                    isSelected
                                        ? "bg-blue-50 dark:bg-gh-subtle text-blue-600 dark:text-gh-blue font-semibold"
                                        : "text-gray-700 dark:text-gh-text hover:bg-gray-100 dark:hover:bg-[#1f242c]"
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <IconComponent className={`w-4 h-4 ${isSelected ? "text-blue-600 dark:text-gh-blue" : "text-gray-500 dark:text-gh-muted"}`} />
                                    {option.label}
                                </span>
                                {isSelected && <CheckIcon className="w-3.5 h-3.5 text-blue-600 dark:text-gh-blue" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
