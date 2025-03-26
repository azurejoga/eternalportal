import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { cryptoService } from "./crypto";
import { passwordPolicy } from "./passwordPolicy";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      user?: SelectUser;
    }
  }
}

// Configurações para autenticação
// Permitir configuração do segredo via variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET || "eternal-legend-jwt-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // 7 dias

// Definir tipo para o payload do JWT
interface JwtPayload {
  id: number;
  username: string;
  email: string;
  role: string;
  bio?: string | null;
  createdAt?: Date | string;
  [key: string]: any;
}

export async function hashPassword(password: string) {
  return await cryptoService.hashPassword(password);
}

export async function comparePasswords(supplied: string, stored: string) {
  return await cryptoService.verifyPassword(supplied, stored);
}

// Função para gerar um token JWT
export function generateToken(user: SelectUser) {
  try {
    // Remover a senha do payload por segurança
    const { password, ...userWithoutPassword } = user;
    
    // Criar um payload tipado para o JWT
    const payload: JwtPayload = {
      id: userWithoutPassword.id,
      username: userWithoutPassword.username,
      email: userWithoutPassword.email,
      role: userWithoutPassword.role,
      bio: userWithoutPassword.bio,
      createdAt: userWithoutPassword.createdAt?.toString()
    };
    
    // Converter o tempo de expiração para número se necessário
    const expiresIn = typeof JWT_EXPIRES_IN === 'string' && /^\d+$/.test(JWT_EXPIRES_IN) 
      ? parseInt(JWT_EXPIRES_IN, 10)
      : JWT_EXPIRES_IN;
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  } catch (error) {
    console.error('Erro ao gerar token JWT:', error);
    throw new Error('Falha na geração do token de autenticação');
  }
}

// Middleware para verificar o token JWT
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Formato: Bearer TOKEN
    
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.sendStatus(403); // Token inválido
      }
      
      req.user = user as SelectUser;
      next();
    });
  } else {
    // Verifica se há um token no cookie
    const token = req.cookies?.token;
    
    if (token) {
      jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
          return res.sendStatus(403); // Token inválido
        }
        
        req.user = user as SelectUser;
        next();
      });
    } else {
      res.sendStatus(401); // Não autenticado
    }
  }
}

