import { 
  User, InsertUser, 
  Game, InsertGame, GameWithDetails,
  Category, InsertCategory,
  DownloadLink, InsertDownloadLink,
  users, games, categories, downloadLinks, gameStatusEnum
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { eq, and, desc, asc, SQL, sql, or, lt, isNull } from "drizzle-orm";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBio(userId: number, bio: string): Promise<User | undefined>;
  getUsersByRole(role: 'user' | 'admin'): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  promoteUserToAdmin(userId: number): Promise<User | undefined>;
  deleteUser(userId: number): Promise<boolean>;
  
  // User security operations
  incrementLoginAttempt(userId: number): Promise<boolean>;
  resetUserLoginAttempts(userId: number): Promise<boolean>;
  updateUserLastLogin(userId: number, date: Date): Promise<boolean>;
  updateUserAccountStatus(userId: number, status: 'active' | 'locked' | 'suspended' | 'inactive'): Promise<boolean>;
  markInactiveAccounts(inactiveDays: number): Promise<number>;
  
  // Password reset operations
  setPasswordResetToken(userId: number, token: string, expires: Date): Promise<boolean>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  resetPassword(userId: number, newPasswordHash: string): Promise<boolean>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<boolean>;
  getCategoryGameCounts(): Promise<{categoryId: number; count: number}[]>;
  
  // Game operations
  getGames(options?: {
    status?: 'pending' | 'approved' | 'rejected';
    userId?: number;
    categoryId?: number;
    language?: string;
    platform?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'newest' | 'oldest' | 'title_asc' | 'title_desc';
  }): Promise<GameWithDetails[]>;
  getGameById(id: number): Promise<GameWithDetails | undefined>;
  createGame(game: InsertGame & { userId: number }): Promise<Game>;
  updateGameStatus(gameId: number, status: 'pending' | 'approved' | 'rejected'): Promise<Game | undefined>;
  deleteGame(gameId: number): Promise<boolean>;
  
  // Download link operations
  getDownloadLinksByGameId(gameId: number): Promise<DownloadLink[]>;
  createDownloadLink(downloadLink: InsertDownloadLink): Promise<DownloadLink>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private games: Map<number, Game>;
  private categories: Map<number, Category>;
  private downloadLinks: Map<number, DownloadLink>;
  private userIdCounter: number;
  private gameIdCounter: number;
  private categoryIdCounter: number;
  private downloadLinkIdCounter: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.categories = new Map();
    this.downloadLinks = new Map();
    this.userIdCounter = 1;
    this.gameIdCounter = 1;
    this.categoryIdCounter = 1;
    this.downloadLinkIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize with admin user
    this.createUser({
      username: "admin",
      password: "$2b$10$iqJSHD.NGrDi5DOa28a1QuQiw1qWHOZIQhPzdRXlmkcmqqH9aSACi", // "password"
      email: "admin@example.com",
      role: "admin"
    });
    
    // Initialize with some categories
    const categoriesData: InsertCategory[] = [
      { name: "Adventure", slug: "adventure", iconName: "mountain" },
      { name: "RPG", slug: "rpg", iconName: "dragon" },
      { name: "Action", slug: "action", iconName: "bolt" },
      { name: "Puzzle", slug: "puzzle", iconName: "puzzle-piece" },
      { name: "Strategy", slug: "strategy", iconName: "chess" },
      { name: "Simulation", slug: "simulation", iconName: "plane" },
      { name: "Sports", slug: "sports", iconName: "futbol" },
      { name: "Quiz", slug: "quiz", iconName: "question-circle" }
    ];
    
    categoriesData.forEach(category => this.createCategory(category));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = {
      id,
      username: userData.username!,
      password: userData.password!,
      email: userData.email!,
      bio: userData.bio || null,
      role: userData.role || 'user',
      createdAt: userData.createdAt || now,
      lastLogin: userData.lastLogin || now,
      failedLoginAttempts: userData.failedLoginAttempts || 0,
      accountStatus: userData.accountStatus || 'active',
      passwordResetToken: userData.passwordResetToken || null,
      passwordResetExpires: userData.passwordResetExpires || null,
      lastPasswordReset: userData.lastPasswordReset || null,
    };
    this.users.set(id, user);
    return { ...user };
  }
  
  // Implementação dos novos métodos de segurança
  async incrementLoginAttempt(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const updatedUser = { ...user, failedLoginAttempts: newAttempts };
    this.users.set(userId, updatedUser);
    return true;
  }

  async resetUserLoginAttempts(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const updatedUser = { ...user, failedLoginAttempts: 0 };
    this.users.set(userId, updatedUser);
    return true;
  }

  async updateUserLastLogin(userId: number, date: Date): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const updatedUser = { ...user, lastLogin: date };
    this.users.set(userId, updatedUser);
    return true;
  }

  async updateUserAccountStatus(userId: number, status: 'active' | 'locked' | 'suspended' | 'inactive'): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const updatedUser = { ...user, accountStatus: status };
    this.users.set(userId, updatedUser);
    return true;
  }

  async markInactiveAccounts(inactiveDays: number): Promise<number> {
    const inactiveDate = new Date();
    inactiveDate.setDate(inactiveDate.getDate() - inactiveDays);
    
    let markedCount = 0;
    
    for (const user of this.users.values()) {
      if (
        user.accountStatus === 'active' && 
        (
          !user.lastLogin || 
          new Date(user.lastLogin) < inactiveDate
        )
      ) {
        this.users.set(user.id, { ...user, accountStatus: 'inactive' });
        markedCount++;
      }
    }
    
    return markedCount;
  }

  async updateUserBio(userId: number, bio: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, bio };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUsersByRole(role: 'user' | 'admin'): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === role
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async promoteUserToAdmin(userId: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, role: 'admin' as const };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(
      (category) => category.slug === slug
    );
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    // Check if the category exists
    if (!this.categories.has(id)) {
      return false;
    }
    
    // Delete the category
    this.categories.delete(id);
    return true;
  }
  
  async getCategoryGameCounts(): Promise<{categoryId: number; count: number}[]> {
    // Para armazenamento em memória, contamos os jogos manualmente
    const approvedGames = Array.from(this.games.values())
      .filter(game => game.status === 'approved' && game.categoryId !== null);
    
    // Usar Map para contar jogos por categoria de forma eficiente
    const countMap = new Map<number, number>();
    
    approvedGames.forEach(game => {
      if (game.categoryId) {
        const currentCount = countMap.get(game.categoryId) || 0;
        countMap.set(game.categoryId, currentCount + 1);
      }
    });
    
    // Converter o Map em um array de objetos com a forma esperada
    return Array.from(countMap.entries()).map(([categoryId, count]) => ({
      categoryId,
      count
    }));
  }

  // Game operations
  async getGames(options: {
    status?: 'pending' | 'approved' | 'rejected';
    userId?: number;
    categoryId?: number;
    language?: string;
    platform?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'newest' | 'oldest' | 'title_asc' | 'title_desc';
  } = {}): Promise<GameWithDetails[]> {
    let games = Array.from(this.games.values());
    
    // Filter by status
    if (options.status) {
      games = games.filter(game => game.status === options.status);
    }
    
    // Filter by user
    if (options.userId) {
      games = games.filter(game => game.userId === options.userId);
    }
    
    // Filter by category
    if (options.categoryId) {
      games = games.filter(game => game.categoryId === options.categoryId);
    }
    
    // Filter by language
    if (options.language) {
      games = games.filter(game => game.language === options.language);
    }
    
    // Filter by platform
    if (options.platform) {
      games = games.filter(async (game) => {
        const downloadLinks = await this.getDownloadLinksByGameId(game.id);
        return downloadLinks.some(link => link.os === options.platform);
      });
    }
    
    // Sort games
    if (options.sortBy) {
      switch (options.sortBy) {
        case 'newest':
          games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'oldest':
          games.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case 'title_asc':
          games.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'title_desc':
          games.sort((a, b) => b.title.localeCompare(a.title));
          break;
      }
    }
    
    // Apply pagination
    if (options.limit !== undefined && options.offset !== undefined) {
      games = games.slice(options.offset, options.offset + options.limit);
    }
    
    // Enrich games with details
    return Promise.all(games.map(async (game) => {
      const user = game.userId ? await this.getUser(game.userId) : undefined;
      const category = game.categoryId ? await this.getCategoryById(game.categoryId) : undefined;
      const downloadLinks = await this.getDownloadLinksByGameId(game.id);
      
      return {
        ...game,
        category,
        user: user ? { id: user.id, username: user.username } : undefined,
        downloadLinks
      };
    }));
  }

  async getGameById(id: number): Promise<GameWithDetails | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const user = game.userId ? await this.getUser(game.userId) : undefined;
    const category = game.categoryId ? await this.getCategoryById(game.categoryId) : undefined;
    const downloadLinks = await this.getDownloadLinksByGameId(game.id);
    
    return {
      ...game,
      category,
      user: user ? { id: user.id, username: user.username } : undefined,
      downloadLinks
    };
  }

  async createGame(gameData: InsertGame & { userId: number }): Promise<Game> {
    const id = this.gameIdCounter++;
    const now = new Date();
    
    const game: Game = {
      id,
      title: gameData.title,
      alternativeTitle: gameData.alternativeTitle || null,
      description: gameData.description,
      version: gameData.version,
      categoryId: gameData.categoryId || null,
      userId: gameData.userId,
      status: 'pending',
      systemRequirements: gameData.systemRequirements || null,
      language: gameData.language || 'portuguese',
      additionalLanguages: gameData.additionalLanguages || '',
      createdAt: now,
      updatedAt: now
    };
    
    this.games.set(id, game);
    return game;
  }

  async updateGameStatus(gameId: number, status: 'pending' | 'approved' | 'rejected'): Promise<Game | undefined> {
    const game = this.games.get(gameId);
    if (!game) return undefined;
    
    const updatedGame = { ...game, status, updatedAt: new Date() };
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }
  
  async deleteGame(gameId: number): Promise<boolean> {
    // Verificar se o jogo existe
    if (!this.games.has(gameId)) {
      return false;
    }
    
    // Excluir todos os links de download associados
    const downloadLinks = await this.getDownloadLinksByGameId(gameId);
    downloadLinks.forEach(link => {
      this.downloadLinks.delete(link.id);
    });
    
    // Excluir o jogo
    this.games.delete(gameId);
    return true;
  }

  // Download link operations
  async getDownloadLinksByGameId(gameId: number): Promise<DownloadLink[]> {
    return Array.from(this.downloadLinks.values()).filter(
      (link) => link.gameId === gameId
    );
  }

  async createDownloadLink(downloadLink: InsertDownloadLink): Promise<DownloadLink> {
    const id = this.downloadLinkIdCounter++;
    const newLink: DownloadLink = { 
      ...downloadLink, 
      id,
      fileSize: downloadLink.fileSize || null
    };
    this.downloadLinks.set(id, newLink);
    return newLink;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }
  
  // User security operations
  async incrementLoginAttempt(userId: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ 
          failedLoginAttempts: sql`COALESCE("failedLoginAttempts", 0) + 1` 
        })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Erro ao incrementar tentativas de login:", error);
      return false;
    }
  }

  async resetUserLoginAttempts(userId: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ failedLoginAttempts: 0 })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Erro ao resetar tentativas de login:", error);
      return false;
    }
  }

  async updateUserLastLogin(userId: number, date: Date): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ lastLogin: date })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Erro ao atualizar último login:", error);
      return false;
    }
  }

  async updateUserAccountStatus(userId: number, status: 'active' | 'locked' | 'suspended' | 'inactive'): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ accountStatus: status })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Erro ao atualizar status da conta:", error);
      return false;
    }
  }

  async markInactiveAccounts(inactiveDays: number): Promise<number> {
    try {
      // Marca como inativas contas que não fizeram login há mais de X dias
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
      
      const result = await db
        .update(users)
        .set({ 
          accountStatus: 'inactive'
        })
        .where(
          and(
            eq(users.accountStatus, 'active'),
            or(
              lt(users.lastLogin, cutoffDate),
              isNull(users.lastLogin)
            )
          )
        )
        .returning();
      
      return result.length;
    } catch (error) {
      console.error("Erro ao marcar contas inativas:", error);
      return 0;
    }
  }
  
  async setPasswordResetToken(userId: number, token: string, expires: Date): Promise<boolean> {
    try {
      await db.update(users)
        .set({ 
          passwordResetToken: token,
          passwordResetExpires: expires
        })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Erro ao definir token de recuperação de senha:", error);
      return false;
    }
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.passwordResetToken, token));
      return user || undefined;
    } catch (error) {
      console.error("Erro ao buscar usuário por token de redefinição:", error);
      return undefined;
    }
  }
  
  async resetPassword(userId: number, newPasswordHash: string): Promise<boolean> {
    try {
      const now = new Date();
      await db.update(users)
        .set({ 
          password: newPasswordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          lastPasswordReset: now,
          failedLoginAttempts: 0,  // Resetar tentativas de login
          accountStatus: 'active'  // Garantir que a conta esteja ativa
        })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return false;
    }
  }
  
  async deleteUser(userId: number): Promise<boolean> {
    try {
      // Verificar se é administrador
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (!user || user.role === 'admin') {
        return false;
      }
      
      // Obter jogos do usuário para exclusão
      const userGames = await db.select()
        .from(games)
        .where(eq(games.userId, userId));
        
      // Excluir links de download dos jogos do usuário
      for (const game of userGames) {
        await db.delete(downloadLinks)
          .where(eq(downloadLinks.gameId, game.id));
      }
      
      // Excluir jogos do usuário
      await db.delete(games)
        .where(eq(games.userId, userId));
        
      // Finalmente, excluir o usuário
      await db.delete(users)
        .where(eq(users.id, userId));
        
      return true;
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      return false;
    }
  }
  

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserBio(userId: number, bio: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ bio })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getUsersByRole(role: 'user' | 'admin'): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.role, role));
  }
  
  async getAllUsers(): Promise<User[]> {
    return db
      .select()
      .from(users);
  }
  
  async promoteUserToAdmin(userId: number): Promise<User | undefined> {
    // Primeiro verifique se o usuário existe
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) return undefined;
    
    // Atualize o papel do usuário para administrador
    const [updatedUser] = await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category || undefined;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Primeiro verifique se a categoria existe
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    
    if (!category) return false;
    
    // Se existir, exclua
    await db
      .delete(categories)
      .where(eq(categories.id, id));
    
    return true;
  }
  
  async getCategoryGameCounts(): Promise<{categoryId: number; count: number}[]> {
    // Usar SQL direto para obter contagens precisas de jogos por categoria
    const query = `
      SELECT 
        "categoryId" as "categoryId", 
        COUNT(*) as count 
      FROM games 
      WHERE status = 'approved' AND "categoryId" IS NOT NULL 
      GROUP BY "categoryId"
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows.map(row => ({
        categoryId: Number(row.categoryId),
        count: Number(row.count)
      }));
    } catch (error) {
      console.error("Erro ao contar jogos por categoria:", error);
      return [];
    }
  }

  async getGames(options: {
    status?: 'pending' | 'approved' | 'rejected';
    userId?: number;
    categoryId?: number;
    language?: string;
    platform?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'newest' | 'oldest' | 'title_asc' | 'title_desc';
  } = {}): Promise<GameWithDetails[]> {
    // Construir a consulta com filtros
    let conditions = [];
    
    if (options.status) {
      conditions.push(eq(games.status, options.status));
    }
    
    if (options.userId) {
      conditions.push(eq(games.userId, options.userId));
    }
    
    if (options.categoryId) {
      conditions.push(eq(games.categoryId, options.categoryId));
    }
    
    if (options.language) {
      conditions.push(sql`${games.language} = ${options.language}`);
    }
    
    // Executar a consulta
    let gameResults;
    if (conditions.length > 0) {
      gameResults = await db.select().from(games).where(and(...conditions));
    } else {
      gameResults = await db.select().from(games);
    }
    
    // Enriquecer cada jogo com seus detalhes relacionados
    const gamesWithDetails: GameWithDetails[] = [];
    
    for (const game of gameResults) {
      // Buscar usuário relacionado
      let user: { id: number; username: string } | undefined = undefined;
      if (game.userId) {
        const [userResult] = await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, game.userId));
        
        if (userResult) {
          user = {
            id: userResult.id,
            username: userResult.username
          };
        }
      }
      
      // Buscar categoria relacionada
      let category = undefined;
      if (game.categoryId) {
        const [categoryResult] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, game.categoryId));
        
        if (categoryResult) {
          category = categoryResult;
        }
      }
      
      // Buscar links de download
      const downloadLinks = await this.getDownloadLinksByGameId(game.id);
      
      // Se tiver filtro de plataforma, verificar se o jogo tem links para essa plataforma
      if (options.platform && downloadLinks.length > 0) {
        const hasPlatform = downloadLinks.some(link => link.os === options.platform);
        if (!hasPlatform) {
          // Pular este jogo se não tiver a plataforma solicitada
          continue;
        }
      }
      
      // Criar o objeto enriquecido
      gamesWithDetails.push({
        ...game,
        category,
        user,
        downloadLinks
      });
    }
    
    // Aplicar ordenação
    if (options.sortBy) {
      switch (options.sortBy) {
        case 'newest':
          gamesWithDetails.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
        case 'oldest':
          gamesWithDetails.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          break;
        case 'title_asc':
          gamesWithDetails.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'title_desc':
          gamesWithDetails.sort((a, b) => b.title.localeCompare(a.title));
          break;
      }
    }
    
    // Aplicar paginação
    let paginatedGames = gamesWithDetails;
    if (options.offset !== undefined && options.limit !== undefined) {
      paginatedGames = gamesWithDetails.slice(
        options.offset, 
        options.offset + options.limit
      );
    } else if (options.limit !== undefined) {
      paginatedGames = gamesWithDetails.slice(0, options.limit);
    }
    
    return paginatedGames;
  }

  async getGameById(id: number): Promise<GameWithDetails | undefined> {
    // Usar a API tipada do Drizzle
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, id));
    
    if (!game) return undefined;
    
    // Buscar usuário relacionado
    let user: { id: number; username: string } | undefined = undefined;
    if (game.userId) {
      const [userResult] = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.id, game.userId));
      
      if (userResult) {
        user = {
          id: userResult.id,
          username: userResult.username
        };
      }
    }
    
    // Buscar categoria relacionada
    let category = undefined;
    if (game.categoryId) {
      const [categoryResult] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, game.categoryId));
      
      if (categoryResult) {
        category = categoryResult;
      }
    }
    
    // Buscar links de download
    const downloadLinks = await this.getDownloadLinksByGameId(game.id);
    
    // Criar o objeto enriquecido
    return {
      ...game,
      category,
      user,
      downloadLinks
    };
  }

  async createGame(gameData: InsertGame & { userId: number; additionalLanguages?: string }): Promise<Game> {
    const [game] = await db
      .insert(games)
      .values({
        ...gameData,
        language: gameData.language || 'portuguese',
        additionalLanguages: gameData.additionalLanguages || '',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return game;
  }

  async updateGameStatus(gameId: number, status: 'pending' | 'approved' | 'rejected'): Promise<Game | undefined> {
    const [game] = await db
      .update(games)
      .set({ status, updatedAt: new Date() })
      .where(eq(games.id, gameId))
      .returning();
    return game || undefined;
  }
  
  async deleteGame(gameId: number): Promise<boolean> {
    try {
      // Verificar se o jogo existe
      const [game] = await db
        .select()
        .from(games)
        .where(eq(games.id, gameId));
      
      if (!game) return false;
      
      // Excluir links de download primeiro (integridade referencial)
      await db
        .delete(downloadLinks)
        .where(eq(downloadLinks.gameId, gameId));
      
      // Excluir o jogo
      await db
        .delete(games)
        .where(eq(games.id, gameId));
        
      return true;
    } catch (error) {
      console.error('Erro ao excluir jogo:', error);
      return false;
    }
  }

  async getDownloadLinksByGameId(gameId: number): Promise<DownloadLink[]> {
    return db
      .select()
      .from(downloadLinks)
      .where(eq(downloadLinks.gameId, gameId));
  }

  async createDownloadLink(downloadLink: InsertDownloadLink): Promise<DownloadLink> {
    const [link] = await db
      .insert(downloadLinks)
      .values(downloadLink)
      .returning();
    return link;
  }
}

// Vamos usar o PostgreSQL para armazenamento persistente
export const storage = new DatabaseStorage();
