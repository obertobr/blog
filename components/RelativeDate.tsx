import { formatFullDate, formatRelativeTime } from "@/app/_lib/date";

interface RelativeDateProps {
    date: Date | string | number;
    locale?: string;
    prefix?: string;
    className?: string;
}

export default function RelativeDate({
    date,
    locale = "pt-BR",
    prefix,
    className = "",
}: RelativeDateProps) {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    const isoString = d.toISOString();
    const fullDate = formatFullDate(d, locale);
    const relativeText = formatRelativeTime(d, locale);

    const displayText = prefix ? `${prefix} ${relativeText}` : relativeText;

    return (
        <time
            dateTime={isoString}
            title={fullDate}
            suppressHydrationWarning
            className={`cursor-help hover:text-gray-900 transition-colors ${className}`}
        >
            {displayText}
        </time>
    );
}

