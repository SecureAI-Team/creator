import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Protected dashboard routes
  const protectedPaths = [
    "/overview",
    "/platforms",
    "/content",
    "/media",
    "/data",
    "/comments",
    "/trends",
    "/tools",
    "/chat",
    "/tasks",
    "/team",
    "/settings",
    "/vnc",
  ];

  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ["/login", "/register"];
  if (authPaths.includes(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL("/overview", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/overview/:path*",
    "/platforms/:path*",
    "/content/:path*",
    "/media/:path*",
    "/data/:path*",
    "/comments/:path*",
    "/trends/:path*",
    "/tools/:path*",
    "/chat/:path*",
    "/tasks/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/vnc/:path*",
    "/login",
    "/register",
  ],
};
