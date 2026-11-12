import { z } from "zod";

export const ThemeMode = {
    Light: "light",
    Dark: "dark",
} as const;

export const themeModeSchema = z.enum([
    ThemeMode.Light,
    ThemeMode.Dark,
]);

export type ThemeMode = z.infer<typeof themeModeSchema>;

export const THEME_STORAGE_KEY = "theme";

export function getInitialTheme(storedValue: unknown, systemPrefersDark: boolean): ThemeMode {
    const parsed = parseThemeMode(storedValue);
    if (parsed) return parsed;
    return systemPrefersDark ? ThemeMode.Dark : ThemeMode.Light;
}

export function parseThemeMode(value: unknown): ThemeMode | null {
    const parsed = themeModeSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}
