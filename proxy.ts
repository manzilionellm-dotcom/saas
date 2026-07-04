import type { NextRequest } from "next/server";
import { handleSecurity } from "@/security/server/proxy-handler";

// All request-time security logic lives in the isolated `security/` module.
export function proxy(request: NextRequest) {
  return handleSecurity(request);
}

export const config = {
  matcher: [
    // Run on every route except static assets, image optimization and the
    // favicon, while still covering navigations, API and RSC/data routes.
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
