import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const repositoryRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");

const nextConfig: NextConfig = {
  reactCompiler: true,

  // The agreement's wording is read from the repository's templates/ directory,
  // which sits above this package. The path is assembled at runtime, so file
  // tracing cannot infer it: name it here, or a standalone build ships without
  // the templates and fails at startup.
  outputFileTracingRoot: repositoryRoot,
  outputFileTracingIncludes: { "/": ["../templates/**/*.md"] },
};

export default nextConfig;
