import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: Omit<SelectUser, "password"> | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<SelectUser, "password">, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<Omit<SelectUser, "password"> | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: async ({ queryKey }) => {
      try {
        const res = await apiRequest("GET", queryKey[0] as string);
        return await res.json();
      } catch (error) {
        if (error instanceof Error && error.message.includes("401")) {
          return null;
        }
        throw error;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      // Atualizar o usuário no cache
      queryClient.setQueryData(["/api/user"], userData);
      
      toast({
        title: "Login bem-sucedido",
        description: "Bem-vindo de volta!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      // Atualizar o usuário no cache
      queryClient.setQueryData(["/api/user"], userData);
      
      toast({
        title: "Registro bem-sucedido",
        description: "Sua conta foi criada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // Obter o token CSRF mais recente
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('XSRF-TOKEN='))
          ?.split('=')[1];
          
        // Fazer a requisição com o token CSRF no header e no corpo
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
          },
          body: JSON.stringify({ _csrf: csrfToken }),
          credentials: 'include'
        });
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
      }
    },
    onSuccess: () => {
      // Limpar o usuário do cache
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
    },
    onError: (error: Error) => {
      // Mesmo com erro, remover o usuário do cache local
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logout realizado", // Mensagem positiva mesmo com erro
        description: "Você saiu da sua conta.",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
