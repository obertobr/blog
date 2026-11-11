import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get("blog_admin_session")?.value;

    const protectedPaths = ["/createPost", "/adminPanel"];
    const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (isProtected && !sessionToken) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/createPost/:path*", "/adminPanel/:path*"],
};

