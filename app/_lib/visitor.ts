import { z } from "zod";

export const VISITOR_COOKIE_NAME = "blog_visitor_id";
export const VISITOR_HEADER_NAME = "x-blog-visitor-hash";
export const VISITOR_STORAGE_KEY = "blog_visitor_hash";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export const visitorHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export type VisitorHash = z.infer<typeof visitorHashSchema>;

export function parseVisitorHash(value: unknown): VisitorHash | null {
    const parsed = visitorHashSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

export function generateVisitorHash(): VisitorHash {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
