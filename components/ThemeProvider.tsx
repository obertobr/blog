"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    getInitialTheme,
    parseThemeMode,
    THEME_STORAGE_KEY,
    ThemeMode,
} from "@/app/_lib/theme";

interface ThemeContextValue {
    theme: ThemeMode;
    resolvedTheme: ThemeMode;
    setTheme: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemPreference(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>(ThemeMode.Light);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        const initial = getInitialTheme(stored, getSystemPreference());
        setThemeState(initial);

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === THEME_STORAGE_KEY) {
                const updated = parseThemeMode(e.newValue);
                if (updated) {
                    setThemeState(updated);
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        if (theme === ThemeMode.Dark) {
            root.classList.add("dark");
            root.style.colorScheme = "dark";
        } else {
            root.classList.remove("dark");
            root.style.colorScheme = "light";
        }
    }, [theme, mounted]);

    const setTheme = (newMode: ThemeMode) => {
        setThemeState(newMode);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, newMode);
        } catch {
            // Ignorado em caso de restrições no browser
        }
    };

    const toggleTheme = () => {
        setTheme(theme === ThemeMode.Dark ? ThemeMode.Light : ThemeMode.Dark);
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
