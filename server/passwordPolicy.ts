/**
 * Password Policy - Sistema de verificação de força de senhas
 * Implementa regras para garantir senhas fortes no sistema
 */

import { randomBytes } from "crypto";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordPolicy {
  // Tamanho mínimo da senha
  private minLength: number = 8;
  
  // Tamanho máximo para evitar ataques DoS
  private maxLength: number = 100;
  
  // Lista de senhas comuns a serem bloqueadas
  private commonPasswords: Set<string> = new Set([
    // Top 20 senhas mais comuns (exemplos)
    "123456", "123456789", "qwerty", "password", "12345", "qwerty123", 
    "1q2w3e", "12345678", "111111", "1234567890", "senha", "admin",
    "welcome", "monkey", "login", "abc123", "starwars", "123123", 
    "dragon", "passw0rd", "master", "hello", "freedom", "whatever",
    
    // Variantes em português
    "senha123", "administrador", "123mudar", "adminadmin", "usuario", 
    "controle", "futebol", "flamengo", "corinthians", "palmeiras", 
    "brasil", "102030", "bemvindo", "portugal", "mudar123"
  ]);

  constructor(options?: {
    minLength?: number;
    maxLength?: number;
    additionalCommonPasswords?: string[];
  }) {
    if (options) {
      if (options.minLength) {
        this.minLength = options.minLength;
      }
      
      if (options.maxLength) {
        this.maxLength = options.maxLength;
      }
      
      if (options.additionalCommonPasswords) {
        options.additionalCommonPasswords.forEach(pwd => 
          this.commonPasswords.add(pwd.toLowerCase())
        );
      }
    }
  }

  /**
   * Valida a força da senha com base nas regras configuradas
   * @param password Senha a ser validada
   * @returns Resultado da validação com possíveis erros
   */
  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    
    // Verificar comprimento
    if (!password || password.length < this.minLength) {
      errors.push(`A senha deve ter pelo menos ${this.minLength} caracteres`);
    }
    
    if (password && password.length > this.maxLength) {
      errors.push(`A senha não pode ter mais de ${this.maxLength} caracteres`);
    }
    
    // Verificar complexidade
    if (password && !/[A-Z]/.test(password)) {
      errors.push("A senha deve conter pelo menos uma letra maiúscula");
    }
    
    if (password && !/[a-z]/.test(password)) {
      errors.push("A senha deve conter pelo menos uma letra minúscula");
    }
    
    if (password && !/[0-9]/.test(password)) {
      errors.push("A senha deve conter pelo menos um número");
    }
    
    if (password && !/[^A-Za-z0-9]/.test(password)) {
      errors.push("A senha deve conter pelo menos um caractere especial");
    }
    
    // Verificar se é uma senha comum
    if (password && this.commonPasswords.has(password.toLowerCase())) {
      errors.push("Esta senha é muito comum e fácil de adivinhar. Escolha uma senha mais única");
    }
    
    // Verificar padrões simples (sequências, repetições)
    if (password && this.hasSimplePatterns(password)) {
      errors.push("Evite usar padrões simples como sequências de teclas ou números");
    }
    
    // Verificar se a senha contém informações pessoais
    // (Esta verificação necessitaria de informações do usuário como nome, data de nascimento, etc.)
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Mede a força da senha numa escala de 0 a 100
   * @param password Senha a ser avaliada
   * @returns Pontuação de força (0-100)
   */
  measureStrength(password: string): number {
    if (!password) return 0;
    
    let score = 0;
    
    // Pontuação base pelo comprimento (até 30 pontos)
    score += Math.min(30, password.length * 2);
    
    // Uso de diferentes classes de caracteres (até 40 pontos)
    if (/[A-Z]/.test(password)) score += 10; // Maiúsculas
    if (/[a-z]/.test(password)) score += 10; // Minúsculas
    if (/[0-9]/.test(password)) score += 10; // Números
    if (/[^A-Za-z0-9]/.test(password)) score += 10; // Caracteres especiais
    
    // Penalidades
    
    // Senha comum (até -30 pontos)
    if (this.commonPasswords.has(password.toLowerCase())) {
      score -= 30;
    }
    
    // Padrões simples (até -20 pontos)
    if (this.hasSimplePatterns(password)) {
      score -= 20;
    }
    
    // Repetições (até -10 pontos)
    const repetitionPenalty = (password.length - new Set(password.split('')).size) * 2;
    score -= Math.min(10, repetitionPenalty);
    
    // Garantir que a pontuação esteja entre 0 e 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Obtém uma classificação da força da senha (fraca, média, forte, muito forte)
   * @param password Senha a ser classificada
   * @returns Classificação da força da senha
   */
  getStrengthLabel(password: string): string {
    const score = this.measureStrength(password);
    
    if (score < 30) return "muito fraca";
    if (score < 50) return "fraca";
    if (score < 75) return "média";
    if (score < 90) return "forte";
    return "muito forte";
  }

  /**
   * Gera sugestões de senhas fortes
   * @returns Uma senha forte aleatória
   */
  generateStrongPassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    
    // Comprimento aleatório entre 12 e 16 caracteres
    const length = 12 + Math.floor(Math.random() * 5);
    
    let password = '';
    
    // Garantir pelo menos um de cada categoria
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Preencher o resto da senha
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Embaralhar a senha (algoritmo Fisher-Yates)
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    
    return passwordArray.join('');
  }

  /**
   * Verifica se a senha contém padrões simples como sequências
   * @param password Senha a verificar
   * @returns True se contiver padrões simples
   */
  private hasSimplePatterns(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    
    // Sequências comuns de teclado
    const keyboardSequences = [
      'qwertyuiop', 'asdfghjkl', 'zxcvbnm', // Horizontal
      'qazwsx', 'wsxedc', 'edcrfv', 'rfvtgb', 'tgbyhn', 'yhnujm', // Vertical
      '1qaz', '2wsx', '3edc', '4rfv', '5tgb', '6yhn', '7ujm', // Diagonal
      '123456789', '987654321', 'abcdefghijklmnopqrstuvwxyz' // Numéricas/alfabéticas
    ];
    
    // Verificar sequências de teclado
    for (const seq of keyboardSequences) {
      for (let i = 0; i < seq.length - 2; i++) {
        const pattern = seq.substring(i, i + 3);
        if (lowerPassword.includes(pattern)) {
          return true;
        }
      }
    }
    
    // Verificar repetições de caracteres (3 ou mais)
    for (let i = 0; i < lowerPassword.length - 2; i++) {
      if (lowerPassword[i] === lowerPassword[i+1] && lowerPassword[i] === lowerPassword[i+2]) {
        return true;
      }
    }
    
    // Verificar sequências numéricas/alfabéticas (ascendentes e descendentes)
    for (let i = 0; i < lowerPassword.length - 2; i++) {
      const c1 = lowerPassword.charCodeAt(i);
      const c2 = lowerPassword.charCodeAt(i+1);
      const c3 = lowerPassword.charCodeAt(i+2);
      
      // Sequência ascendente (ex: "abc", "123")
      if (c2 === c1 + 1 && c3 === c2 + 1) {
        return true;
      }
      
      // Sequência descendente (ex: "cba", "321")
      if (c2 === c1 - 1 && c3 === c2 - 1) {
        return true;
      }
    }
    
    return false;
  }
}

// Instância singleton da política de senha
export const passwordPolicy = new PasswordPolicy();