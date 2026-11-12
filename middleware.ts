import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    generateVisitorHash,
    parseVisitorHash,
    VISITOR_COOKIE_MAX_AGE,
    VISITOR_COOKIE_NAME,
    VISITOR_HEADER_NAME,
} from "./app/_lib/visitor";

export function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get("blog_admin_session")?.value;

    const protectedPaths = ["/createPost", "/adminPanel"];
    const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (isProtected && !sessionToken) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    const existingVisitorHash = parseVisitorHash(request.cookies.get(VISITOR_COOKIE_NAME)?.value);
    const visitorHash = existingVisitorHash ?? generateVisitorHash();

    let response: NextResponse;
    if (!existingVisitorHash) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set(VISITOR_HEADER_NAME, visitorHash);
        response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } else {
        response = NextResponse.next();
    }

    response.cookies.set(VISITOR_COOKIE_NAME, visitorHash, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: VISITOR_COOKIE_MAX_AGE,
    });

    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|uploads/).*)"],
};
