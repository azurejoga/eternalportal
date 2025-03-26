import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Category, GameWithDetails } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import GameCard from "@/components/games/game-card";
import GameFilter from "@/components/games/game-filter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

// Extendendo o tipo Category para incluir gameCount
type CategoryWithCount = Category & {
  gameCount?: number;
};

type FilterOptions = {
  categoryId?: number;
  sortBy?: string;
  language?: string;
  platform?: string;
  limit: number;
  offset: number;
};

export default function GamesPage() {
  const [location, setLocation] = useLocation();
  // Extract search params from URL
  const query = new URLSearchParams(window.location.search);
  
  // Parse URL query parameters
  const initialCategoryId = query.get("category") ? parseInt(query.get("category")!) : undefined;
  const initialSortBy = query.get("sort") || "newest";
  const initialLanguage = query.get("language") || undefined;
  const initialPlatform = query.get("platform") || undefined;
  const initialPage = query.get("page") ? parseInt(query.get("page")!) : 1;
  const initialLimit = query.get("limit") ? parseInt(query.get("limit")!) : 10;
  
  // State for filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categoryId: initialCategoryId,
    sortBy: initialSortBy,
    language: initialLanguage,
    platform: initialPlatform,
    limit: initialLimit,
    offset: (initialPage - 1) * initialLimit
  });
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalGames, setTotalGames] = useState(0);
  
  // Fetch categories
  const { data: categories } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Fetch games with filters
  const { data: games, isLoading } = useQuery<GameWithDetails[]>({
    queryKey: ["/api/games", filterOptions],
    queryFn: async ({ queryKey }) => {
      const [_, options] = queryKey;
      const { categoryId, sortBy, language, platform, limit, offset } = options as FilterOptions;
      
      const params = new URLSearchParams();
      params.append("status", "approved");
      if (categoryId) params.append("categoryId", categoryId.toString());
      if (sortBy) params.append("sortBy", sortBy);
      if (language) params.append("language", language);
      if (platform) params.append("platform", platform);
      if (limit) params.append("limit", limit.toString());
      if (offset !== undefined) params.append("offset", offset.toString());
      
      const res = await fetch(`/api/games?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch games");
      
      // Usar o número real de jogos retornados
      const data = await res.json();
      setTotalGames(data.length);
      return data;
    },
  });
  
  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filterOptions.categoryId) newParams.set("category", filterOptions.categoryId.toString());
    if (filterOptions.sortBy) newParams.set("sort", filterOptions.sortBy);
    if (filterOptions.language) newParams.set("language", filterOptions.language);
    if (filterOptions.platform) newParams.set("platform", filterOptions.platform);
    if (currentPage > 1) newParams.set("page", currentPage.toString());
    if (filterOptions.limit !== 10) newParams.set("limit", filterOptions.limit.toString());
    
    setLocation(`/games?${newParams.toString()}`);
  }, [filterOptions, currentPage, setLocation]);
  
  // Handle filter changes
  const handleFilterChange = (newOptions: Partial<FilterOptions>) => {
    setFilterOptions(prev => ({
      ...prev,
      ...newOptions,
      offset: 0 // Reset offset when filters change
    }));
    setCurrentPage(1); // Reset to first page
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setFilterOptions(prev => ({
      ...prev,
      offset: (page - 1) * prev.limit
    }));
  };
  
  // Calculate total pages
  const totalPages = Math.ceil(totalGames / filterOptions.limit);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <section id="games" className="mb-10">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6">Procurar Jogos</h1>
            
            <GameFilter 
              categories={categories || []}
              initialCategoryId={filterOptions.categoryId}
              initialSortBy={filterOptions.sortBy}
              initialLimit={filterOptions.limit}
              initialLanguage={filterOptions.language}
              initialPlatform={filterOptions.platform}
              onFilterChange={handleFilterChange}
            />
            
            <div className="mb-4 mt-6">
              <h2 className="text-xl font-semibold mb-2">
                Resultados
              </h2>
            </div>
            
            <div className="space-y-6">
              {isLoading ? (
                Array(filterOptions.limit).fill(0).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full" />
                ))
              ) : games && games.length > 0 ? (
                games.map(game => (
                  <GameCard key={game.id} game={game} variant="full" />
                ))
              ) : (
                <div className="text-center p-10 border rounded-lg">
                  <p className="text-gray-500 mb-4">Nenhum jogo encontrado com os critérios selecionados.</p>
                  <Button onClick={() => handleFilterChange({ 
                    categoryId: undefined, 
                    sortBy: "newest", 
                    language: undefined,
                    platform: undefined
                  })}>
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Logic to show pages around current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={pageNum === currentPage}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
            
            {/* Informação de paginação foi removida a pedido do usuário */}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
