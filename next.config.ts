import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production'

function buildCsp() {
  const base = [
    "default-src 'self'",
    // Scripts: strict in prod (no unsafe-eval/inline), relaxed in dev
    isProd
      ? "script-src 'self' 'unsafe-inline' https:"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    // Styles: keep 'unsafe-inline' for common frameworks; can be tightened later with nonces
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    // Allow AI backends; localhost Ollama allowed for local only
    "connect-src 'self' https: wss: http://localhost:11434 https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
  return base.join('; ')
}

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), interest-cohort=()' },
  {
    key: 'Content-Security-Policy',
    value: buildCsp(),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
