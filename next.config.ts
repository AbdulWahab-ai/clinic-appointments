import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  typedRoutes: false,
  serverExternalPackages: ["pino", "pino-pretty", "bullmq", "ioredis", "pg"],
  async headers() {
    return [
      {
        source: "/((?!embed/).*)",
        headers: [...securityHeaders, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      // The booking widget is meant to be framed by clinic websites.
      {
        source: "/embed/:path*",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
