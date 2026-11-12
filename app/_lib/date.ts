export function formatRelativeTime(
    date: Date | string | number,
    locale: string = "pt-BR",
    nowDate: Date = new Date()
): string {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    const diffInSeconds = Math.floor((nowDate.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 0) {
        return "agora mesmo";
    }

    if (diffInSeconds < 60) {
        return "agora mesmo";
    }

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always" });

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return rtf.format(-diffInMinutes, "minute");
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return rtf.format(-diffInHours, "hour");
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return rtf.format(-diffInDays, "day");
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInDays < 30) {
        return rtf.format(-diffInWeeks, "week");
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInDays < 365) {
        return rtf.format(-diffInMonths, "month");
    }

    let years = nowDate.getFullYear() - d.getFullYear();
    let months = nowDate.getMonth() - d.getMonth();
    if (nowDate.getDate() < d.getDate()) {
        months -= 1;
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    if (years >= 1) {
        if (locale.startsWith("en")) {
            const yearStr = years === 1 ? "1 year" : `${years} years`;
            if (months === 0) return `${yearStr} ago`;
            const monthStr = months === 1 ? "1 month" : `${months} months`;
            return `${yearStr} and ${monthStr} ago`;
        }

        const yearStr = years === 1 ? "1 ano" : `${years} anos`;
        if (months === 0) return `há ${yearStr}`;
        const monthStr = months === 1 ? "1 mês" : `${months} meses`;
        return `há ${yearStr} e ${monthStr}`;
    }

    return rtf.format(-diffInMonths, "month");
}

export function formatFullDate(
    date: Date | string | number,
    locale: string = "pt-BR"
): string {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short",
    }).format(d);
}

