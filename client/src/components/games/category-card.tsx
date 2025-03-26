import { Link } from "wouter";
import { Category } from "@shared/schema";
import { 
  Mountain, 
  Flame, 
  Zap, 
  Puzzle, 
  Crown, 
  Plane, 
  BadgeAlert, 
  HelpCircle
} from "lucide-react";

// Extendendo o tipo Category para incluir gameCount que é adicionado pelo backend
type CategoryWithCount = Category & {
  gameCount?: number;
};

interface CategoryCardProps {
  category: CategoryWithCount;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  // Function to get the appropriate icon based on category iconName
  const getCategoryIcon = () => {
    switch (category.iconName) {
      case "mountain":
        return <Mountain className="text-primary mr-3 h-5 w-5" aria-hidden="true" />;
      case "dragon":
        return <Flame className="text-primary mr-3 h-5 w-5" aria-hidden="true" />;
      case "bolt":
        return <Zap className="text-primary mr-3 h-5 w-5" aria-hidden="true" />;
      case "puzzle-piece":
        return <Puzzle className="text-primary mr-3 h-5 w-5" aria-hidden="true" />;
      case "chess":
        return <Crown className="text-primary mr-3 h-5 w-5" aria-hidden="true" />;
      case "plane":
        return <Plane className="text-primary mr-3 h-5 w-5" aria-hidden="true" />;
      case "futbol":
        return <BadgeAlert className="text-primary mr-3 h-5 w-5" aria-hidden="true" />;
      case "question-circle":
        return <HelpCircle className="text-primary mr-3 h-5 w-5" aria-hidden="true" />;
      default:
        return <HelpCircle className="text-primary mr-3 h-5 w-5" aria-hidden="true" />;
    }
  };

  return (
    <Link 
      href={`/games?category=${category.id}`} 
      className="block p-4 border rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
    >
      <div className="flex items-center">
        {getCategoryIcon()}
        <span className="font-medium">{category.name}</span>
        {/* Contador de jogos removido */}
      </div>
    </Link>
  );
}
