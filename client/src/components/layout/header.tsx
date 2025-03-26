import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
  SheetClose 
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gamepad2, Menu, LogIn, LogOut, User as UserIcon, Shield, Home, List, Upload } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };
  
  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary p-2 rounded-md"
            aria-label="Página inicial"
          >
            <Avatar className="h-9 w-9 mr-1">
              <AvatarImage src="https://eternal-legend.com.br/eternal.jpg" alt="Eternal Legend Logo" />
              <AvatarFallback>
                <Gamepad2 className="h-6 w-6" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <span className="text-xl font-bold">Eternal Legend</span>
          </Link>
          
          {/* Mobile menu button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-white hover:bg-primary-foreground/20 hover:text-white"
                aria-label="Menu principal"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px] sm:w-[300px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://eternal-legend.com.br/eternal.jpg" alt="Eternal Legend Logo" />
                    <AvatarFallback>
                      <Gamepad2 className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <span>Eternal Legend</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                <SheetClose asChild>
                  <Link href="/">
                    <Button 
                      variant={isActive("/") ? "secondary" : "ghost"} 
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Home className="mr-2 h-5 w-5" />
                      <span>Início</span>
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/games">
                    <Button 
                      variant={isActive("/games") ? "secondary" : "ghost"} 
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <List className="mr-2 h-5 w-5" />
                      <span>Ver Jogos</span>
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/publish">
                    <Button 
                      variant={isActive("/publish") ? "secondary" : "ghost"} 
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      <span>Publicar Jogo</span>
                    </Button>
                  </Link>
                </SheetClose>
                {user && user.role === "admin" && (
                  <SheetClose asChild>
                    <Link href="/admin">
                      <Button 
                        variant={isActive("/admin") ? "secondary" : "ghost"} 
                        className="w-full justify-start"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Shield className="mr-2 h-5 w-5" />
                        <span>Admin</span>
                      </Button>
                    </Link>
                  </SheetClose>
                )}
                {!user ? (
                  <SheetClose asChild>
                    <Link href="/auth">
                      <Button 
                        variant={isActive("/auth") ? "secondary" : "ghost"} 
                        className="w-full justify-start"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LogIn className="mr-2 h-5 w-5" />
                        <span>Entrar</span>
                      </Button>
                    </Link>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link href={`/users/${user.id}`}>
                        <Button 
                          variant={isActive(`/users/${user.id}`) ? "secondary" : "ghost"} 
                          className="w-full justify-start"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <UserIcon className="mr-2 h-5 w-5" />
                          <span>Perfil</span>
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogOut className="mr-2 h-5 w-5" />
                        <span>Sair</span>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          
          {/* Desktop menu */}
          <nav className="hidden md:flex space-x-1" aria-label="Menu principal">
            <Button 
              asChild
              variant={isActive("/") ? "secondary" : "ghost"}
              className="text-white hover:bg-primary-foreground/20 hover:text-white"
            >
              <Link href="/">Início</Link>
            </Button>
            <Button 
              asChild
              variant={isActive("/games") ? "secondary" : "ghost"}
              className="text-white hover:bg-primary-foreground/20 hover:text-white"
            >
              <Link href="/games">Ver Jogos</Link>
            </Button>
            <Button 
              asChild
              variant={isActive("/publish") ? "secondary" : "ghost"}
              className="text-white hover:bg-primary-foreground/20 hover:text-white"
            >
              <Link href="/publish">Publicar Jogo</Link>
            </Button>
            {user && user.role === "admin" && (
              <Button 
                asChild
                variant={isActive("/admin") ? "secondary" : "ghost"}
                className="text-white hover:bg-primary-foreground/20 hover:text-white"
              >
                <Link href="/admin">Admin</Link>
              </Button>
            )}
            {!user ? (
              <Button 
                asChild
                variant={isActive("/auth") ? "secondary" : "ghost"}
                className="text-white hover:bg-primary-foreground/20 hover:text-white"
              >
                <Link href="/auth">Entrar</Link>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 text-white hover:bg-primary-foreground/20 hover:text-white"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary-foreground/20 text-white">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="sr-only md:not-sr-only">{user.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/users/${user.id}`} className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
