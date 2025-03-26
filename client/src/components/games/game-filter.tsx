import { useState, FormEvent } from "react";
import { Category, languageEnum, osEnum } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Extendendo o tipo Category para incluir gameCount
type CategoryWithCount = Category & {
  gameCount?: number;
};

interface GameFilterProps {
  categories: CategoryWithCount[];
  initialCategoryId?: number;
  initialSortBy?: string;
  initialLimit?: number;
  initialLanguage?: string;
  initialPlatform?: string;
  onFilterChange: (options: {
    categoryId?: number;
    sortBy?: string;
    limit?: number;
    language?: string;
    platform?: string;
  }) => void;
}

export default function GameFilter({
  categories,
  initialCategoryId,
  initialSortBy = "newest",
  initialLimit = 10,
  initialLanguage = "all",
  initialPlatform = "all",
  onFilterChange,
}: GameFilterProps) {
  const [categoryId, setCategoryId] = useState<number | undefined>(initialCategoryId);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [limit, setLimit] = useState(initialLimit);
  const [language, setLanguage] = useState(initialLanguage);
  const [platform, setPlatform] = useState(initialPlatform);
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onFilterChange({
      categoryId,
      sortBy,
      limit,
      language: language === "all" ? undefined : language,
      platform: platform === "all" ? undefined : platform,
    });
  };
  
  // Mapeamento para nomes amigáveis de plataformas
  const platformLabels: Record<string, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
    android: "Android",
    ios: "iOS",
    steam: "Steam",
    browser: "Navegador"
  };
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className="mb-6 bg-gray-50 p-4 rounded-md border"
      aria-label="Game filters"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
        <div>
          <Label htmlFor="category-filter" className="block text-gray-700 font-medium mb-2">
            Categoria
          </Label>
          <Select
            value={categoryId?.toString() || "all"}
            onValueChange={(value) => setCategoryId(value !== "all" ? parseInt(value) : undefined)}
          >
            <SelectTrigger id="category-filter" className="w-full">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="language-filter" className="block text-gray-700 font-medium mb-2">
            Idioma
          </Label>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value)}
          >
            <SelectTrigger id="language-filter" className="w-full">
              <SelectValue placeholder="Todos os idiomas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os idiomas</SelectItem>
              <SelectItem value="portuguese">Português</SelectItem>
              <SelectItem value="english">Inglês</SelectItem>
              <SelectItem value="spanish">Espanhol</SelectItem>
              <SelectItem value="french">Francês</SelectItem>
              <SelectItem value="german">Alemão</SelectItem>
              <SelectItem value="italian">Italiano</SelectItem>
              <SelectItem value="japanese">Japonês</SelectItem>
              <SelectItem value="chinese">Chinês</SelectItem>
              <SelectItem value="russian">Russo</SelectItem>
              <SelectItem value="korean">Coreano</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="platform-filter" className="block text-gray-700 font-medium mb-2">
            Plataforma
          </Label>
          <Select
            value={platform}
            onValueChange={(value) => setPlatform(value)}
          >
            <SelectTrigger id="platform-filter" className="w-full">
              <SelectValue placeholder="Todas as plataformas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as plataformas</SelectItem>
              {Object.entries(platformLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="sort-filter" className="block text-gray-700 font-medium mb-2">
            Ordenar por
          </Label>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value)}
          >
            <SelectTrigger id="sort-filter" className="w-full">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="title_asc">Nome (A-Z)</SelectItem>
              <SelectItem value="title_desc">Nome (Z-A)</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="items-per-page" className="block text-gray-700 font-medium mb-2">
            Jogos por página
          </Label>
          <Select
            value={limit.toString()}
            onValueChange={(value) => setLimit(parseInt(value))}
          >
            <SelectTrigger id="items-per-page" className="w-full">
              <SelectValue placeholder="Jogos por página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Button type="submit">
        Filtrar
      </Button>
    </form>
  );
}
