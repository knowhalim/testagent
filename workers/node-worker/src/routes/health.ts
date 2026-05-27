import type { FastifyInstance } from "fastify";

export function registerHealthRoutes(server: FastifyInstance) {
  server.get("/health", async (_request, _reply) => {
    // Probe that engine modules can be resolved
    const engines: string[] = [];

    try {
      await import("@midscene/web");
      engines.push("midscene");
    } catch {
      // Midscene not available — report but don't fail
    }

    try {
      await import("playwright");
      engines.push("playwright");
    } catch {
      // Playwright not available — report but don't fail
    }

    return {
      status: "ok",
      engines,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });
}
