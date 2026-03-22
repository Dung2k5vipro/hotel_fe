import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_ISSUED_AT_COOKIE_NAME,
  normalizeAuthTokenValue,
  normalizeIssuedAtValue,
} from "@/lib/auth-constants";

const SERVER_BOOT_AT = Date.now();

export function middleware(request: NextRequest) {
  const rawToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const rawIssuedAt = request.cookies.get(AUTH_SESSION_ISSUED_AT_COOKIE_NAME)?.value;
  const token = normalizeAuthTokenValue(rawToken);
  const issuedAt = normalizeIssuedAtValue(rawIssuedAt);
  const isSessionValidForCurrentRun = Boolean(
    token && issuedAt && issuedAt >= SERVER_BOOT_AT,
  );
  const hasStaleOrInvalidSession = Boolean(rawToken || rawIssuedAt) && !isSessionValidForCurrentRun;
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isDashboardRoute && !isSessionValidForCurrentRun) {
    const response = NextResponse.redirect(new URL("/login", request.url));

    if (hasStaleOrInvalidSession) {
      response.cookies.set(AUTH_COOKIE_NAME, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      });
      response.cookies.set(AUTH_SESSION_ISSUED_AT_COOKIE_NAME, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      });
    }

    return response;
  }

  if (isLoginPage && isSessionValidForCurrentRun) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isLoginPage && hasStaleOrInvalidSession) {
    const response = NextResponse.next();

    response.cookies.set(AUTH_COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    response.cookies.set(AUTH_SESSION_ISSUED_AT_COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard", "/dashboard/:path*"],
};
