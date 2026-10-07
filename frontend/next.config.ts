import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Built to static files in out/ and served by the FastAPI backend. The
  // agreement's wording is read from ../templates/ at build time, so the
  // exported pages need nothing from disk at runtime.
  output: "export",
  // Emits nda/index.html rather than nda.html, which is the layout the
  // backend's static file server resolves for /nda/.
  trailingSlash: true,

  // In production FastAPI serves both the pages and /api from one origin. Under
  // `next dev` the API runs separately, so proxy to it. (A static export cannot
  // carry rewrites, hence development only.)
  ...(process.env.NODE_ENV === "development" && {
    rewrites: async () => [
      { source: "/api/:path*", destination: "http://localhost:8000/api/:path*" },
    ],
  }),
};

export default nextConfig;
