/**
 * Serviço de criptografia para dados sensíveis
 * Incluindo armazenamento seguro de senhas usando Argon2id
 */

import * as crypto from 'crypto';
import argon2 from 'argon2';

class CryptoService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private tagLength = 16; // 128 bits
  private key: Buffer;

  constructor() {
    // Carregar chave do ambiente ou criar uma temporária
    // Em produção, deve sempre usar variáveis de ambiente!
    const envKey = process.env.CRYPTO_KEY;
    
    if (envKey) {
      // Usar chave definida no ambiente
      this.key = Buffer.from(envKey, 'hex');
      
      // Verificar comprimento da chave
      if (this.key.length !== this.keyLength) {
        throw new Error('CRYPTO_KEY deve ter exatamente 32 bytes (64 caracteres hexadecimais)');
      }
    } else {
      // Gerar chave temporária para desenvolvimento
      // ⚠️ NUNCA fazer isso em produção! A chave deve ser persistente!
      this.key = crypto.randomBytes(this.keyLength);
      console.log('[CRYPTO] Nenhuma chave de criptografia definida no ambiente, usando chave temporária');
    }
  }

  /**
   * Hash de senha usando Argon2id - algoritmo ideal para senhas
   * @param password Senha a ser hasheada
   * @returns Hash no formato Argon2id (string)
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Usar Argon2id com configurações recomendadas
      // memory: 19456 KiB (19 MiB)
      // iterations: 2
      // parallelism: 1
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1
      });
    } catch (error) {
      console.error('Erro ao fazer hash da senha:', error);
      throw new Error('Falha ao processar a senha');
    }
  }

  /**
   * Verificar senha contra um hash Argon2id
   * @param password Senha fornecida pelo usuário
   * @param hash Hash armazenado
   * @returns True se a senha corresponder ao hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  }

  /**
   * Criptografar dados usando AES-256-GCM (Authenticated Encryption)
   * @param data Dados para criptografar
   * @returns Dados criptografados em formato base64
   */
  encrypt(data: string): string {
    try {
      // Gerar IV aleatório
      const iv = crypto.randomBytes(this.ivLength);
      
      // Criar cipher com IV
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Criptografar dados
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Obter authentication tag
      const authTag = cipher.getAuthTag();
      
      // Concatenar iv, authTag e dados criptografados
      const result = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]).toString('base64');
      
      return result;
    } catch (error) {
      console.error('Erro ao criptografar dados:', error);
      throw new Error('Falha na criptografia');
    }
  }

  /**
   * Descriptografar dados usando AES-256-GCM
   * @param encryptedData Dados criptografados em formato base64
   * @returns Dados descriptografados
   */
  decrypt(encryptedData: string): string {
    try {
      // Decodificar para buffer
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extrair IV, authTag e dados criptografados
      const iv = buffer.subarray(0, this.ivLength);
      const authTag = buffer.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = buffer.subarray(this.ivLength + this.tagLength).toString('hex');
      
      // Criar decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      // Definir authentication tag
      decipher.setAuthTag(authTag);
      
      // Descriptografar
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar dados:', error);
      throw new Error('Falha na descriptografia');
    }
  }

  /**
   * Gera um token seguro aleatório
   * @param size Tamanho do token em bytes
   * @returns Token gerado em formato hexadecimal
   */
  generateSecureToken(size: number = 32): string {
    return crypto.randomBytes(size).toString('hex');
  }

  /**
   * Cria um hash SHA-256 de uma string
   * @param data Dados para criar hash
   * @returns Hash em formato hexadecimal
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Cria um hash com salt para armazenamento mais seguro
   * @param data Dados a serem hasheados
   * @returns String no formato hash.salt
   */
  hashWithSalt(data: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', salt).update(data).digest('hex');
    return `${hash}.${salt}`;
  }

  /**
   * Verifica um hash com salt
   * @param data Dados a verificar
   * @param hashWithSalt Hash com salt no formato hash.salt
   * @returns True se o hash corresponder aos dados
   */
  verifyHashWithSalt(data: string, hashWithSalt: string): boolean {
    try {
      const [storedHash, salt] = hashWithSalt.split('.');
      const calculatedHash = crypto.createHmac('sha256', salt).update(data).digest('hex');
      return storedHash === calculatedHash;
    } catch (error) {
      return false;
    }
  }
}

export const cryptoService = new CryptoService();