import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Category as BaseCategory, GameWithDetails, User as UserType, insertCategorySchema } from "@shared/schema";

// Estendendo o tipo Category para incluir a contagem de jogos
type CategoryWithCount = BaseCategory & {
  gameCount?: number;
};
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ApprovalQueue from "@/components/admin/approval-queue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, AlertCircle, ShieldCheck, Plus, X, Trash2, Edit, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extend the category schema for validation
const categoryFormSchema = insertCategorySchema.extend({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  slug: z.string().min(3, { message: "Slug deve ter pelo menos 3 caracteres" }),
  iconName: z.string().min(1, { message: "Ícone é obrigatório" }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("pending");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithCount | null>(null);
  const [promoteUserDialogOpen, setPromoteUserDialogOpen] = useState(false);
  const [userToPromote, setUserToPromote] = useState<UserType | null>(null);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  
  // Fetch pending games
  const { data: pendingGames, isLoading: isLoadingGames } = useQuery<GameWithDetails[]>({
    queryKey: ["/api/admin/pending-games"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/pending-games");
      return res.json();
    },
    enabled: user?.role === "admin",
  });
  
  // Fetch approved games
  const { data: approvedGames, isLoading: isLoadingApprovedGames } = useQuery<GameWithDetails[]>({
    queryKey: ["/api/games"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/games?status=approved");
      return res.json();
    },
    enabled: user?.role === "admin",
  });
  
  // Fetch categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/categories");
      return res.json();
    },
    enabled: user?.role === "admin",
  });
  
  // Fetch users
  const { data: users, isLoading: isLoadingUsers } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
    enabled: user?.role === "admin",
  });
  
  // Redirect non-admin users
  if (user && user.role !== "admin") {
    navigate("/");
    return null;
  }
  
  // Se ainda estiver carregando o status de autenticação, mostrar indicador de carregamento
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Form for adding categories
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      iconName: ""
    }
  });
  
  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const res = await apiRequest("POST", "/api/categories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setCategoryDialogOpen(false);
      form.reset();
      toast({
        title: "Categoria criada",
        description: "A categoria foi adicionada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      await apiRequest("DELETE", `/api/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDeleteConfirmDialogOpen(false);
      setCategoryToDelete(null);
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleCategorySubmit = (data: CategoryFormValues) => {
    createCategoryMutation.mutate(data);
  };
  
  const confirmDeleteCategory = (category: CategoryWithCount) => {
    setCategoryToDelete(category);
    setDeleteConfirmDialogOpen(true);
  };
  
  const handleDeleteCategory = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete.id);
    }
  };
  
  // Promote user to admin mutation
  const promoteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/promote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setPromoteUserDialogOpen(false);
      setUserToPromote(null);
      toast({
        title: "Usuário promovido",
        description: "O usuário foi promovido a administrador com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao promover usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handlePromoteToAdmin = (selectedUser: UserType) => {
    setUserToPromote(selectedUser);
    setPromoteUserDialogOpen(true);
  };
  
  const handlePromoteUserConfirm = () => {
    if (userToPromote) {
      promoteUserMutation.mutate(userToPromote.id);
    }
  };
  
  const handleDeleteUserConfirm = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Painel de Administração</h1>
          <p className="text-gray-600">Gerencie e aprove submissões de jogos</p>
        </div>
        
        <div className="mb-6">
          <Card>
            <CardHeader className="bg-primary text-white">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <span>Controles de Administração</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Acesso Administrativo</AlertTitle>
                <AlertDescription>
                  Bem-vindo ao painel de administração. Aqui você pode revisar e gerenciar as submissões de jogos.
                  Certifique-se de que os jogos atendam às diretrizes de acessibilidade antes da aprovação.
                </AlertDescription>
              </Alert>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="pending" className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Aguardando Aprovação</span>
                    {pendingGames && pendingGames.length > 0 && (
                      <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                        {pendingGames.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Jogos Aprovados</span>
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex items-center gap-1">
                    <span>Gerenciar Categorias</span>
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-1">
                    <span>Gerenciar Usuários</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending">
                  <ApprovalQueue games={pendingGames || []} isLoading={isLoadingGames} />
                </TabsContent>
                
                <TabsContent value="approved">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">Jogos Aprovados</h3>
                      <p className="text-gray-500">Gerencie jogos que já foram aprovados e estão disponíveis no portal.</p>
                    </div>
                    <ApprovalQueue 
                      games={approvedGames || []} 
                      isLoading={isLoadingApprovedGames} 
                      showApprovedGames={true} 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="categories">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold">Categorias</h3>
                      <Button 
                        onClick={() => setCategoryDialogOpen(true)}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Nova Categoria</span>
                      </Button>
                    </div>
                    
                    {isLoadingCategories ? (
                      <div className="text-center py-8">Carregando categorias...</div>
                    ) : categories && categories.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Ícone</TableHead>
                            {/* Removido contador de jogos */}
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...categories]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((category) => (
                              <TableRow key={category.id}>
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell>{category.slug}</TableCell>
                                <TableCell>{category.iconName}</TableCell>
                                {/* Célula de contagem de jogos removida */}
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => confirmDeleteCategory(category)}
                                    title="Excluir categoria"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 border rounded-lg">
                        <p className="text-gray-500 mb-4">Nenhuma categoria encontrada</p>
                        <Button onClick={() => setCategoryDialogOpen(true)}>
                          Criar Categoria
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="users">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold">Gerenciar Usuários</h3>
                    </div>
                    
                    {isLoadingUsers ? (
                      <div className="text-center py-8">Carregando usuários...</div>
                    ) : users && users.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nome de Usuário</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.id}</TableCell>
                              <TableCell className="font-medium">{user.username}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'admin' ? "default" : "secondary"}>
                                  {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {user.role !== 'admin' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handlePromoteToAdmin(user)}
                                      disabled={promoteUserMutation.isPending}
                                      className="flex items-center gap-1"
                                    >
                                      <ShieldCheck className="h-4 w-4" />
                                      <span>Promover a Admin</span>
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setDeleteUserDialogOpen(true);
                                    }}
                                    title="Excluir usuário"
                                    disabled={user.role === 'admin'}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 border rounded-lg">
                        <p className="text-gray-500">Nenhum usuário encontrado</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Add Category Dialog */}
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Categoria</DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCategorySubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Aventura" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: aventura" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="iconName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ícone</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome do ícone (ex: crown)" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCategoryDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createCategoryMutation.isPending}
                        >
                          {createCategoryMutation.isPending ? "Adicionando..." : "Adicionar Categoria"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              {/* Confirm Delete Dialog */}
              <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Excluir Categoria</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p>Tem certeza que deseja excluir a categoria <strong>{categoryToDelete?.name}</strong>?</p>
                    <p className="text-gray-500 mt-2 text-sm">Esta ação não pode ser desfeita.</p>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDeleteConfirmDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleDeleteCategory}
                      disabled={deleteCategoryMutation.isPending}
                    >
                      {deleteCategoryMutation.isPending ? "Excluindo..." : "Excluir"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Confirm Promote User Dialog */}
              <Dialog open={promoteUserDialogOpen} onOpenChange={setPromoteUserDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Promover Usuário</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p>Você está prestes a promover <strong>{userToPromote?.username}</strong> para administrador.</p>
                    <p className="text-gray-500 mt-2 text-sm">Administradores podem gerenciar categorias, aprovar/rejeitar jogos e promover outros usuários.</p>
                    <div className="bg-yellow-50 p-3 rounded-md mt-3 border border-yellow-200 text-yellow-800">
                      <p className="font-medium">⚠️ Atenção:</p>
                      <p className="text-sm mt-1">Esta ação concederá permissões administrativas completas ao usuário.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPromoteUserDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      variant="default"
                      onClick={handlePromoteUserConfirm}
                      disabled={promoteUserMutation.isPending}
                    >
                      {promoteUserMutation.isPending ? "Promovendo..." : "Confirmar Promoção"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Confirm Delete User Dialog */}
              <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Excluir Usuário</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p>Tem certeza que deseja excluir o usuário <strong>{userToDelete?.username}</strong>?</p>
                    <p className="text-gray-500 mt-2 text-sm">Esta ação não pode ser desfeita e também excluirá todos os jogos associados a este usuário.</p>
                    <div className="bg-red-50 p-3 rounded-md mt-3 border border-red-200 text-red-800">
                      <p className="font-medium">⚠️ Alerta:</p>
                      <p className="text-sm mt-1">A exclusão de usuários é uma operação permanente e não pode ser revertida.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDeleteUserDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleDeleteUserConfirm}
                      disabled={deleteUserMutation.isPending}
                    >
                      {deleteUserMutation.isPending ? "Excluindo..." : "Excluir Usuário"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
