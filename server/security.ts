/**
 * Módulo de segurança para aplicar as melhores práticas de segurança OWASP Top 10
 * Inclui proteções contra XSS, CSRF, SQL Injection, clickjacking, etc.
 */

import { Request, Response, NextFunction } from "express";
import { expressCspHeader, INLINE, SELF, EVAL } from 'express-csp-header';
import helmet from "helmet";
import hpp from "hpp";
import { rateLimit } from "express-rate-limit";
import { cryptoService } from "./crypto";

// Tokens CSRF ativos
const activeCsrfTokens = new Map<string, { expires: number, userId?: number }>();

// Limpa tokens CSRF expirados periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of activeCsrfTokens.entries()) {
    if (data.expires < now) {
      activeCsrfTokens.delete(token);
    }
  }
}, 60000); // Limpar a cada minuto

/**
 * Função para configurar todos os middlewares de segurança no Express
 */
export function setupSecurityMiddleware(app: any) {
  console.log('[SECURITY] Configurando middlewares de segurança');
  
  // Helmet para cabeçalhos HTTP de segurança
  app.use(helmet({
    contentSecurityPolicy: false, // Vamos definir CSP separadamente para mais controle
    xssFilter: true,
    hsts: {
      maxAge: 31536000, // 1 ano
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" } // Proteção contra clickjacking
  }));
  
  // Limitação de taxa para prevenir ataques de força bruta e DDoS
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 100, // limitar cada IP a 100 requisições por janela
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas requisições deste IP, por favor tente novamente após 15 minutos',
    skip: (request) => request.ip === '127.0.0.1' || request.ip === '::1' // Não limitar localhost
  });
  
  // Aplicar limitador para todas as rotas de API
  app.use('/api', apiLimiter);
  
  // Limitação mais restrita para rotas sensíveis (login, registro, etc.)
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    limit: 10, // 10 tentativas por hora
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas tentativas de autenticação, por favor tente novamente após 1 hora'
  });
  
  // Aplicar limitador para rotas de autenticação
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);
  app.use('/api/reset-password', authLimiter);
  
  // Proteção contra HTTP Parameter Pollution
  app.use(hpp());
  
  // Content Security Policy (CSP)
  // Configuração rigorosa para prevenir XSS
  const CSP_REPORT_URI = '/api/csp-report';
  app.use(expressCspHeader({
    directives: {
      'default-src': [SELF],
      'script-src': [SELF, INLINE, 'https://unpkg.com', 'https://cdn.jsdelivr.net'],
      'style-src': [SELF, INLINE, 'https://fonts.googleapis.com'],
      'img-src': [SELF, 'data:', 'https:'],
      'font-src': [SELF, 'https://fonts.gstatic.com'],
      'connect-src': [SELF],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': [SELF],
      'form-action': [SELF],
    },
    reportUri: CSP_REPORT_URI
  }));
  
  // Rota para relatórios de violação CSP
  app.post(CSP_REPORT_URI, (req: Request, res: Response) => {
    console.warn('[CSP] Violação reportada:', req.body);
    res.status(204).send();
  });
  
  // CSRF Protection
  // Para mitigar ataques Cross-Site Request Forgery
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Verificar CSRF apenas em métodos não seguros
    const isMethodSafe = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    
    // Verificar somente para rotas de API e métodos não seguros
    if (req.path.startsWith('/api') && !isMethodSafe) {
      // Obter token CSRF do cabeçalho OU do corpo da requisição
      const headerToken = req.headers['x-csrf-token'] as string;
      const bodyToken = req.body && req.body._csrf;
      const csrfToken = headerToken || bodyToken;
      
      // Definir rotas que não precisam de verificação CSRF
      const bypassRoutes = [
        '/api/login', 
        '/api/register', 
        '/api/forgot-password',
        '/api/reset-password'
      ];
      
      if (!bypassRoutes.includes(req.path) && (!csrfToken || !activeCsrfTokens.has(csrfToken))) {
        console.warn(`[CSRF FALHA] Rota: ${req.path}, Método: ${req.method}, Token: ${csrfToken || 'ausente'}`);
        return res.status(403).json({
          message: 'Token CSRF inválido ou ausente',
          error: 'CSRF_ERROR'
        });
      }
      
      // Se houver token válido, remova-o do corpo para não interferir nos dados reais
      if (req.body && req.body._csrf) {
        delete req.body._csrf;
      }
    }
    
    // Gerar novo token CSRF em cada resposta
    const token = cryptoService.generateSecureToken(16);
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
    
    // Armazenar token
    activeCsrfTokens.set(token, { 
      expires,
      userId: req.user?.id
    });
    
    // Incluir token no cabeçalho
    res.setHeader('X-CSRF-Token', token);
    
    // Definir cookie com o token CSRF para facilitar acesso no frontend
    res.cookie('csrf_token', token, { 
      httpOnly: false, // Precisa ser false para o JavaScript poder acessar
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });
    
    next();
  });

  // Sanitização de entradas para prevenção de SQL Injection e XSS
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      // Sanitizar corpo da requisição
      if (req.body) {
        sanitizeObject(req.body);
      }
    }
    
    // Sanitizar query params
    if (req.query) {
      sanitizeObject(req.query);
    }
    
    next();
  });
  
  // Registrar tentativas de ataque
  app.use((req: Request, res: Response, next: NextFunction) => {
    const suspiciousPatterns = [
      /(\b|')select(\b|')/i,
      /(\b|')insert(\b|')/i, 
      /(\b|')update(\b|')/i,
      /(\b|')delete(\b|')/i,
      /(\b|')drop(\b|')/i,
      /(\b|')union(\b|')/i,
      /<script\b[^>]*>/i,
      /javascript:/i,
      /onerror\s*=/i,
      /onload\s*=/i,
      /onclick\s*=/i
    ];
    
    // Verificar padrões suspeitos no corpo e nos parâmetros
    let suspiciousInput = false;
    let suspiciousPattern = '';
    
    // Checar no body
    if (req.body) {
      const bodyStr = JSON.stringify(req.body);
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(bodyStr)) {
          suspiciousInput = true;
          suspiciousPattern = pattern.toString();
          break;
        }
      }
    }
    
    // Checar na query
    if (!suspiciousInput && req.query) {
      const queryStr = JSON.stringify(req.query);
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(queryStr)) {
          suspiciousInput = true;
          suspiciousPattern = pattern.toString();
          break;
        }
      }
    }
    
    // Registrar tentativa suspeita
    if (suspiciousInput) {
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      console.warn(`[SECURITY WARNING] Possível tentativa de injeção detectada de ${ipAddress} em ${req.path}. Padrão: ${suspiciousPattern}`);
    }
    
    next();
  });
  
  console.log('[SECURITY] Middlewares de segurança configurados com sucesso');
}

/**
 * Sanitiza uma string para evitar XSS
 */
function sanitizeInput(input: string): string {
  if (!input) return input;
  
  // Escape de caracteres especiais HTML
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;');
}

/**
 * Sanitiza recursivamente todos os campos string de um objeto
 */
function sanitizeObject(obj: any): void {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        obj[key] = sanitizeInput(value);
      } else if (typeof value === 'object') {
        sanitizeObject(value);
      }
    }
  }
}