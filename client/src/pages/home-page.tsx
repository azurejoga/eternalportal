import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Category, GameWithDetails } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import GameCard from "@/components/games/game-card";
import CategoryCard from "@/components/games/category-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Gamepad2, Upload } from "lucide-react";

// Extendendo o tipo Category para incluir gameCount
type CategoryWithCount = Category & {
  gameCount?: number;
};

export default function HomePage() {
  const { data: latestGames, isLoading: isLoadingGames } = useQuery<GameWithDetails[]>({
    queryKey: ["/api/games/latest"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories"],
    refetchOnMount: true, 
    refetchOnWindowFocus: true,
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        {/* Hero Section */}
        <section className="mb-10">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold mb-4">Portal de Jogos para Cegos - Eternal Legend</h1>
            <p className="mb-6">Bem-vindo ao maior portal de jogos acessíveis para pessoas com deficiência visual. Descubra, compartilhe e publique jogos que são totalmente acessíveis para jogadores cegos.</p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="flex items-center gap-2">
                <Link href="/games">
                  <Gamepad2 className="h-5 w-5" />
                  <span>Explorar Jogos</span>
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="flex items-center gap-2">
                <Link href="/publish">
                  <Upload className="h-5 w-5" />
                  <span>Publicar um Jogo</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Latest Games Section */}
        <section className="mb-10" id="latest-games">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Últimos Jogos Publicados</h2>
              <Button asChild variant="link">
                <Link href="/games">Ver todos</Link>
              </Button>
            </div>
            
            <div className="space-y-6">
              {isLoadingGames ? (
                Array(5).fill(0).map((_, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-start">
                      <div className="flex-grow">
                        <Skeleton className="h-6 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                      <Skeleton className="h-10 w-20 ml-2" />
                    </div>
                  </div>
                ))
              ) : latestGames && latestGames.length > 0 ? (
                latestGames.map(game => (
                  <GameCard key={game.id} game={game} variant="compact" />
                ))
              ) : (
                <div className="text-center p-6 border rounded-lg">
                  <p className="text-gray-500">No games available yet. Be the first to publish one!</p>
                  <Button asChild className="mt-4">
                    <Link href="/publish">Publish a Game</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="mb-10">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Categorias</h2>
            
            {isLoadingCategories ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array(8).fill(0).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map(category => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            ) : (
              <div className="text-center p-6 border rounded-lg">
                <p className="text-gray-500">No categories available yet.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
