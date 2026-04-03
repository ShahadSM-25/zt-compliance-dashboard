import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { upsertUser } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // ── Local Dev Mode: seed mock admin user into DB (with retry) ────────────────
  if (!process.env.OAUTH_SERVER_URL) {
    const seedLocalDevUser = async (retries = 10, delayMs = 2000) => {
      for (let i = 0; i < retries; i++) {
        try {
          await upsertUser({
            openId: "local-dev-user",
            name: "Local Dev User",
            email: "dev@healthcomply.local",
            loginMethod: "local",
            role: "admin",
            lastSignedIn: new Date(),
          });
          console.log("[Auth] ✅ Local dev user seeded into database.");
          return;
        } catch (err: any) {
          if (i < retries - 1) {
            console.log(`[Auth] DB not ready yet, retrying in ${delayMs}ms... (attempt ${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            console.warn("[Auth] ⚠️  Could not seed local dev user after all retries:", err?.message);
          }
        }
      }
    };
    // Run seed in background so server starts immediately
    seedLocalDevUser().catch(console.error);
  }

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
