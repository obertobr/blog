"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dictionary,
    getDictionary,
    Locale,
    LOCALE_COOKIE_NAME,
    LOCALE_STORAGE_KEY,
    parseLocale,
} from "@/app/_lib/i18n";

interface LanguageContextValue {
    locale: Locale;
    t: Dictionary;
    setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({
    children,
    initialLocale,
}: {
    children: React.ReactNode;
    initialLocale: Locale;
}) {
    const router = useRouter();
    const [locale, setLocaleState] = useState<Locale>(initialLocale);

    useEffect(() => {
        setLocaleState(initialLocale);
    }, [initialLocale]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === LOCALE_STORAGE_KEY) {
                const updated = parseLocale(e.newValue);
                if (updated && updated !== locale) {
                    setLocaleState(updated);
                    document.cookie = `${LOCALE_COOKIE_NAME}=${updated}; path=/; max-age=31536000; SameSite=Lax`;
                    document.documentElement.lang = updated;
                    router.refresh();
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, [locale, router]);

    const setLocale = (newLocale: Locale) => {
        if (newLocale === locale) return;

        setLocaleState(newLocale);
        document.documentElement.lang = newLocale;
        document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

        try {
            localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
        } catch {
            // Ignorado em caso de restrições no browser
        }

        router.refresh();
    };

    const t = getDictionary(locale);

    return (
        <LanguageContext.Provider value={{ locale, t, setLocale }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextValue {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}

