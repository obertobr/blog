import { describe, expect, it } from "vitest";
import { generateVisitorHash, parseVisitorHash } from "../app/_lib/visitor";

describe("visitor Domain Logic", () => {
    describe("generateVisitorHash", () => {
        it("generates a 64-character lowercase hexadecimal hash", () => {
            const hash = generateVisitorHash();
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it("generates distinct hashes on consecutive calls", () => {
            const first = generateVisitorHash();
            const second = generateVisitorHash();
            expect(first).not.toBe(second);
        });
    });

    describe("parseVisitorHash", () => {
        it("accepts valid 64-char hex hashes", () => {
            const validHash = "a".repeat(64);
            expect(parseVisitorHash(validHash)).toBe(validHash);
        });

        it("rejects invalid lengths, uppercase letters, non-hex chars, and non-strings", () => {
            expect(parseVisitorHash("a".repeat(63))).toBeNull();
            expect(parseVisitorHash("a".repeat(65))).toBeNull();
            expect(parseVisitorHash("A".repeat(64))).toBeNull();
            expect(parseVisitorHash("g".repeat(64))).toBeNull();
            expect(parseVisitorHash("")).toBeNull();
            expect(parseVisitorHash(null)).toBeNull();
            expect(parseVisitorHash(undefined)).toBeNull();
            expect(parseVisitorHash(12345)).toBeNull();
        });
    });
});

