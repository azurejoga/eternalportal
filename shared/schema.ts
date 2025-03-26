import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for roles
export const roleEnum = pgEnum('role', ['user', 'admin']);

// Enum for game status
export const gameStatusEnum = pgEnum('game_status', ['pending', 'approved', 'rejected']);

// Enum for operating systems and platforms
export const osEnum = pgEnum('os', ['windows', 'macos', 'linux', 'android', 'ios', 'steam', 'browser']);

// Enum for languages
export const languageEnum = pgEnum('language', ['portuguese', 'english', 'spanish', 'french', 'german', 'italian', 'japanese', 'chinese', 'russian', 'korean', 'other']);

// Status da conta do usuário
export const accountStatusEnum = pgEnum('account_status', ['active', 'locked', 'suspended', 'inactive']);

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  bio: text("bio"),
  role: roleEnum("role").notNull().default('user'),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  lastLogin: timestamp("lastLogin"),
  failedLoginAttempts: integer("failedLoginAttempts").default(0),
  accountStatus: accountStatusEnum("accountStatus").notNull().default('active'),
  passwordResetToken: text("passwordResetToken"),
  passwordResetExpires: timestamp("passwordResetExpires"),
  lastPasswordReset: timestamp("lastPasswordReset"),
});

// Category table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  iconName: text("iconName").notNull(),
});

// Game table
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  alternativeTitle: text("alternativeTitle"),
  description: text("description").notNull(),
  version: text("version").notNull(),
  categoryId: integer("categoryId").references(() => categories.id),
  userId: integer("userId").references(() => users.id).notNull(),
  status: gameStatusEnum("status").notNull().default('pending'),
  systemRequirements: text("systemRequirements"),
  language: languageEnum("language").default('portuguese'),
  additionalLanguages: text("additionalLanguages"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Download links table
export const downloadLinks = pgTable("download_links", {
  id: serial("id").primaryKey(),
  gameId: integer("gameId").references(() => games.id).notNull(),
  os: osEnum("os").notNull(),
  url: text("url").notNull(),
  fileSize: text("fileSize"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
}).extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters" })
});

export const insertCategorySchema = createInsertSchema(categories);

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  userId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDownloadLinkSchema = createInsertSchema(downloadLinks).omit({
  id: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export type InsertDownloadLink = z.infer<typeof insertDownloadLinkSchema>;
export type DownloadLink = typeof downloadLinks.$inferSelect;

// Extended types for frontend
export type GameWithDetails = Game & {
  category?: Category;
  user?: { id: number; username: string };
  downloadLinks?: DownloadLink[];
};