// Middleware opcional - verifica o token se presente, mas não requer autenticação
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (!err) {
        req.user = user as SelectUser;
      }
    });
  } else {
    // Verifica se há um token no cookie
    const token = req.cookies?.token;
    
    if (token) {
      jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (!err) {
          req.user = user as SelectUser;
        }
      });
    }
  }
  
  next();
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'eternal-legend-development-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: app.get("env") === "production",
      sameSite: "lax"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  
  // Migrar do sistema de ID para JWT, mantendo compatibilidade com Passport
  app.use(passport.initialize());

  passport.use(
    new LocalStrategy(async (usernameOrEmail, password, done) => {
      try {
        // Verifica se o usuário está tentando fazer login com email (se contém @)
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

  app.post("/api/register", async (req, res, next) => {
    try {
      // Verificar nome de usuário existente
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Nome de usuário já está em uso",
          error: "USERNAME_TAKEN" 
        });
      }

      // Verificar email existente
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ 
          message: "E-mail já está em uso",
          error: "EMAIL_TAKEN" 
        });
      }

      // Verificar força da senha
      const passwordCheck = passwordPolicy.validate(req.body.password);
      if (!passwordCheck.isValid) {
        return res.status(400).json({
          message: "A senha não atende aos requisitos de segurança",
          error: "WEAK_PASSWORD",
          details: passwordCheck.errors,
          strength: passwordPolicy.measureStrength(req.body.password),
          strengthLabel: passwordPolicy.getStrengthLabel(req.body.password)
        });
      }

      // Criar o usuário com senha forte
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        lastLogin: new Date(), // Definir a data de último login
        failedLoginAttempts: 0, // Inicializar contagem de tentativas falhas
      });

      // Gerar token JWT
      const token = generateToken(user);
      
      // Definir cookie seguro
      res.cookie('token', token, { 
        httpOnly: true, 
        secure: app.get("env") === "production",
        sameSite: 'lax',
        maxAge: 604800000 // 7 dias em milissegundos
      });
      
      // Limpar dados sensíveis
      const { password, ...userWithoutPassword } = user;
      
      // Retornar token e usuário (sem senha)
      res.status(201).json({
        user: userWithoutPassword,
        token
      });
    } catch (err) {
      console.error("Erro no registro:", err);
      next(err);
    }
  });

  // Constantes para proteção contra força bruta
  const MAX_LOGIN_ATTEMPTS = 5;
  const ACCOUNT_LOCK_TIME_MS = 30 * 60 * 1000; // 30 minutos
  const ACCOUNT_INACTIVE_DAYS = 90; // 90 dias

  app.post("/api/login", async (req, res, next) => {
    try {
      // Verificar se usuário existe (pelo username ou email)
      const identifier = req.body.username || ''; // Pode ser username ou email
      
      let user;
      if (identifier.includes('@')) {
        user = await storage.getUserByEmail(identifier);
      } else {
        user = await storage.getUserByUsername(identifier);
      }
      
      // Se o usuário não for encontrado
      if (!user) {
        return res.status(401).json({
          message: "Credenciais inválidas",
          error: "INVALID_CREDENTIALS"
        });
      }
      
      // Verificar status da conta
      if (user.accountStatus === 'locked') {
        // Verificar se o tempo de bloqueio já passou
        const lockExpireTime = new Date(user.lastLogin!.getTime() + ACCOUNT_LOCK_TIME_MS);
        
        if (new Date() < lockExpireTime) {
          // Conta ainda bloqueada
          const remainingTimeMs = lockExpireTime.getTime() - new Date().getTime();
          const remainingMinutes = Math.ceil(remainingTimeMs / (60 * 1000));
          
          return res.status(403).json({
            message: `Conta bloqueada devido a múltiplas tentativas de login falhas. Tente novamente em ${remainingMinutes} minutos.`,
            error: "ACCOUNT_LOCKED",
            remainingMinutes
          });
        } else {
          // Desbloquear conta se o tempo já passou
          await storage.updateUserAccountStatus(user.id, 'active');
          await storage.resetUserLoginAttempts(user.id);
          user.accountStatus = 'active';
          user.failedLoginAttempts = 0;
        }
      } else if (user.accountStatus === 'suspended') {
        return res.status(403).json({
          message: "Sua conta foi suspensa. Entre em contato com o administrador.",
          error: "ACCOUNT_SUSPENDED"
        });
      } else if (user.accountStatus === 'inactive') {
        return res.status(403).json({
          message: "Esta conta está inativa por falta de uso. Por favor, redefina sua senha para reativar.",
          error: "ACCOUNT_INACTIVE"
        });
      }
      
      // Verificar se a senha está correta
      const validPassword = await comparePasswords(req.body.password, user.password);
      
      if (!validPassword) {
        // Incrementar tentativas de login falhas
        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        await storage.incrementLoginAttempt(user.id);
        
        // Verificar se excedeu o número máximo de tentativas
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          await storage.updateUserAccountStatus(user.id, 'locked');
          await storage.updateUserLastLogin(user.id, new Date()); // Usar como referência para o bloqueio
          
          return res.status(403).json({
            message: `Conta bloqueada por ${ACCOUNT_LOCK_TIME_MS / (60 * 1000)} minutos devido a múltiplas tentativas de login falhas.`,
            error: "ACCOUNT_LOCKED",
            remainingMinutes: 30
          });
        }
        
        // Retornar erro de credenciais inválidas
        return res.status(401).json({
          message: "Credenciais inválidas",
          error: "INVALID_CREDENTIALS",
          remainingAttempts: MAX_LOGIN_ATTEMPTS - newAttempts
        });
      }
      
      // Login bem-sucedido: resetar tentativas de login e atualizar último acesso
      await storage.resetUserLoginAttempts(user.id);
      await storage.updateUserLastLogin(user.id, new Date());
      
      // Gerar token JWT
      const token = generateToken(user);
      
      // Definir cookie seguro
      res.cookie('token', token, { 
        httpOnly: true, 
        secure: app.get("env") === "production",
        sameSite: 'lax',
        maxAge: 604800000 // 7 dias em milissegundos
      });
      
      // Retornar token e usuário (sem senha)
      const { password, ...userWithoutPassword } = user;
      res.status(200).json({
        user: userWithoutPassword,
        token
      });
    } catch (err) {
      console.error("Erro no login:", err);
      next(err);
    }
  });

  app.post("/api/logout", (req, res) => {
    // Limpar o cookie
    res.clearCookie('token');
    res.sendStatus(200);
  });

  app.get("/api/user", optionalAuth, (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    // Não retornar a senha
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}
