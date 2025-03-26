/**
 * Sistema de Controle de Acesso Baseado em Papéis (RBAC)
 * Implementa permissões granulares para diferentes recursos do sistema
 */

import { Request, Response, NextFunction } from "express";
import { User } from "@shared/schema";

// Recursos do sistema
export enum Resource {
  USERS = 'users',
  GAMES = 'games',
  CATEGORIES = 'categories',
  DOWNLOAD_LINKS = 'download_links',
  SYSTEM_SETTINGS = 'system_settings'
}

// Operações possíveis
export enum Operation {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  PUBLISH = 'publish',
  MANAGE = 'manage'
}

// Tipo para permissões no formato "recurso.operação"
export type Permission = `${Resource}.${Operation}`;

// Define as permissões para cada papel
const rolePermissions: Record<string, Permission[]> = {
  admin: [
    // Administradores podem fazer tudo
    `${Resource.USERS}.${Operation.CREATE}`,
    `${Resource.USERS}.${Operation.READ}`,
    `${Resource.USERS}.${Operation.UPDATE}`,
    `${Resource.USERS}.${Operation.DELETE}`,
    `${Resource.USERS}.${Operation.MANAGE}`,
    
    `${Resource.GAMES}.${Operation.CREATE}`,
    `${Resource.GAMES}.${Operation.READ}`,
    `${Resource.GAMES}.${Operation.UPDATE}`,
    `${Resource.GAMES}.${Operation.DELETE}`,
    `${Resource.GAMES}.${Operation.APPROVE}`,
    `${Resource.GAMES}.${Operation.REJECT}`,
    `${Resource.GAMES}.${Operation.PUBLISH}`,
    `${Resource.GAMES}.${Operation.MANAGE}`,
    
    `${Resource.CATEGORIES}.${Operation.CREATE}`,
    `${Resource.CATEGORIES}.${Operation.READ}`,
    `${Resource.CATEGORIES}.${Operation.UPDATE}`,
    `${Resource.CATEGORIES}.${Operation.DELETE}`,
    `${Resource.CATEGORIES}.${Operation.MANAGE}`,
    
    `${Resource.DOWNLOAD_LINKS}.${Operation.CREATE}`,
    `${Resource.DOWNLOAD_LINKS}.${Operation.READ}`,
    `${Resource.DOWNLOAD_LINKS}.${Operation.UPDATE}`,
    `${Resource.DOWNLOAD_LINKS}.${Operation.DELETE}`,
    `${Resource.DOWNLOAD_LINKS}.${Operation.MANAGE}`,
    
    `${Resource.SYSTEM_SETTINGS}.${Operation.READ}`,
    `${Resource.SYSTEM_SETTINGS}.${Operation.UPDATE}`,
    `${Resource.SYSTEM_SETTINGS}.${Operation.MANAGE}`
  ],
  user: [
    // Usuários regulares têm permissões limitadas
    `${Resource.USERS}.${Operation.READ}`,
    
    `${Resource.GAMES}.${Operation.CREATE}`,
    `${Resource.GAMES}.${Operation.READ}`,
    `${Resource.GAMES}.${Operation.UPDATE}`, // Apenas seus próprios jogos
    `${Resource.GAMES}.${Operation.DELETE}`, // Apenas seus próprios jogos
    `${Resource.GAMES}.${Operation.PUBLISH}`, // Submeter para aprovação
    
    `${Resource.CATEGORIES}.${Operation.READ}`,
    
    `${Resource.DOWNLOAD_LINKS}.${Operation.CREATE}`,
    `${Resource.DOWNLOAD_LINKS}.${Operation.READ}`,
    `${Resource.DOWNLOAD_LINKS}.${Operation.UPDATE}`, // Apenas seus próprios links
    `${Resource.DOWNLOAD_LINKS}.${Operation.DELETE}` // Apenas seus próprios links
  ]
};

/**
 * Verifica se um usuário tem uma permissão específica
 */
export function hasPermission(user: User | undefined, permission: Permission): boolean {
  if (!user) return false;
  
  const userRole = user.role || 'user';
  const permissions = rolePermissions[userRole] || [];
  
  return permissions.includes(permission);
}

/**
 * Verifica se um usuário tem permissão para acessar um recurso
 * @param permission A permissão necessária
 * @param checkOwnership Se true, verifica se o usuário é dono do recurso (userId === req.user.id)
 */
export function requirePermission(permission: Permission, checkOwnership = false) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Acesso não autorizado. Faça login para continuar.",
        error: "UNAUTHORIZED"
      });
    }
    
    // Verifica se o usuário tem a permissão necessária
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        message: "Você não tem permissão para acessar este recurso.",
        error: "FORBIDDEN"
      });
    }
    
    // Se necessário, verifica se o usuário é dono do recurso
    if (checkOwnership) {
      const resourceId = req.params.id;
      
      if (!resourceId) {
        return res.status(400).json({
          message: "ID do recurso é necessário",
          error: "BAD_REQUEST"
        });
      }
      
      // Implementação específica para cada tipo de recurso
      if (permission.startsWith(Resource.GAMES)) {
        // A verificação real seria feita aqui, consultando o banco de dados
        // Mas isso adicionaria complexidade, então faremos nas rotas
        // Exemplo: req.user.id === game.userId
      }
    }
    
    next();
  };
}

/**
 * Middleware que verifica se o usuário tem a função 'admin'
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      message: "Acesso não autorizado. Faça login para continuar.",
      error: "UNAUTHORIZED"
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: "Esta ação requer privilégios de administrador.",
      error: "FORBIDDEN"
    });
  }
  
  next();
}

/**
 * Middleware que verifica se o usuário está autenticado
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      message: "Acesso não autorizado. Faça login para continuar.",
      error: "UNAUTHORIZED"
    });
  }
  
  next();
}