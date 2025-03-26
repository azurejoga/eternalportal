import { pool } from "./server/db";

async function main() {
  console.log("Iniciando migração do banco de dados...");

  try {
    // Verificar se a coluna lastLogin já existe na tabela users
    const checkLastLoginColumn = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'lastLogin'
    `;
    
    const lastLoginColumnResult = await pool.query(checkLastLoginColumn);
    
    if (lastLoginColumnResult.rowCount === 0) {
      console.log("Adicionando coluna lastLogin à tabela users");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN "lastLogin" TIMESTAMP
      `);
    } else {
      console.log("Coluna lastLogin já existe");
    }

    // Verificar se a coluna failedLoginAttempts já existe
    const checkFailedLoginAttemptsColumn = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'failedLoginAttempts'
    `;
    
    const failedLoginAttemptsColumnResult = await pool.query(checkFailedLoginAttemptsColumn);
    
    if (failedLoginAttemptsColumnResult.rowCount === 0) {
      console.log("Adicionando coluna failedLoginAttempts à tabela users");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN "failedLoginAttempts" INTEGER DEFAULT 0
      `);
    } else {
      console.log("Coluna failedLoginAttempts já existe");
    }

    // Verificar se a coluna accountStatus já existe
    const checkAccountStatusColumn = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'accountStatus'
    `;
    
    const accountStatusColumnResult = await pool.query(checkAccountStatusColumn);
    
    if (accountStatusColumnResult.rowCount === 0) {
      // Verificar se o enum account_status já existe
      const checkAccountStatusEnum = `
        SELECT typname
        FROM pg_type
        WHERE typname = 'account_status'
      `;
      
      const accountStatusEnumResult = await pool.query(checkAccountStatusEnum);
      
      if (accountStatusEnumResult.rowCount === 0) {
        console.log("Criando enum account_status");
        await pool.query(`
          CREATE TYPE account_status AS ENUM ('active', 'locked', 'suspended', 'inactive')
        `);
      }
      
      console.log("Adicionando coluna accountStatus à tabela users");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN "accountStatus" account_status DEFAULT 'active'
      `);
    } else {
      console.log("Coluna accountStatus já existe");
    }

    // Verificar se a coluna passwordResetToken já existe
    const checkPasswordResetTokenColumn = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'passwordResetToken'
    `;
    
    const passwordResetTokenColumnResult = await pool.query(checkPasswordResetTokenColumn);
    
    if (passwordResetTokenColumnResult.rowCount === 0) {
      console.log("Adicionando coluna passwordResetToken à tabela users");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN "passwordResetToken" TEXT
      `);
    } else {
      console.log("Coluna passwordResetToken já existe");
    }

    // Verificar se a coluna passwordResetExpires já existe
    const checkPasswordResetExpiresColumn = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'passwordResetExpires'
    `;
    
    const passwordResetExpiresColumnResult = await pool.query(checkPasswordResetExpiresColumn);
    
    if (passwordResetExpiresColumnResult.rowCount === 0) {
      console.log("Adicionando coluna passwordResetExpires à tabela users");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN "passwordResetExpires" TIMESTAMP
      `);
    } else {
      console.log("Coluna passwordResetExpires já existe");
    }

    // Verificar se a coluna lastPasswordReset já existe
    const checkLastPasswordResetColumn = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'lastPasswordReset'
    `;
    
    const lastPasswordResetColumnResult = await pool.query(checkLastPasswordResetColumn);
    
    if (lastPasswordResetColumnResult.rowCount === 0) {
      console.log("Adicionando coluna lastPasswordReset à tabela users");
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN "lastPasswordReset" TIMESTAMP
      `);
    } else {
      console.log("Coluna lastPasswordReset já existe");
    }

    console.log("Migração concluída com sucesso!");
  } catch (error) {
    console.error("Erro ao realizar migração:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();