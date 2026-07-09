import express from "express";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    process.env.NODE_ENV = "production";
  }

  // Trust Cloud Run's reverse proxy for correct protocol, host, and port mapping
  app.set("trust proxy", true);

  // Prevent redirect for trailing dot in hostname
  app.use((req, res, next) => {
    if (req.path === '/.well-known/assetlinks.json') {
      return next();
    }
    next();
  });

  // VERY FIRST route/middleware
  app.get('/.well-known/assetlinks.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json([{
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.colorflow.zen.puzzle",
        "sha256_cert_fingerprints": [
          "7C:0F:4E:37:CD:1F:EB:43:DC:5B:82:58:4A:E1:86:F0:54:E8:5D:E1:FC:74:46:00:58:50:BE:C6:AD:71:E7:AD",
          "DF:AB:82:7C:3A:BE:D6:1B:7B:86:C8:70:DF:8F:AE:60:7A:DB:1D:E4:21:2D:9B:04:FD:39:22:B7:3B:BD:E5:08"
        ]
      }
    }]);
  });

  // Debugging middleware: intercept and log any server-side redirect attempts
  app.use((req, res, next) => {
    const originalRedirect = res.redirect;
    res.redirect = function(this: any, ...args: any[]) {
      console.warn(`[SERVER REDIRECT TRIGGERED] path=${req.path} host=${req.headers.host} redirect_args=`, args);
      return originalRedirect.apply(this, args);
    } as any;
    next();
  });

  // API Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Explicit Service Worker Route to guarantee correct MIME type (application/javascript)
  // This prevents the SPA wildcard route from serving index.html for sw.js requests.
  app.get("/sw.js", (req, res) => {
    const swPath = isProduction 
      ? path.join(process.cwd(), "dist", "sw.js")
      : path.join(process.cwd(), "public", "sw.js");
    
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(swPath, (err) => {
      if (err) {
        console.error("Failed to send sw.js:", err);
        res.status(404).send("Service Worker not found");
      }
    });
  });

  // Vite middleware for development vs Static files for production
  if (!isProduction) {
    // Serve static files from public directory first in development with dotfiles allowed
    app.use(express.static(path.join(process.cwd(), "public"), { dotfiles: "allow" }));
    
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static files with dotfiles explicitly allowed
    app.use(express.static(distPath, { dotfiles: "allow" }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} in ${isProduction ? "production" : "development"} mode`);
  });
}

startServer();
