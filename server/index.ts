import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import xssClean from "xss-clean";
import { validationResult } from "express-validator";
import cookieParser from "cookie-parser";
import { setupSecurityMiddleware } from "./security";

const app = express();
app.use(express.json({ limit: '1mb' })); // Limita o tamanho do payload JSON
app.use(express.urlencoded({ extended: false, limit: '1mb' })); // Limita o tamanho do payload de formulários
app.use(cookieParser());

// Configura todos os middlewares de segurança
setupSecurityMiddleware(app);

// Medidas de segurança contra XSS
app.use(xssClean());

// Middleware de tratamento de erros de validação para express-validator
app.use((req: Request, res: Response, next: NextFunction) => {
  // Somente verificar em rotas de API com métodos POST, PUT, PATCH
  if (req.path.startsWith('/api') && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Erro de validação', 
        errors: errors.array() 
      });
    }
  }
  next();
});

// Middleware para registrar auditoria de segurança
app.use((req, res, next) => {
  // Lista de endpoints sensíveis que requerem auditoria especial
  const sensitiveEndpoints = [
    '/api/proxy',
    '/api/auth',
    '/api/admin',
    '/api/users',
  ];
  
  // Verifica se a rota atual é sensível
  const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => 
    req.path.startsWith(endpoint)
  );
  
  // Registra operações sensíveis
  if (isSensitiveEndpoint) {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    console.log(`[SECURITY AUDIT] ${timestamp} - ${req.method} ${req.path} - IP: ${ip}`);
  }
  
  next();
});

// Middleware para registro de requisições e respostas
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
  const server = await registerRoutes(app);

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
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
