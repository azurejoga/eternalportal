import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Gamepad2, 
  Home, 
  List, 
  Upload, 
  User as UserIcon, 
  LogOut,
  Shield,
  Settings
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <aside 
      className={`border-r bg-sidebar w-64 hidden lg:block ${className}`}
      aria-label="Sidebar navigation"
    >
      <div className="flex flex-col h-full">
        <div className="p-4">
          <Link 
            href="/" 
            className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary p-2 rounded-md"
            aria-label="Página inicial"
          >
            <Gamepad2 className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold">Eternal Legend</span>
          </Link>
        </div>
        
        <Separator />
        
        <ScrollArea className="flex-1 p-4">
          <nav className="flex flex-col gap-2">
            <Button
              asChild
              variant={isActive("/") ? "secondary" : "ghost"}
              className="justify-start"
            >
              <Link href="/">
                <Home className="mr-2 h-5 w-5" />
                <span>Início</span>
              </Link>
            </Button>
            
            <Button
              asChild
              variant={isActive("/games") ? "secondary" : "ghost"}
              className="justify-start"
            >
              <Link href="/games">
                <List className="mr-2 h-5 w-5" />
                <span>Ver Jogos</span>
              </Link>
            </Button>
            
            <Button
              asChild
              variant={isActive("/publish") ? "secondary" : "ghost"}
              className="justify-start"
            >
              <Link href="/publish">
                <Upload className="mr-2 h-5 w-5" />
                <span>Publicar Jogo</span>
              </Link>
            </Button>
            
            {user && (
              <>
                <Separator className="my-2" />
                
                <Button
                  asChild
                  variant={isActive(`/users/${user.id}`) ? "secondary" : "ghost"}
                  className="justify-start"
                >
                  <Link href={`/users/${user.id}`}>
                    <UserIcon className="mr-2 h-5 w-5" />
                    <span>Meu Perfil</span>
                  </Link>
                </Button>
                
                {user.role === "admin" && (
                  <Button
                    asChild
                    variant={isActive("/admin") ? "secondary" : "ghost"}
                    className="justify-start"
                  >
                    <Link href="/admin">
                      <Shield className="mr-2 h-5 w-5" />
                      <span>Admin</span>
                    </Link>
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  <span>Sair</span>
                </Button>
              </>
            )}
            
            {!user && (
              <Button
                asChild
                variant={isActive("/auth") ? "secondary" : "ghost"}
                className="justify-start"
              >
                <Link href="/auth">
                  <UserIcon className="mr-2 h-5 w-5" />
                  <span>Entrar</span>
                </Link>
              </Button>
            )}
          </nav>
        </ScrollArea>
        
        <Separator />
        
        <div className="p-4 text-sm text-muted-foreground">
          <p>Portal de Jogos para Cegos</p>
        </div>
      </div>
    </aside>
  );
}
