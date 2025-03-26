import { useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { GameWithDetails } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  
  const { data: game, isLoading, error } = useQuery<GameWithDetails>({
    queryKey: [`/api/games/${id}`],
    enabled: !!id,
  });
  
  useEffect(() => {
    if (error) {
      navigate("/games");
    }
  }, [error, navigate]);
  
  // Handle previous/next game navigation (simplified version)
  const handleNavigate = (direction: 'prev' | 'next') => {
    const gameId = parseInt(id);
    if (isNaN(gameId)) return;
    
    const newId = direction === 'prev' ? gameId - 1 : gameId + 1;
    if (newId > 0) {
      navigate(`/games/${newId}`);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-6">
          <section className="mb-10">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="border-t border-b py-4">
                    <Skeleton className="h-6 w-1/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-6 w-1/4 mb-2" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!game) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-6">
          <section className="mb-10">
            <Card>
              <CardContent className="p-6 text-center">
                <h1 className="text-2xl font-bold mb-4">Jogo não encontrado</h1>
                <p className="mb-6">O jogo que você está procurando não existe ou foi removido.</p>
                <Button asChild>
                  <Link href="/games">Voltar para Jogos</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
        <Footer />
      </div>
    );
  }
  
  const formatLanguage = (lang: string | null) => {
    if (!lang) return 'Desconhecido';
    
    switch (lang) {
      case 'portuguese': return 'Português';
      case 'english': return 'Inglês';
      case 'spanish': return 'Espanhol';
      case 'french': return 'Francês';
      case 'german': return 'Alemão';
      case 'italian': return 'Italiano';
      case 'japanese': return 'Japonês';
      case 'chinese': return 'Chinês';
      case 'russian': return 'Russo';
      case 'korean': return 'Coreano';
      case 'other': return 'Outro';
      default: return 'Desconhecido';
    }
  };
  
  const formatOS = (os: string) => {
    switch (os) {
      case 'windows': return 'Windows';
      case 'macos': return 'macOS';
      case 'linux': return 'Linux';
      case 'android': return 'Android';
      case 'ios': return 'iOS';
      case 'steam': return 'Steam';
      case 'browser': return 'Navegador';
      default: return os;
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <section id="game-detail" className="mb-10">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <nav className="mb-4" aria-label="Breadcrumb">
              <ol className="flex text-sm">
                <li className="flex items-center">
                  <Link href="/" className="text-primary hover:underline focus:outline-none focus:underline">Início</Link>
                  <span className="mx-2 text-gray-400">/</span>
                </li>
                <li className="flex items-center">
                  <Link href="/games" className="text-primary hover:underline focus:outline-none focus:underline">Jogos</Link>
                  <span className="mx-2 text-gray-400">/</span>
                </li>
                {game.category && (
                  <li className="flex items-center">
                    <Link 
                      href={`/games?category=${game.category.id}`} 
                      className="text-primary hover:underline focus:outline-none focus:underline"
                    >
                      {game.category.name}
                    </Link>
                    <span className="mx-2 text-gray-400">/</span>
                  </li>
                )}
                <li className="text-gray-600" aria-current="page">{game.title}</li>
              </ol>
            </nav>
            
            <div className="mb-6">
              <div className="flex flex-col gap-3 mb-4">
                <h1 className="text-2xl font-bold">{game.title}</h1>
                
                {game.alternativeTitle && (
                  <div className="text-gray-600">
                    <strong>Também conhecido como:</strong> {game.alternativeTitle}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <strong className="text-gray-700">Categoria:</strong>
                  {game.category ? (
                    <Badge variant="secondary">{game.category.name}</Badge>
                  ) : (
                    <span className="text-gray-500">Sem categoria</span>
                  )}
                </div>
                
                <div>
                  <strong className="text-gray-700">Versão:</strong> <span className="text-gray-600">{game.version}</span>
                </div>
                
                <div className="text-gray-700">
                  <div className="mb-1">
                    <strong>Idiomas disponíveis:</strong>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-2">
                    <Badge variant="outline" className="bg-primary/10">
                      {formatLanguage(game.language)}
                      <span className="ml-1 text-xs">(Principal)</span>
                    </Badge>
                    
                    {game.additionalLanguages && game.additionalLanguages.split(',')
                      .filter(lang => lang !== game.language && lang.trim() !== '')
                      .map((lang) => (
                        <Badge key={lang} variant="outline">
                          {formatLanguage(lang)}
                        </Badge>
                      ))}
                  </div>
                </div>
                
                <div className="text-gray-700">
                  <strong>Publicado por: </strong>
                  {game.user ? (
                    <Link 
                      href={`/users/${game.user.id}`} 
                      className="text-primary hover:underline"
                    >
                      {game.user.username}
                    </Link>
                  ) : (
                    "Usuário desconhecido"
                  )}
                </div>
                
                <div className="text-gray-700">
                  <strong>Data de publicação:</strong> {new Date(game.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="mb-6 border-t border-b py-4">
              <h2 className="text-lg font-semibold mb-2">Descrição</h2>
              <div className="space-y-3 text-gray-700">
                {game.description.split("\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Links de Download</h2>
              <div className="space-y-3">
                {game.downloadLinks && game.downloadLinks.length > 0 ? (
                  game.downloadLinks.map((link) => (
                    <div key={link.id} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="font-medium">
                            {formatOS(link.os)}
                          </div>
                          {link.fileSize && (
                            <div className="text-sm text-gray-600">
                              Tamanho: {link.fileSize} | Versão: {game.version}
                            </div>
                          )}
                        </div>
                        <Button asChild className="bg-green-600 hover:bg-green-700">
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Baixar
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-gray-500">
                      Nenhum link de download disponível para este jogo ainda.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {game.systemRequirements && (
              <div className="mb-6 border-t pt-4">
                <h2 className="text-lg font-semibold mb-3">Requisitos do Sistema</h2>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {game.systemRequirements}
                </div>
              </div>
            )}
            
            {/* Navigation between games */}
            <div className="flex flex-wrap justify-between mt-8 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => handleNavigate('prev')}
                className="mb-2 sm:mb-0"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Jogo Anterior
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleNavigate('next')}
              >
                Próximo Jogo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
