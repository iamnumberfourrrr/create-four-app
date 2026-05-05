import { createMiddleware } from "@tanstack/react-start";

// Global server middleware — add cross-cutting concerns here (logging, auth guards, etc.)
// Phase 05 (auth installer) will augment this file.
export const logMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  return result;
});
