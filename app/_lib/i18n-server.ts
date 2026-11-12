import { cookies, headers } from "next/headers";
import {
    detectLocaleFromAcceptLanguage,
    Dictionary,
    getDictionary,
    Locale,
    LOCALE_COOKIE_NAME,
    parseLocale,
} from "./i18n";

export async function getServerLocale(): Promise<Locale> {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    const parsedCookie = parseLocale(cookieValue);
    if (parsedCookie) {
        return parsedCookie;
    }

    const headerStore = await headers();
    const acceptLanguage = headerStore.get("accept-language");
    return detectLocaleFromAcceptLanguage(acceptLanguage);
}

export async function getServerDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
    const locale = await getServerLocale();
    return { locale, t: getDictionary(locale) };
}

