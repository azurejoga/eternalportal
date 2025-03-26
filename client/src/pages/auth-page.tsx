import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, { message: "Nome de usuário ou e-mail é obrigatório" }),
  password: z.string().min(1, { message: "Senha é obrigatória" }),
});

// Registration schema (reuse from shared schema)
const registrationSchema = insertUserSchema.extend({
  password: z.string()
    .min(8, { message: "A senha deve ter pelo menos 8 caracteres" })
    .regex(/[a-z]/, { message: "A senha deve conter pelo menos uma letra minúscula" })
    .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula" })
    .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número" })
    .regex(/[^a-zA-Z0-9]/, { message: "A senha deve conter pelo menos um símbolo" }),
  confirmPassword: z.string().min(1, { message: "Por favor, confirme sua senha" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegistrationFormValues = z.infer<typeof registrationSchema>;

// Esquema para formulário de redefinição de senha
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Digite um e-mail válido" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Registration form
  const registrationForm = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Formulário de redefinição de senha 
  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // If user is already logged in, redirect to home page
  if (user) {
    navigate("/");
    return null;
  }

  const onLoginSubmit = async (data: LoginFormValues) => {
    await loginMutation.mutateAsync(data);
  };

  const onRegisterSubmit = async (data: RegistrationFormValues) => {
    const { confirmPassword, ...userData } = data;
    await registerMutation.mutateAsync(userData);
  };
  
  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await apiRequest('POST', '/api/forgot-password', data);
      setResetEmailSent(true);
      
      toast({
        title: "E-mail enviado",
        description: "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
      });
    } catch (error) {
      // Mesmo com erro, exibimos mensagem de sucesso para não revelar quais e-mails estão cadastrados
      setResetEmailSent(true);
      
      toast({
        title: "E-mail enviado",
        description: "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          {/* Auth form */}
          <div>
            <Card className="w-full max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">Bem-vindo ao Eternal Legend</CardTitle>
                <CardDescription className="text-center">
                  Entre para acessar a comunidade de jogos acessíveis para cegos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="register">Cadastrar</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome de usuário ou E-mail</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite seu usuário ou e-mail" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Entrando...
                            </>
                          ) : (
                            "Entrar"
                          )}
                        </Button>
                        
                        <div className="mt-2 text-center">
                          <Button 
                            type="button" 
                            variant="link" 
                            className="text-sm text-primary hover:underline"
                            onClick={() => setForgotPasswordModalOpen(true)}
                          >
                            Esqueceu sua senha?
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </TabsContent>
                  
                  <TabsContent value="register">
                    <Form {...registrationForm}>
                      <form onSubmit={registrationForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        <FormField
                          control={registrationForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome de usuário</FormLabel>
                              <FormControl>
                                <Input placeholder="Escolha um nome de usuário" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registrationForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-mail</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="seu@email.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registrationForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormDescription>
                                Mínimo de 8 caracteres, pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registrationForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirmar Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Cadastrando...
                            </>
                          ) : (
                            "Criar Conta"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-gray-500">
                  {activeTab === "login" ? (
                    <>
                      Não tem uma conta?{" "}
                      <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("register")}>
                        Cadastre-se
                      </Button>
                    </>
                  ) : (
                    <>
                      Já tem uma conta?{" "}
                      <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("login")}>
                        Entrar
                      </Button>
                    </>
                  )}
                </p>
              </CardFooter>
            </Card>
          </div>
          
          {/* Hero section */}
          <div className="hidden md:block p-8 bg-primary text-white rounded-lg">
            <h1 className="text-3xl font-bold mb-4">Eternal Legend</h1>
            <h2 className="text-xl mb-6">Portal de Jogos para Cegos</h2>
            <p className="mb-6">
              Junte-se à nossa comunidade dedicada a tornar os jogos acessíveis para todos. 
              Descubra, baixe e compartilhe jogos especialmente projetados 
              para jogadores cegos, com recursos de áudio detalhados e compatibilidade com leitores de tela.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Acesso a centenas de jogos acessíveis</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Publique seus próprios jogos acessíveis</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Conecte-se com uma comunidade de jogadores cegos</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Todos os jogos são avaliados quanto à acessibilidade</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* Modal de Redefinição de Senha */}
      <Dialog open={forgotPasswordModalOpen} onOpenChange={setForgotPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu e-mail para receber instruções para redefinir sua senha.
            </DialogDescription>
          </DialogHeader>
          
          {resetEmailSent ? (
            <div className="py-6 space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Enviamos um e-mail com instruções para redefinir sua senha. 
                  Verifique sua caixa de entrada e siga as instruções.
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button 
                  onClick={() => {
                    setForgotPasswordModalOpen(false); 
                    setResetEmailSent(false);
                    forgotPasswordForm.reset();
                  }}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4 py-4">
                <FormField
                  control={forgotPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="seu@email.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Informe o e-mail associado à sua conta.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForgotPasswordModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Enviar Instruções
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
