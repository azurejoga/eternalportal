import { Link } from "wouter";
import { GameWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface GameCardProps {
  game: GameWithDetails;
  variant: "compact" | "full";
}

export default function GameCard({ game, variant = "compact" }: GameCardProps) {
  const formattedDate = new Date(game.createdAt).toLocaleDateString();
  
  if (variant === "compact") {
    return (
      <div className="border-b pb-4 last:border-b-0 last:pb-0">
        <div className="flex items-start">
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">
                <Link 
                  href={`/games/${game.id}`} 
                  className="hover:text-primary focus:outline-none focus:text-primary"
                >
                  {game.title}
                </Link>
              </h3>
              {game.category && (
                <Badge variant="secondary">{game.category.name}</Badge>
              )}
            </div>
            <p className="text-gray-600 mb-2">{
              game.description.length > 150 
                ? `${game.description.substring(0, 150)}...` 
                : game.description
            }</p>
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500">
                Publicado por: {" "}
                {game.user ? (
                  <Link href={`/users/${game.user.id}`} className="text-primary hover:underline">
                    {game.user.username}
                  </Link>
                ) : (
                  "Unknown User"
                )}
              </span>
              <span className="text-gray-500">{formattedDate}</span>
            </div>
          </div>
          <Button asChild size="sm" className="ml-2">
            <Link href={`/games/${game.id}`}>
              Ver Jogo
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start">
        <div className="flex-grow">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">
              <Link 
                href={`/games/${game.id}`} 
                className="hover:text-primary focus:outline-none focus:text-primary"
              >
                {game.title}
              </Link>
            </h3>
            {game.category && (
              <Badge variant="secondary">{game.category.name}</Badge>
            )}
            <span className="text-gray-500 text-sm">v{game.version}</span>
          </div>
          <p className="text-gray-600 mb-3">{
            game.description.length > 200 
              ? `${game.description.substring(0, 200)}...` 
              : game.description
          }</p>
          <div className="flex flex-wrap gap-3 text-sm mb-2">
            <span className="text-gray-500 flex items-center gap-1">
              Publicado por: {" "}
              {game.user ? (
                <Link href={`/users/${game.user.id}`} className="text-primary hover:underline">
                  {game.user.username}
                </Link>
              ) : (
                "Unknown User"
              )}
            </span>
            <span className="text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
        </div>
        <div className="mt-3 md:mt-0 md:ml-4 flex-shrink-0">
          <Button asChild>
            <Link href={`/games/${game.id}`}>
              Ver Jogo
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
