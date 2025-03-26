import { db } from './server/db';
import * as schema from './shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating database tables...');
  
  // Dropping existing tables if they exist
  await db.execute(sql`
    DROP TABLE IF EXISTS "download_links", "games", "categories", "users", "session" CASCADE
  `);
  console.log('- Dropped existing tables');
  
  // Criando tabela de usuários
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" SERIAL PRIMARY KEY,
      "username" VARCHAR(255) NOT NULL,
      "password" VARCHAR(255) NOT NULL,
      "email" VARCHAR(255) NOT NULL,
      "bio" TEXT,
      "role" VARCHAR(255) NOT NULL DEFAULT 'user',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('- Users table created');
  
  // Criando tabela de categorias
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "categories" (
      "id" SERIAL PRIMARY KEY,
      "name" VARCHAR(255) NOT NULL,
      "slug" VARCHAR(255) NOT NULL UNIQUE,
      "iconName" VARCHAR(255) NOT NULL
    )
  `);
  console.log('- Categories table created');
  
  // Criando tabela de jogos
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "games" (
      "id" SERIAL PRIMARY KEY,
      "title" VARCHAR(255) NOT NULL,
      "alternativeTitle" VARCHAR(255),
      "description" TEXT NOT NULL,
      "version" VARCHAR(255) NOT NULL,
      "categoryId" INTEGER REFERENCES "categories"("id"),
      "userId" INTEGER NOT NULL REFERENCES "users"("id"),
      "status" VARCHAR(255) NOT NULL DEFAULT 'pending',
      "systemRequirements" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('- Games table created');
  
  // Criando tabela de links de download
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "download_links" (
      "id" SERIAL PRIMARY KEY,
      "gameId" INTEGER NOT NULL REFERENCES "games"("id"),
      "os" VARCHAR(255) NOT NULL,
      "url" TEXT NOT NULL,
      "fileSize" VARCHAR(255)
    )
  `);
  console.log('- Download links table created');

  // Criando tabela de sessões
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" VARCHAR NOT NULL PRIMARY KEY,
      "sess" JSONB NOT NULL,
      "expire" TIMESTAMP(6) NOT NULL
    )
  `);
  console.log('- Session table created');
  
  // Criando usuário admin inicial
  try {
    const adminResult = await db.execute(sql`
      SELECT COUNT(*) AS count FROM "users" WHERE username = 'admin'
    `);
    
    const adminCount = parseInt(adminResult.rows[0].count);
    
    if (adminCount === 0) {
      await db.execute(sql`
        INSERT INTO "users" (username, password, email, role)
        VALUES ('admin', '$2b$10$iqJSHD.NGrDi5DOa28a1QuQiw1qWHOZIQhPzdRXlmkcmqqH9aSACi', 'admin@example.com', 'admin')
      `);
      console.log('- Admin user created');
    } else {
      console.log('- Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
  
  // Criando categorias iniciais
  try {
    const categories = [
      { name: 'Aventura', slug: 'aventura', iconName: 'mountain' },
      { name: 'RPG', slug: 'rpg', iconName: 'dragon' },
      { name: 'Ação', slug: 'acao', iconName: 'bolt' },
      { name: 'Puzzle', slug: 'puzzle', iconName: 'puzzle-piece' },
      { name: 'Estratégia', slug: 'estrategia', iconName: 'chess' },
      { name: 'Simulação', slug: 'simulacao', iconName: 'plane' },
      { name: 'Esportes', slug: 'esportes', iconName: 'trophy' },
      { name: 'Quiz', slug: 'quiz', iconName: 'help-circle' }
    ];
    
    for (const category of categories) {
      try {
        const catResult = await db.execute(sql`
          SELECT COUNT(*) AS count FROM "categories" WHERE slug = ${category.slug}
        `);
        
        const catCount = parseInt(catResult.rows[0].count);
        
        if (catCount === 0) {
          await db.execute(sql`
            INSERT INTO "categories" (name, slug, "iconName")
            VALUES (${category.name}, ${category.slug}, ${category.iconName})
          `);
          console.log(`- Category ${category.name} created`);
        } else {
          console.log(`- Category ${category.name} already exists`);
        }
      } catch (error) {
        console.error(`Error creating category ${category.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error creating categories:', error);
  }
  
  console.log('Database migration completed');
  process.exit(0);
}

main().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});