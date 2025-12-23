import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startEscrowReleaseScheduler } from "./jobs/escrow-release";
import { startCycleTimeoutScheduler } from "./jobs/cycle-timeout";
import { startCycleDetectionScheduler } from "./jobs/cycle-detection";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "localhost",
    },
    () => {
      log(`serving on port ${port}`);

      // Start the escrow release scheduler
      startEscrowReleaseScheduler();

      // Start the cycle timeout scheduler
      startCycleTimeoutScheduler();

      // Start the cycle detection scheduler
      startCycleDetectionScheduler();

      // Display ngrok instructions if in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🚀 Server Started Successfully');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('📌 To enable Paystack webhooks in development:');
        console.log('');
        console.log('1. Run ngrok in a separate terminal:');
        console.log('   ngrok http 5000');
        console.log('');
        console.log('2. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)');
        console.log('');
        console.log('3. Configure in Paystack Dashboard:');
        console.log('   - Callback URL: https://your-ngrok-url.ngrok.io/dashboard');
        console.log('   - Webhook URL: https://your-ngrok-url.ngrok.io/api/webhooks/paystack');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
      }
    },
  );
})();
