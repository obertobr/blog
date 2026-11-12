import { getDictionary, Locale, parseLocale } from "./i18n";

export function formatRelativeTime(
    date: Date | string | number,
    locale: string = Locale.PtBr,
    nowDate: Date = new Date()
): string {
    const resolvedLocale = parseLocale(locale) ?? Locale.PtBr;
    const { relativeDate } = getDictionary(resolvedLocale);
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    const diffInSeconds = Math.floor((nowDate.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 0 || diffInSeconds < 60) {
        return relativeDate.justNow;
    }

    const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: "always" });

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
        const yearUnit = years === 1 ? relativeDate.yearSingular : relativeDate.yearPlural;
        const yearStr = `${years} ${yearUnit}`;
        if (months === 0) {
            return relativeDate.compositeSingleTemplate.replace("{years}", yearStr);
        }
        const monthUnit = months === 1 ? relativeDate.monthSingular : relativeDate.monthPlural;
        const monthStr = `${months} ${monthUnit}`;
        return relativeDate.compositeTemplate
            .replace("{years}", yearStr)
            .replace("{months}", monthStr);
    }

    return rtf.format(-diffInMonths, "month");
}

export function formatFullDate(
    date: Date | string | number,
    locale: string = Locale.PtBr
): string {
    const resolvedLocale = parseLocale(locale) ?? Locale.PtBr;
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    return new Intl.DateTimeFormat(resolvedLocale, {
        dateStyle: "long",
        timeStyle: "short",
    }).format(d);
}
