import "dotenv/config";
import Fastify from "fastify";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMidsceneRoutes } from "./routes/midscene.js";
import { registerPlaywrightRoutes } from "./routes/playwright.js";

const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss Z" } }
          : undefined,
    },
    // Allow large request bodies for screenshots / long instructions
    bodyLimit: 10 * 1024 * 1024, // 10 MB
  });

  // Global error handler
  server.setErrorHandler((error, _request, reply) => {
    server.log.error(error);
    reply.status(error.statusCode ?? 500).send({
      error: error.message,
      code: error.code ?? "INTERNAL_ERROR",
    });
  });

  // Register route modules
  registerHealthRoutes(server);
  registerMidsceneRoutes(server);
  registerPlaywrightRoutes(server);

  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Node worker listening on ${HOST}:${PORT}`);
    server.log.info(`Engines available: midscene, playwright`);
  } catch (err) {
    server.log.fatal(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down gracefully...`);
    await server.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
