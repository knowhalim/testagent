import type { FastifyInstance } from "fastify";
import type { RunRequest, RunResponse, EngineConfig } from "../types.js";
import { runPlaywrightAudit } from "../engines/playwright-runner.js";

const runRequestSchema = {
  type: "object" as const,
  required: ["url", "instructions", "llm_provider", "llm_model"],
  properties: {
    url: { type: "string" as const },
    instructions: { type: "string" as const },
    llm_provider: { type: "string" as const },
    llm_api_key: { type: "string" as const },
    llm_model: { type: "string" as const },
    llm_base_url: { type: "string" as const },
    screenshot_dir: { type: "string" as const },
  },
};

export function registerPlaywrightRoutes(server: FastifyInstance) {
  server.post<{ Body: RunRequest }>(
    "/playwright/run",
    {
      schema: {
        body: runRequestSchema,
      },
    },
    async (request, reply) => {
      const body = request.body;
      server.log.info({ url: body.url }, "Starting Playwright UX audit");

      const config: EngineConfig = {
        url: body.url,
        instructions: body.instructions,
        llmProvider: body.llm_provider,
        llmApiKey: body.llm_api_key,
        llmModel: body.llm_model,
        llmBaseUrl: body.llm_base_url,
        screenshotDir: body.screenshot_dir || "/tmp/testagent-screenshots",
      };

      try {
        const result: RunResponse = await runPlaywrightAudit(config);
        server.log.info(
          {
            url: body.url,
            steps: result.steps.length,
            duration_ms: result.total_duration_ms,
          },
          "Playwright UX audit completed"
        );
        return result;
      } catch (err) {
        server.log.error(err, "Playwright UX audit failed");
        reply.status(500).send({
          error:
            err instanceof Error ? err.message : "Playwright UX audit failed",
          code: "PLAYWRIGHT_ERROR",
        });
      }
    }
  );
}
