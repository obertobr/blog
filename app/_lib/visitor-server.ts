import { cookies, headers } from "next/headers";
import {
    generateVisitorHash,
    parseVisitorHash,
    VISITOR_COOKIE_MAX_AGE,
    VISITOR_COOKIE_NAME,
    VISITOR_HEADER_NAME,
    VisitorHash,
} from "./visitor";

async function setVisitorCookie(hash: VisitorHash): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(VISITOR_COOKIE_NAME, hash, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: VISITOR_COOKIE_MAX_AGE,
    });
}

export async function getVisitorHash(): Promise<VisitorHash | null> {
    const cookieStore = await cookies();
    const fromCookie = parseVisitorHash(cookieStore.get(VISITOR_COOKIE_NAME)?.value);
    if (fromCookie) {
        return fromCookie;
    }

    const headersList = await headers();
    return parseVisitorHash(headersList.get(VISITOR_HEADER_NAME));
}

export async function getOrCreateVisitorHashForAction(): Promise<VisitorHash> {
    const existing = await getVisitorHash();
    if (existing) {
        return existing;
    }

    const newHash = generateVisitorHash();
    await setVisitorCookie(newHash);
    return newHash;
}

export async function restoreVisitorHashCookie(hash: VisitorHash): Promise<void> {
    await setVisitorCookie(hash);
}
