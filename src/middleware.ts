import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Note: Next.js middleware runs before page rendering
const SESSION_COOKIE_NAME = "stratux_session";

// Paths that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
  "/invitacion",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static files, Next.js internal files, images, etc.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // If user is already authenticated and visits /login, redirect to /dashboard/negocio
  if (sessionCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard/negocio", request.url));
  }

  // If user is NOT authenticated and trying to access a protected page
  if (!sessionCookie && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and visits root "/", redirect to /dashboard/negocio
  if (sessionCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard/negocio", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
