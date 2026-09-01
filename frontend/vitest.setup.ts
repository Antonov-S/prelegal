import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only registers its own cleanup when Vitest's globals are
// enabled; this suite imports its helpers explicitly, so unmount here.
afterEach(cleanup);
