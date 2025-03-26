import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Interface para requisições via proxy
export interface ProxyRequestOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  cacheTime?: number; // Tempo de cache em segundos
}

/**
 * Função para fazer requisições via proxy do servidor
 * Garante que requisições sensíveis sejam processadas pelo servidor
 */
export async function proxyRequest<T = any>(options: ProxyRequestOptions): Promise<T> {
  const response = await apiRequest('POST', '/api/proxy', options);
  const result = await response.json();
  
  if (result.status >= 400) {
    throw new Error(`Erro na requisição proxy: ${result.statusText || 'Erro desconhecido'}`);
  }
  
  return result.data;
}

// Função para obter o token CSRF do cookie
function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith('csrf_token=')) {
      return cookie.substring('csrf_token='.length, cookie.length);
    }
  }
  return null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Obter o token CSRF
  const csrfToken = getCsrfToken();
  
  // Preparar os headers com o content-type para JSONs e CSRF token
  const headers: HeadersInit = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
  };
  
  // Para POST/PUT/DELETE, incluir também no corpo da requisição
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (!safeMethods.includes(method.toUpperCase()) && data && typeof data === 'object') {
    data = {
      ...data as object,
      _csrf: csrfToken
    };
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Incluir cookies para autenticação baseada em sessão
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Obter CSRF token
    const csrfToken = getCsrfToken();
    const headers: HeadersInit = csrfToken ? { "X-CSRF-Token": csrfToken } : {};
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include", // Incluir cookies para autenticação baseada em sessão
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
