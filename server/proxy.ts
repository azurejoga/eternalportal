import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { cryptoService } from './crypto';

/**
 * Serviço de proxy para garantir que requisições sensíveis sejam
 * processadas no servidor e não diretamente do cliente
 * 
 * Este módulo implementa:
 * 1. Proxy reverso para APIs externas
 * 2. Sanitização e validação de dados
 * 3. Cache de resultados
 * 4. Tratamento de erros uniforme
 */

// Definindo tipos para o cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

// Schema para validação da requisição de proxy
const proxyRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  cacheTime: z.number().min(0).max(3600).optional(), // Cache em segundos, máximo 1 hora
});

class ServerProxy {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheSize: number = 100; // Limite máximo de entradas no cache
  private cacheTTL: number = 300; // TTL padrão em segundos (5 minutos)

  /**
   * Proxy para APIs externas - realiza requisições a partir do servidor
   * ao invés de expor a API diretamente para o cliente
   */
  async proxyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      // Validar dados de entrada
      const validation = proxyRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Dados de requisição inválidos',
          errors: validation.error.errors
        });
      }
      
      const { url, method, headers = {}, body, cacheTime } = validation.data;
      
      // Verificar domínios permitidos (whitelist)
      const allowedDomains = [
        'api.example.com',
        'data.example.org',
        // Adicione outros domínios confiáveis conforme necessário
      ];
      
      const urlObj = new URL(url);
      if (!allowedDomains.includes(urlObj.hostname)) {
        return res.status(403).json({
          message: 'Domínio não autorizado para proxy'
        });
      }
      
      // Para requisições GET, verificar cache
      if (method === 'GET' && (cacheTime || this.cacheTTL > 0)) {
        const cacheKey = this.generateCacheKey(url, method);
        const cachedData = this.getFromCache(cacheKey);
        
        if (cachedData) {
          return res.json({
            data: cachedData,
            fromCache: true
          });
        }
      }
      
      // Limitar o tamanho do conteúdo
      const contentLimit = 10 * 1024 * 1024; // 10MB
      if (body && JSON.stringify(body).length > contentLimit) {
        return res.status(413).json({
          message: 'Conteúdo muito grande para processamento via proxy'
        });
      }
      
      // Adicionar cabeçalhos de segurança
      const secureHeaders = {
        ...headers,
        'X-Proxy-Request': 'true',
        'X-Forwarded-For': req.ip || 'unknown'
      };
      
      // Fazer a requisição através do servidor
      const response = await axios({
        url,
        method,
        headers: secureHeaders,
        data: body,
        timeout: 30000, // 30 segundos de timeout
        maxContentLength: contentLimit,
        validateStatus: () => true // Não lançar erros para códigos de status HTTP
      });
      
      // Salvar no cache se for uma requisição GET bem-sucedida
      if (method === 'GET' && response.status >= 200 && response.status < 300) {
        const cacheKey = this.generateCacheKey(url, method);
        const ttl = cacheTime || this.cacheTTL;
        
        if (ttl > 0) {
          this.addToCache(cacheKey, response.data);
          
          // Limitar tamanho do cache
          if (this.cache.size > this.cacheSize) {
            const oldestKey = this.findOldestCacheEntry();
            if (oldestKey) {
              this.cache.delete(oldestKey);
            }
          }
        }
      }
      
      // Retornar a resposta para o cliente
      res.status(response.status).json({
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        fromCache: false
      });
      
    } catch (error: any) {
      console.error('Erro no proxy:', error.message);
      
      // Registro seguro do erro
      const errorId = cryptoService.generateSecureToken(8);
      console.error(`[Erro Proxy ${errorId}]`, error);
      
      res.status(500).json({
        message: 'Erro ao processar requisição via proxy',
        errorId
      });
    }
  }

  /**
   * Gera uma chave única para armazenamento no cache
   */
  private generateCacheKey(url: string, method: string, body?: any): string {
    const parts = [method, url];
    
    if (body) {
      parts.push(JSON.stringify(body));
    }
    
    return cryptoService.hash(parts.join('|'));
  }

  /**
   * Recupera dados do cache se ainda forem válidos
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    const maxAge = this.cacheTTL * 1000; // Converter para milissegundos
    
    if (now - entry.timestamp > maxAge) {
      // Entrada expirada
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Adiciona dados ao cache
   */
  private addToCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Encontra a entrada mais antiga no cache
   */
  private findOldestCacheEntry(): string | null {
    if (this.cache.size === 0) {
      return null;
    }
    
    let oldestKey = null;
    let oldestTime = Infinity;
    
    // Iteração em formato compatível com todos os ambientes
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });
    
    return oldestKey;
  }

  /**
   * Limpa todo o cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const serverProxy = new ServerProxy();

/**
 * Middleware para cadastrar as rotas do proxy
 */
export function setupProxyRoutes(app: any) {
  // Rota principal do proxy
  app.post('/api/proxy', (req: Request, res: Response, next: NextFunction) => {
    serverProxy.proxyRequest(req, res, next);
  });
  
  // Rota para limpar o cache
  app.post('/api/proxy/clear-cache', (_req: Request, res: Response) => {
    serverProxy.clearCache();
    res.json({ message: 'Cache limpo com sucesso' });
  });
}