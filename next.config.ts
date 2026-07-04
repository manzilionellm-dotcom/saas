import type { NextConfig } from "next";
import { securityHeaders } from "./security/server/security-headers";

const nextConfig: NextConfig = {
  // Stealth: never advertise the framework or leak source in production.
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  generateEtags: false,
  // Obfuscation: strip console noise from production bundles (keep errors).
  compiler: {
    removeConsole: { exclude: ["error"] },
  },
  // Baseline hardening + stealth headers on every route (isolated module).
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
