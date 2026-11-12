import { describe, expect, it } from "vitest";
import { formatFullDate, formatRelativeTime } from "../app/_lib/date";

describe("formatRelativeTime", () => {
    const baseNow = new Date("2026-11-12T12:00:00.000Z");

    it("returns 'agora mesmo' for times under 60 seconds", () => {
        const justNow = new Date("2026-11-12T11:59:40.000Z");
        expect(formatRelativeTime(justNow, "pt-BR", baseNow)).toBe("agora mesmo");
    });

    it("returns future dates as 'agora mesmo'", () => {
        const future = new Date("2026-11-12T12:05:00.000Z");
        expect(formatRelativeTime(future, "pt-BR", baseNow)).toBe("agora mesmo");
    });

    it("formats minutes correctly", () => {
        const fiveMinutesAgo = new Date("2026-11-12T11:55:00.000Z");
        expect(formatRelativeTime(fiveMinutesAgo, "pt-BR", baseNow)).toBe("há 5 minutos");
    });

    it("formats hours correctly", () => {
        const threeHoursAgo = new Date("2026-11-12T09:00:00.000Z");
        expect(formatRelativeTime(threeHoursAgo, "pt-BR", baseNow)).toBe("há 3 horas");
    });

    it("formats days correctly", () => {
        const fourDaysAgo = new Date("2026-11-08T12:00:00.000Z");
        expect(formatRelativeTime(fourDaysAgo, "pt-BR", baseNow)).toBe("há 4 dias");
    });

    it("formats weeks correctly", () => {
        const twoWeeksAgo = new Date("2026-10-29T12:00:00.000Z");
        expect(formatRelativeTime(twoWeeksAgo, "pt-BR", baseNow)).toBe("há 2 semanas");
    });

    it("formats months correctly", () => {
        const twoMonthsAgo = new Date("2026-09-12T12:00:00.000Z");
        expect(formatRelativeTime(twoMonthsAgo, "pt-BR", baseNow)).toBe("há 2 meses");
    });

    it("formats years correctly when exact", () => {
        const oneYearAgo = new Date("2025-11-12T12:00:00.000Z");
        expect(formatRelativeTime(oneYearAgo, "pt-BR", baseNow)).toBe("há 1 ano");

        const twoYearsAgo = new Date("2024-11-12T12:00:00.000Z");
        expect(formatRelativeTime(twoYearsAgo, "pt-BR", baseNow)).toBe("há 2 anos");
    });

    it("formats composite year and month correctly", () => {
        const oneYearOneMonthAgo = new Date("2025-10-12T12:00:00.000Z");
        expect(formatRelativeTime(oneYearOneMonthAgo, "pt-BR", baseNow)).toBe("há 1 ano e 1 mês");

        const oneYearThreeMonthsAgo = new Date("2025-08-12T12:00:00.000Z");
        expect(formatRelativeTime(oneYearThreeMonthsAgo, "pt-BR", baseNow)).toBe("há 1 ano e 3 meses");

        const twoYearsFourMonthsAgo = new Date("2024-07-12T12:00:00.000Z");
        expect(formatRelativeTime(twoYearsFourMonthsAgo, "pt-BR", baseNow)).toBe("há 2 anos e 4 meses");
    });

    it("formats relative dates properly in English", () => {
        const justNow = new Date("2026-11-12T11:59:40.000Z");
        expect(formatRelativeTime(justNow, "en", baseNow)).toBe("just now");

        const fiveMinutesAgo = new Date("2026-11-12T11:55:00.000Z");
        expect(formatRelativeTime(fiveMinutesAgo, "en", baseNow)).toBe("5 minutes ago");

        const oneYearAgo = new Date("2025-11-12T12:00:00.000Z");
        expect(formatRelativeTime(oneYearAgo, "en", baseNow)).toBe("1 year ago");

        const oneYearThreeMonthsAgo = new Date("2025-08-12T12:00:00.000Z");
        expect(formatRelativeTime(oneYearThreeMonthsAgo, "en", baseNow)).toBe("1 year and 3 months ago");
    });
});

describe("formatFullDate", () => {
    it("formats date with complete month and time", () => {
        const date = new Date("2026-11-12T14:30:00.000Z");
        const formatted = formatFullDate(date, "pt-BR");

        expect(formatted).toContain("2026");
        expect(formatted).toMatch(/novembro/i);
    });
});

