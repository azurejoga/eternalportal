import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth-simple";
import { emailService } from "./email";
import { setupProxyRoutes } from "./proxy";
import { z } from "zod";
import { insertGameSchema, insertDownloadLinkSchema, insertCategorySchema } from "@shared/schema";
import { requirePermission, requireAuth, Resource, Operation } from "./rbac";
import { randomBytes } from "crypto";
import { hashPassword, comparePasswords } from "./auth";

// Mapa para controlar limite de taxa de solicitações de redefinição de senha
const rateLimitMap = new Map<string, number[]>();

// Limpar o mapa de limitação de taxa periodicamente (uma vez por dia)
setInterval(() => {
  rateLimitMap.clear();
  console.log("[SEGURANÇA] Mapa de limitação de taxa para redefinição de senha limpo");
}, 86400000); // 24 horas

// Removed middleware redefinitions - using imports from auth-simple.ts

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Setup proxy routes for secure server-side requests
  setupProxyRoutes(app);

  // Categories API
  app.get("/api/categories", async (req, res) => {
    try {
      // Consultar o banco para obter categorias com contagem diretamente do banco de dados
      const categories = await storage.getCategories();
      
      // Removida contagem de jogos como solicitado pelo usuário
      // Ordenar categorias por nome em ordem alfabética
      categories.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      
      res.json(categories);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  app.post("/api/categories", requirePermission(`${Resource.CATEGORIES}.${Operation.CREATE}`), async (req, res) => {
    try {
      // Validate the request body
      const validatedData = insertCategorySchema.parse(req.body);
      
      // Check if a category with the same slug already exists
      const existingCategory = await storage.getCategoryBySlug(validatedData.slug);
      if (existingCategory) {
        return res.status(400).json({ 
          message: "Uma categoria com este slug já existe" 
        });
      }
      
      // Create the new category
      const newCategory = await storage.createCategory(validatedData);
      
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Erro de validação", 
          errors: error.errors 
        });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/categories/:id", requirePermission(`${Resource.CATEGORIES}.${Operation.DELETE}`), async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "ID de categoria inválido" });
      }
      
      // Check if the category exists
      const category = await storage.getCategoryById(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      
      // Check if there are games using this category
      const gamesWithCategory = await storage.getGames({ categoryId });
      if (gamesWithCategory.length > 0) {
        return res.status(400).json({ 
          message: "Não é possível excluir uma categoria que está sendo usada por jogos" 
        });
      }
      
      // Delete the category
      const success = await storage.deleteCategory(categoryId);
      if (!success) {
        return res.status(500).json({ message: "Erro ao excluir categoria" });
      }
      
      res.status(200).json({ message: "Categoria excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Games API
  app.get("/api/games", async (req, res) => {
    try {
      const { status, userId, categoryId, limit, offset, sortBy, language, platform } = req.query;
      
      const options: any = {
        status: status as string || "approved",
      };
      
      if (userId) options.userId = Number(userId);
      if (categoryId) options.categoryId = Number(categoryId);
      if (limit) options.limit = Number(limit);
      if (offset) options.offset = Number(offset);
      if (sortBy) options.sortBy = sortBy as string;
      if (language) options.language = language as string;
      if (platform) options.platform = platform as string;
      
      const games = await storage.getGames(options);
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/games/latest", async (req, res) => {
    try {
      const latestGames = await storage.getGames({
        status: "approved",
        limit: 5,
        offset: 0,
        sortBy: "newest",
      });
      res.json(latestGames);
    } catch (error) {
      console.error("Error fetching latest games:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "ID de jogo inválido" });
      }
      
      const game = await storage.getGameById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Jogo não encontrado" });
      }
      
      // Only return games that are approved or owned by the user, or if user is admin
      if (
        game.status === "approved" || 
        (req.user && (req.user.id === game.userId || req.user.role === "admin"))
      ) {
        return res.json(game);
      }
      
      res.status(403).json({ message: "Você não tem permissão para visualizar este jogo" });
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/games", requirePermission(`${Resource.GAMES}.${Operation.CREATE}`), async (req, res) => {
    try {
      const { languages, ...restData } = req.body;
      const validatedData = insertGameSchema.parse(restData);
      
      // Processar idiomas adicionais
      const additionalLanguages = Array.isArray(languages) ? languages.join(',') : '';
      
      const game = await storage.createGame({
        ...validatedData,
        additionalLanguages,
        userId: req.user!.id,
      });
      
      // Notify admins about new game submission
      try {
        const admins = await storage.getUsersByRole("admin");
        const adminEmails = admins.map(admin => admin.email);
        
        if (adminEmails.length > 0) {
          await emailService.sendGameSubmissionNotification(
            game,
            req.user!,
            adminEmails
          );
        }
      } catch (emailError) {
        console.error("Erro ao enviar e-mail de notificação para administradores:", emailError);
        // Continuamos com a criação do jogo mesmo se o e-mail falhar
      }
      
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Erro de validação", errors: error.errors });
      }
      console.error("Erro ao criar jogo:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/games/:id/download-links", requirePermission(`${Resource.DOWNLOAD_LINKS}.${Operation.CREATE}`, true), async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      
      const game = await storage.getGameById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Only allow the game owner or an admin to add download links
      if (req.user!.id !== game.userId && req.user!.role !== "admin") {
        return res.status(403).json({ message: "You don't have permission to add download links to this game" });
      }
      
      const validatedData = insertDownloadLinkSchema.parse({
        ...req.body,
        gameId,
      });
      
      const downloadLink = await storage.createDownloadLink(validatedData);
      res.status(201).json(downloadLink);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating download link:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin APIs
  app.get("/api/admin/pending-games", requirePermission(`${Resource.GAMES}.${Operation.APPROVE}`), async (req, res) => {
    try {
      const pendingGames = await storage.getGames({ status: "pending" });
      res.json(pendingGames);
    } catch (error) {
      console.error("Error fetching pending games:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/games/:id/approve", requirePermission(`${Resource.GAMES}.${Operation.APPROVE}`), async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "ID de jogo inválido" });
      }
      
      const game = await storage.getGameById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Jogo não encontrado" });
      }
      
      const updatedGame = await storage.updateGameStatus(gameId, "approved");
      
      // Notify user about the approval
      try {
        const user = await storage.getUser(game.userId);
        if (user) {
          await emailService.sendGameApprovalNotification(game, user);
        }
      } catch (emailError) {
        console.error("Erro ao enviar e-mail de aprovação:", emailError);
        // Continuamos com a aprovação mesmo se o e-mail falhar
      }
      
      // Log para verificar quando um jogo é aprovado
      console.log(`E-mail enviado: Jogo ${game.title} (ID: ${game.id}) foi aprovado.`);
      
      res.json(updatedGame);
    } catch (error) {
      console.error("Erro ao aprovar jogo:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Rota para excluir jogos (apenas administradores)
  app.delete("/api/admin/games/:id", requirePermission(`${Resource.GAMES}.${Operation.DELETE}`), async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "ID de jogo inválido" });
      }
      
      const game = await storage.getGameById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Jogo não encontrado" });
      }
      
      const result = await storage.deleteGame(gameId);
      if (!result) {
        return res.status(500).json({ message: "Erro ao excluir o jogo" });
      }
      
      res.status(200).json({ message: "Jogo excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir jogo:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch("/api/admin/games/:id/reject", requirePermission(`${Resource.GAMES}.${Operation.REJECT}`), async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "ID de jogo inválido" });
      }
      
      const { reason } = req.body;
      if (!reason || typeof reason !== "string") {
        return res.status(400).json({ message: "Motivo da rejeição é obrigatório" });
      }
      
      const game = await storage.getGameById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Jogo não encontrado" });
      }
      
      const updatedGame = await storage.updateGameStatus(gameId, "rejected");
      
      // Notify user about the rejection
      try {
        const user = await storage.getUser(game.userId);
        if (user) {
          await emailService.sendGameRejectionNotification(game, user, reason);
        }
      } catch (emailError) {
        console.error("Erro ao enviar e-mail de rejeição:", emailError);
        // Continuamos com a rejeição mesmo se o e-mail falhar
      }
      
      res.json(updatedGame);
    } catch (error) {
      console.error("Erro ao rejeitar jogo:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Get all users (Admin only)
  app.get("/api/admin/users", requirePermission(`${Resource.USERS}.${Operation.READ}`), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove sensitive information
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });
  
  // Promote user to admin (Admin only)
  app.patch("/api/admin/users/:id/promote", requirePermission(`${Resource.USERS}.${Operation.MANAGE}`), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      const user = await storage.promoteUserToAdmin(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Remove sensitive information
      const { password, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error("Error promoting user:", error);
      res.status(500).json({ message: "Erro ao promover usuário" });
    }
  });

  // User profile API
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send sensitive information
      const { password, ...userProfile } = user;
      
      // Get user's games
      const userGames = await storage.getGames({
        userId,
        status: "approved",
      });
      
      res.json({
        ...userProfile,
        games: userGames,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/profile", requirePermission(`${Resource.USERS}.${Operation.UPDATE}`), async (req, res) => {
    try {
      const { bio } = req.body;
      if (typeof bio !== "string") {
        return res.status(400).json({ message: "Bio must be a string" });
      }
      
      const updatedUser = await storage.updateUserBio(req.user!.id, bio);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userProfile } = updatedUser;
      res.json(userProfile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota para solicitar redefinição de senha
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const origin = req.get('Origin') || req.get('Referer');
      
      // Verificar se a solicitação veio do frontend da aplicação
      const validOrigin = process.env.NODE_ENV === 'production' ? 
        process.env.APP_URL : 
        /^https?:\/\/localhost|127\.0\.0\.1|replit\.dev/;
      
      if (!origin || (typeof validOrigin === 'string' ? origin !== validOrigin : !validOrigin.test(origin))) {
        console.error('Tentativa de redefinição de senha a partir de origem não autorizada:', origin);
        return res.status(403).json({ message: "Origem não autorizada" });
      }
      
      // Limitar solicitações por IP para evitar ataques de força bruta
      const clientIp = req.ip || req.socket.remoteAddress || '0.0.0.0';
      const now = Date.now();
      const recentAttempts = rateLimitMap.get(clientIp) || [];
      
      // Limpar tentativas antigas (mais de 1 hora)
      const recentValidAttempts = recentAttempts.filter(time => now - time < 3600000);
      
      // Verificar se excedeu o limite (máximo 3 tentativas por hora)
      if (recentValidAttempts.length >= 3) {
        console.warn(`Muitas tentativas de redefinição de senha do IP ${clientIp}`);
        return res.status(429).json({ 
          message: "Limite de tentativas excedido. Tente novamente mais tarde." 
        });
      }
      
      // Registrar esta tentativa
      recentValidAttempts.push(now);
      rateLimitMap.set(clientIp, recentValidAttempts);
      
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "E-mail inválido" });
      }

      // Por questões de segurança, não informamos se o e-mail existe ou não
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Simular um atraso para dificultar enumeração de usuários por tempo de resposta
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        // Retornamos sucesso mesmo se o e-mail não existir
        return res.status(200).json({ message: "E-mail enviado com sucesso" });
      }

      // Verificar tentativas recentes do mesmo usuário (no máximo 1 a cada 15 minutos)
      if (user.passwordResetExpires && new Date(user.passwordResetExpires) > new Date(Date.now() - 900000)) {
        console.warn(`Tentativa de redefinição de senha muito frequente para o usuário ${user.id}`);
        return res.status(200).json({ 
          message: "E-mail enviado com sucesso" 
        });
      }

      // Gerar token seguro para redefinição de senha
      const resetToken = randomBytes(32).toString('hex');
      const resetExpiresIn = new Date(Date.now() + 3600000); // 1 hora
      
      // Salvar token e data de expiração no usuário
      const updated = await storage.setPasswordResetToken(user.id, resetToken, resetExpiresIn);
      
      if (!updated) {
        console.error("Erro ao salvar token de redefinição");
        return res.status(500).json({ message: "Erro ao processar a solicitação" });
      }

      // Criar URL para redefinição
      const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
      
      // Enviar e-mail
      try {
        await emailService.sendPasswordResetEmail(user, resetToken, resetUrl);
        console.log(`E-mail de redefinição enviado para: ${email}`);
      } catch (emailError) {
        console.error("Erro ao enviar e-mail de redefinição:", emailError);
        // Mesmo com erro no e-mail, retornamos sucesso para não revelar informações sensíveis
      }

      res.status(200).json({ message: "E-mail enviado com sucesso" });
    } catch (error) {
      console.error("Erro ao processar solicitação de redefinição:", error);
      res.status(500).json({ message: "Erro ao processar a solicitação" });
    }
  });

  // Rota para validar token de redefinição
  app.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Token inválido" });
      }

      // Verificar se há um usuário com esse token e se ainda é válido
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Token válido
      res.status(200).json({ message: "Token válido", userId: user.id });
    } catch (error) {
      console.error("Erro ao validar token:", error);
      res.status(500).json({ message: "Erro ao processar a solicitação" });
    }
  });

  // Rota para redefinir a senha
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password || typeof token !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }

      // Verificar se o token é válido e ainda não expirou
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Hash da nova senha
      const hashedPassword = await hashPassword(password);
      
      // Atualizar senha e limpar token de redefinição
      const updated = await storage.resetPassword(user.id, hashedPassword);
      
      if (!updated) {
        return res.status(500).json({ message: "Erro ao redefinir senha" });
      }

      // Enviar e-mail de confirmação
      try {
        await emailService.sendPasswordChangedConfirmation(user);
      } catch (emailError) {
        console.error("Erro ao enviar e-mail de confirmação:", emailError);
        // Continuamos mesmo se o e-mail falhar
      }

      res.status(200).json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      res.status(500).json({ message: "Erro ao processar a solicitação" });
    }
  });

  // Delete User (Admin only)
  app.delete("/api/admin/users/:id", requirePermission(`${Resource.USERS}.${Operation.DELETE}`), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Verificar se o usuário existe
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Impedir exclusão de administradores
      if (user.role === "admin") {
        return res.status(403).json({ message: "Não é possível excluir contas de administradores" });
      }
      
      // Excluir usuário
      const result = await storage.deleteUser(userId);
      
      if (!result) {
        return res.status(500).json({ message: "Erro ao excluir usuário" });
      }
      
      res.status(200).json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
