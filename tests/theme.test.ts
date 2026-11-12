import { describe, expect, it } from "vitest";
import {
    getInitialTheme,
    parseThemeMode,
    ThemeMode,
    themeModeSchema,
} from "../app/_lib/theme";

describe("Theme Domain Logic", () => {
    describe("getInitialTheme", () => {
        it("returns stored Dark preference regardless of system setting", () => {
            expect(getInitialTheme("dark", false)).toBe(ThemeMode.Dark);
            expect(getInitialTheme("dark", true)).toBe(ThemeMode.Dark);
        });

        it("returns stored Light preference regardless of system setting", () => {
            expect(getInitialTheme("light", false)).toBe(ThemeMode.Light);
            expect(getInitialTheme("light", true)).toBe(ThemeMode.Light);
        });

        it("falls back to system preference on first visit when no preference is stored", () => {
            expect(getInitialTheme(null, true)).toBe(ThemeMode.Dark);
            expect(getInitialTheme(null, false)).toBe(ThemeMode.Light);
            expect(getInitialTheme(undefined, true)).toBe(ThemeMode.Dark);
            expect(getInitialTheme(undefined, false)).toBe(ThemeMode.Light);
        });

        it("falls back to system preference if stored value is invalid", () => {
            expect(getInitialTheme("invalid-theme", true)).toBe(ThemeMode.Dark);
            expect(getInitialTheme("invalid-theme", false)).toBe(ThemeMode.Light);
            expect(getInitialTheme(123, true)).toBe(ThemeMode.Dark);
        });
    });

    describe("parseThemeMode", () => {
        it("validates and parses valid theme modes", () => {
            expect(parseThemeMode("light")).toBe(ThemeMode.Light);
            expect(parseThemeMode("dark")).toBe(ThemeMode.Dark);
        });

        it("returns null for invalid strings or non-string inputs", () => {
            expect(parseThemeMode("system")).toBeNull();
            expect(parseThemeMode("solarized")).toBeNull();
            expect(parseThemeMode("")).toBeNull();
            expect(parseThemeMode(123)).toBeNull();
            expect(parseThemeMode(null)).toBeNull();
            expect(parseThemeMode(undefined)).toBeNull();
            expect(parseThemeMode({})).toBeNull();
        });
    });

    describe("Zod schemas", () => {
        it("validates valid theme mode values via Zod schema", () => {
            expect(themeModeSchema.safeParse(ThemeMode.Light).success).toBe(true);
            expect(themeModeSchema.safeParse(ThemeMode.Dark).success).toBe(true);
            expect(themeModeSchema.safeParse("system").success).toBe(false);
            expect(themeModeSchema.safeParse("invalid").success).toBe(false);
        });
    });
});
