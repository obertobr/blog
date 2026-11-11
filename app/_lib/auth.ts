import { createHash } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "blog_admin_session";

export function hashPassword(password: string): string {
    return createHash("sha256").update(password.trim()).digest("hex");
}

export function getAdminPasswordHash(): string {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
        throw new Error("ADMIN_PASSWORD_HASH is not set in environment variables (.env). Run 'npm run set-password' to configure it.");
    }
    return hash;
}

export function isValidPassword(password: string): boolean {
    const storedHash = getAdminPasswordHash();
    return hashPassword(password) === storedHash;
}

export async function isAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const storedHash = getAdminPasswordHash();
    return token === storedHash;
}

export async function setAdminSession() {
    const storedHash = getAdminPasswordHash();

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, storedHash, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
    });
}

export async function clearAdminSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}
