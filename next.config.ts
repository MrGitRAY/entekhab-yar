import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // React-PDF relies on Node font loading and must stay external in the
  // server bundle. Bundling it with the route causes a Vercel-only 500.
  serverExternalPackages: ["@react-pdf/renderer"],
  turbopack: { root: process.cwd() },
  devIndicators: false,
};

export default nextConfig;
