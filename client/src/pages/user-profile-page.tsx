import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User, GameWithDetails } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gamepad2, Download, Calendar, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  bio: string | null;
  createdAt: string;
  games: GameWithDetails[];
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [bio, setBio] = useState("");
  const [bioDialogOpen, setBioDialogOpen] = useState(false);
  
  const { data: userProfile, isLoading } = useQuery<UserProfileResponse>({
    queryKey: [`/api/users/${id}/profile`],
  });

  // Atualiza a bio quando o perfil é carregado
  useEffect(() => {
    if (userProfile && currentUser?.id === userProfile.id) {
      setBio(userProfile.bio || "");
    }
  }, [userProfile, currentUser]);
  
  const updateBioMutation = useMutation({
    mutationFn: async (newBio: string) => {
      const res = await apiRequest("PATCH", "/api/users/profile", { bio: newBio });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${id}/profile`] });
      toast({
        title: "Perfil atualizado",
        description: "Sua biografia foi atualizada com sucesso",
      });
      setBioDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleUpdateBio = () => {
    updateBioMutation.mutate(bio);
  };
  
  // Calculate member since date
  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
    : "";
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="md:w-1/4">
                  <Skeleton className="h-64 w-full" />
                </div>
                <div className="md:w-3/4 space-y-6">
                  <Skeleton className="h-10 w-1/3" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-8 w-1/4" />
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!userProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-6 text-center">
              <h1 className="text-2xl font-bold mb-4">Usuário não encontrado</h1>
              <p className="mb-6">O perfil de usuário que você está procurando não existe.</p>
              <Button asChild>
                <Link href="/">Voltar para o Início</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }
  
  const canEditProfile = currentUser?.id === userProfile.id;
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <section id="user-profile" className="mb-10">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="md:w-1/4">
                  <div className="bg-gray-100 rounded-lg p-6 text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-primary text-white text-3xl font-bold rounded-full mb-4">
                      {userProfile.username.substring(0, 2).toUpperCase()}
                    </div>
                    <h2 className="text-xl font-bold mb-1">{userProfile.username}</h2>
                    <p className="text-gray-600 mb-4">
                      {userProfile.role === "admin" ? "Administrador" : "Desenvolvedor"} | Membro desde {memberSince}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1 text-gray-600">
                        <Gamepad2 className="h-4 w-4" />
                        <span>{userProfile.games.length} jogos publicados</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-gray-600">
                        <Download className="h-4 w-4" />
                        <span>Total de Downloads: {userProfile.games.length > 0 ? userProfile.games.length * 10 : 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="md:w-3/4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Perfil do Desenvolvedor</h2>
                    {canEditProfile && (
                      <Dialog open={bioDialogOpen} onOpenChange={setBioDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <Edit className="h-4 w-4" />
                            <span>Editar Bio</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar sua Biografia</DialogTitle>
                          </DialogHeader>
                          <Textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Conte-nos sobre você..."
                            rows={6}
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setBioDialogOpen(false)}>Cancelar</Button>
                            <Button 
                              onClick={handleUpdateBio}
                              disabled={updateBioMutation.isPending}
                            >
                              {updateBioMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Salvando...
                                </>
                              ) : "Salvar Alterações"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Sobre</h3>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      {userProfile.bio ? (
                        <div className="whitespace-pre-wrap text-gray-700">
                          {userProfile.bio}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">
                          {canEditProfile 
                            ? "Você ainda não adicionou uma biografia. Clique em 'Editar Bio' para falar sobre você."
                            : "Este usuário ainda não adicionou uma biografia."}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Jogos Publicados</h3>
                    {userProfile.games.length > 0 ? (
                      <div className="space-y-4">
                        {userProfile.games.map((game: GameWithDetails) => (
                          <div key={game.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start">
                              <div className="flex-grow">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h4 className="font-semibold">
                                    <Link 
                                      href={`/games/${game.id}`} 
                                      className="hover:text-primary focus:outline-none focus:text-primary"
                                    >
                                      {game.title}
                                    </Link>
                                  </h4>
                                  {game.category && (
                                    <Badge variant="secondary">{game.category.name}</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(game.createdAt).toLocaleDateString()}
                                  </span>
                                  <span>|</span>
                                  <span>v{game.version}</span>
                                </div>
                              </div>
                              <Button asChild variant="default" size="sm">
                                <Link href={`/games/${game.id}`}>Ver</Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 border rounded-md bg-gray-50">
                        <p className="text-gray-500 mb-2">Este usuário ainda não publicou nenhum jogo.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
