"use client";

import { formatFullDate, formatRelativeTime } from "@/app/_lib/date";
import { useLanguage } from "./LanguageProvider";

interface RelativeDateProps {
    date: Date | string | number;
    locale?: string;
    prefix?: string;
    className?: string;
}

export default function RelativeDate({
    date,
    locale: explicitLocale,
    prefix,
    className = "",
}: RelativeDateProps) {
    const { locale: contextLocale } = useLanguage();
    const activeLocale = explicitLocale || contextLocale;

    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    const isoString = d.toISOString();
    const fullDate = formatFullDate(d, activeLocale);
    const relativeText = formatRelativeTime(d, activeLocale);

    const displayText = prefix ? `${prefix} ${relativeText}` : relativeText;

    return (
        <time
            dateTime={isoString}
            title={fullDate}
            suppressHydrationWarning
            className={`cursor-help hover:text-gray-900 dark:hover:text-gh-text transition-colors ${className}`}
        >
            {displayText}
        </time>
    );
}
