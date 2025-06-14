import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('🔄 Starting server setup...');
    const server = await registerRoutes(app);
    console.log('✅ Routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log('🔄 Setting up Vite...');
      try {
        await setupVite(app, server);
        console.log('✅ Vite setup completed');
      } catch (error) {
        console.error('❌ Vite setup failed:', error);
        // Continue without Vite for now - serve static files instead
        serveStatic(app);
      }
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    const host = "0.0.0.0";
    
    server.on('error', (error: any) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
    
    server.listen(port, host, () => {
      console.log(`✅ Server listening on ${host}:${port}`);
      log(`serving on port ${port}`);
      
      // Start Discord bot after server is listening
      (async () => {
        try {
          const { discordBot } = await import("./discord-bot");
          await discordBot.start();
          console.log('✅ Discord bot started successfully');
        } catch (error) {
          console.error('❌ Discord bot startup failed:', error);
          // Continue without Discord bot - web app still functional
        }
      })();
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
})();
