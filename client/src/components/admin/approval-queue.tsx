import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GameWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  AlertCircle, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  User, 
  Loader2, 
  Trash2 
} from "lucide-react";

interface ApprovalQueueProps {
  games: GameWithDetails[];
  isLoading: boolean;
  showApprovedGames?: boolean;
}

export default function ApprovalQueue({ games, isLoading, showApprovedGames = false }: ApprovalQueueProps) {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<GameWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  
  const approveGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/games/${gameId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/latest"] });
      
      toast({
        title: "Jogo aprovado",
        description: "O jogo foi aprovado e agora está disponível publicamente.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aprovar jogo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const rejectGameMutation = useMutation({
    mutationFn: async ({ gameId, reason }: { gameId: number; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/games/${gameId}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-games"] });
      
      toast({
        title: "Jogo rejeitado",
        description: "O jogo foi rejeitado e o usuário foi notificado.",
        variant: "default",
      });
      
      setIsRejectionDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao rejeitar jogo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      await apiRequest("DELETE", `/api/admin/games/${gameId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/latest"] });
      
      toast({
        title: "Jogo excluído",
        description: "O jogo foi excluído com sucesso.",
        variant: "default",
      });
      
      setIsDeleteConfirmDialogOpen(false);
      setSelectedGame(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir jogo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleApprove = (game: GameWithDetails) => {
    approveGameMutation.mutate(game.id);
  };
  
  const handleReject = () => {
    if (!selectedGame) return;
    
    if (!rejectionReason.trim()) {
      toast({
        title: "Motivo de rejeição obrigatório",
        description: "Por favor, forneça um motivo para rejeitar este jogo.",
        variant: "destructive",
      });
      return;
    }
    
    rejectGameMutation.mutate({
      gameId: selectedGame.id,
      reason: rejectionReason,
    });
  };
  
  const openRejectionDialog = (game: GameWithDetails) => {
    setSelectedGame(game);
    setRejectionReason("");
    setIsRejectionDialogOpen(true);
  };
  
  const openDeleteConfirmDialog = (game: GameWithDetails) => {
    setSelectedGame(game);
    setIsDeleteConfirmDialogOpen(true);
  };
  
  const handleDeleteGame = () => {
    if (!selectedGame) return;
    deleteGameMutation.mutate(selectedGame.id);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full" />
        ))}
      </div>
    );
  }
  
  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h3 className="text-xl font-medium mb-2">
            {showApprovedGames 
              ? "Nenhum jogo aprovado" 
              : "Nenhum jogo pendente"
            }
          </h3>
          <p className="text-gray-500">
            {showApprovedGames
              ? "Não há jogos aprovados disponíveis no momento."
              : "Todos os jogos foram revisados. Volte mais tarde para novas submissões."
            }
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {games.map((game) => (
        <Card key={game.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CardTitle>{game.title}</CardTitle>
                {game.category && <Badge variant="outline">{game.category.name}</Badge>}
                <Badge variant="secondary">v{game.version}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Enviado em: {new Date(game.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">Enviado por</h4>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{game.user?.username || "Usuário Desconhecido"}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">Descrição</h4>
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="whitespace-pre-wrap">{game.description}</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">Links de Download</h4>
              {game.downloadLinks && game.downloadLinks.length > 0 ? (
                <div className="grid gap-2">
                  {game.downloadLinks.map((link) => (
                    <div key={link.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                      <div>
                        <span className="font-medium">
                          {link.os === 'windows' ? 'Windows' :
                           link.os === 'macos' ? 'macOS' : 'Linux'}
                        </span>
                        {link.fileSize && <span className="text-sm text-muted-foreground ml-2">{link.fileSize}</span>}
                      </div>
                      <a 
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        Verificar link
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-red-50 text-red-800 p-2 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Nenhum link de download fornecido</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t p-4">
            {showApprovedGames ? (
              <Button 
                variant="destructive" 
                onClick={() => openDeleteConfirmDialog(game)}
                disabled={deleteGameMutation.isPending}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                <span>Excluir Jogo</span>
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => openRejectionDialog(game)}
                  disabled={rejectGameMutation.isPending}
                  className="flex items-center gap-1"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Rejeitar</span>
                </Button>
                <Button 
                  variant="default"
                  onClick={() => handleApprove(game)}
                  disabled={approveGameMutation.isPending}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Aprovar</span>
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      ))}
      
      {/* Rejection Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Jogo</DialogTitle>
            <DialogDescription>
              Por favor, forneça um motivo para rejeitar <strong>{selectedGame?.title}</strong>. Isso será enviado ao usuário por e-mail.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Digite o motivo da rejeição..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRejectionDialogOpen(false)}
              disabled={rejectGameMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={rejectGameMutation.isPending}
            >
              {rejectGameMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                "Rejeitar Jogo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Jogo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o jogo <strong>{selectedGame?.title}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteConfirmDialogOpen(false)}
              disabled={deleteGameMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteGame}
              disabled={deleteGameMutation.isPending}
            >
              {deleteGameMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Jogo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
