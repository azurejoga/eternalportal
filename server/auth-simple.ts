import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { cryptoService } from "./crypto";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      user?: SelectUser;
    }
  }
}

const scryptAsync = promisify(scrypt);

// Funções para hash e verificação de senhas usando Argon2id
export async function hashPassword(password: string) {
  return await cryptoService.hashPassword(password);
}

export async function comparePasswords(supplied: string, stored: string) {
  return await cryptoService.verifyPassword(supplied, stored);
}

// Middleware para verificar autenticação - Versão Session Based
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.user) {
    next();
  } else {
    res.status(401).json({ message: "Não autenticado" });
  }
}

// Middleware para verificar se o usuário é admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Acesso negado: privilégios insuficientes" });
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'eternal-legend-development-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 semana
      httpOnly: true,
      secure: app.get("env") === "production",
      sameSite: "lax"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (usernameOrEmail, password, done) => {
      try {
        // Verifica se o usuário está tentando fazer login com email
        let user;
        if (usernameOrEmail.includes('@')) {
          user = await storage.getUserByEmail(usernameOrEmail);
        } else {
          user = await storage.getUserByUsername(usernameOrEmail);
        }
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validar requisição e verificar se usuário já existe
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Nome de usuário já está em uso");
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).send("E-mail já está em uso");
      }

      // Validar política de senhas fortes
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(req.body.password)) {
        return res.status(400).send("A senha deve ter no mínimo 8 caracteres, incluir letras maiúsculas, minúsculas, números e caracteres especiais");
      }

      // Criar o usuário com senha hash
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Autenticar o usuário automaticamente após registro
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remover a senha do objeto de resposta
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  // Map para controlar as tentativas de login por IP
  const loginAttempts = new Map<string, { count: number; lastAttempt: number; locked: boolean }>();
  
  // Middleware para proteção contra força bruta
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 30 * 60 * 1000; // 30 minutos
  
  function checkBruteForce(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const now = Date.now();
    
    // Verificar se o IP está no map
    if (!loginAttempts.has(ip)) {
      loginAttempts.set(ip, { count: 0, lastAttempt: now, locked: false });
    }
    
    const attempt = loginAttempts.get(ip)!;
    
    // Verificar se a conta está bloqueada
    if (attempt.locked) {
      const timeElapsed = now - attempt.lastAttempt;
      if (timeElapsed < LOCK_TIME) {
        // Conta ainda bloqueada
        const remainingTime = Math.ceil((LOCK_TIME - timeElapsed) / 60000);
        return res.status(429).json({
          message: `Conta temporariamente bloqueada devido a múltiplas tentativas de login. Tente novamente em ${remainingTime} minutos.`,
          error: 'ACCOUNT_LOCKED' 
        });
      } else {
        // Desbloquear conta após o tempo de bloqueio
        attempt.locked = false;
        attempt.count = 0;
      }
    }
    
    // Atualizar a última tentativa
    attempt.lastAttempt = now;
    loginAttempts.set(ip, attempt);
    
    next();
  }

  app.post("/api/login", checkBruteForce, (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const attempt = loginAttempts.get(ip)!;
    
    passport.authenticate("local", (err: any, user: SelectUser | false) => {
      if (err) return next(err);
      
      if (!user) {
        // Incrementar contador de tentativas
        attempt.count += 1;
        
        // Verificar se atingiu o limite de tentativas
        if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
          attempt.locked = true;
          loginAttempts.set(ip, attempt);
          
          return res.status(429).json({
            message: `Conta temporariamente bloqueada devido a múltiplas tentativas de login. Tente novamente em 30 minutos.`,
            error: 'ACCOUNT_LOCKED'
          });
        }
        
        loginAttempts.set(ip, attempt);
        return res.status(401).send("Credenciais inválidas");
      }
      
      // Login bem-sucedido, resetar o contador
      attempt.count = 0;
      loginAttempts.set(ip, attempt);
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Remover a senha do objeto de resposta
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    // Não retornar a senha
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}