import { describe, expect, it } from "vitest";
import {
    detectLocaleFromAcceptLanguage,
    getDictionary,
    Locale,
    localeSchema,
    parseLocale,
    selectPluralForm,
} from "../app/_lib/i18n";

describe("i18n Domain Logic", () => {
    describe("parseLocale", () => {
        it("validates and parses supported locales", () => {
            expect(parseLocale("pt-BR")).toBe(Locale.PtBr);
            expect(parseLocale("en")).toBe(Locale.En);
        });

        it("returns null for unsupported or invalid values", () => {
            expect(parseLocale("es")).toBeNull();
            expect(parseLocale("pt")).toBeNull();
            expect(parseLocale("")).toBeNull();
            expect(parseLocale(null)).toBeNull();
            expect(parseLocale(undefined)).toBeNull();
            expect(parseLocale(42)).toBeNull();
        });
    });

    describe("detectLocaleFromAcceptLanguage", () => {
        it("returns English when header starts with en", () => {
            expect(detectLocaleFromAcceptLanguage("en-US,en;q=0.9,pt-BR;q=0.8")).toBe(Locale.En);
            expect(detectLocaleFromAcceptLanguage("en")).toBe(Locale.En);
            expect(detectLocaleFromAcceptLanguage("EN-GB")).toBe(Locale.En);
        });

        it("returns Portuguese as default for pt-BR or other languages", () => {
            expect(detectLocaleFromAcceptLanguage("pt-BR,pt;q=0.9,en-US;q=0.8")).toBe(Locale.PtBr);
            expect(detectLocaleFromAcceptLanguage("es-ES,es;q=0.9")).toBe(Locale.PtBr);
            expect(detectLocaleFromAcceptLanguage(null)).toBe(Locale.PtBr);
            expect(detectLocaleFromAcceptLanguage(undefined)).toBe(Locale.PtBr);
            expect(detectLocaleFromAcceptLanguage("")).toBe(Locale.PtBr);
        });
    });

    describe("getDictionary", () => {
        it("returns complete dictionaries for both locales", () => {
            const pt = getDictionary(Locale.PtBr);
            const en = getDictionary(Locale.En);

            expect(pt.nav.recent).toBe("Recentes");
            expect(en.nav.recent).toBe("Recent");
            expect(pt.theme.dark).toBe("Escuro");
            expect(en.theme.dark).toBe("Dark");
            expect(pt.relativeDate.justNow).toBe("agora mesmo");
            expect(en.relativeDate.justNow).toBe("just now");

            expect(Object.keys(pt)).toEqual(Object.keys(en));
            for (const section of Object.keys(pt) as (keyof typeof pt)[]) {
                expect(Object.keys(pt[section])).toEqual(Object.keys(en[section]));
            }
        });
    });

    describe("localeSchema", () => {
        it("validates Locale constants", () => {
            expect(localeSchema.safeParse(Locale.PtBr).success).toBe(true);
            expect(localeSchema.safeParse(Locale.En).success).toBe(true);
            expect(localeSchema.safeParse("fr").success).toBe(false);
        });
    });

    describe("selectPluralForm", () => {
        it("returns singular only for count 1 and plural for 0 or multiple", () => {
            const pt = getDictionary(Locale.PtBr);
            const en = getDictionary(Locale.En);

            expect(selectPluralForm(0, pt.comments.countSingular, pt.comments.countPlural)).toBe("Comentários");
            expect(selectPluralForm(1, pt.comments.countSingular, pt.comments.countPlural)).toBe("Comentário");
            expect(selectPluralForm(2, pt.comments.countSingular, pt.comments.countPlural)).toBe("Comentários");

            expect(selectPluralForm(0, en.comments.countSingular, en.comments.countPlural)).toBe("Comments");
            expect(selectPluralForm(1, en.comments.countSingular, en.comments.countPlural)).toBe("Comment");
            expect(selectPluralForm(5, en.comments.countSingular, en.comments.countPlural)).toBe("Comments");
        });
    });
});

