import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertGameSchema, Category, languageEnum } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, InfoIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Extendendo o tipo Category para incluir gameCount
type CategoryWithCount = Category & {
  gameCount?: number;
};

// Create validation schema for game submission
const gameFormSchema = insertGameSchema.extend({
  primaryLanguage: z.enum(["portuguese", "english", "spanish", "french", "german", "italian", "japanese", "chinese", "russian", "korean", "other"]),
  languages: z.array(z.string()).optional(),
  acceptGuidelines: z.boolean().refine(val => val === true, {
    message: "Você deve aceitar as diretrizes de acessibilidade",
  }),
  // We'll handle file uploads separately
});

type GameFormValues = z.infer<typeof gameFormSchema>;

// Just for tracking upload state in UI
type DownloadLinkFormState = {
  windows: { url: string; fileSize: string; selected: boolean };
  macos: { url: string; fileSize: string; selected: boolean };
  linux: { url: string; fileSize: string; selected: boolean };
  android: { url: string; fileSize: string; selected: boolean };
  ios: { url: string; fileSize: string; selected: boolean };
  steam: { url: string; fileSize: string; selected: boolean };
  browser: { url: string; fileSize: string; selected: boolean };
};

export default function PublishGamePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // State for file upload inputs (simplified, in a real app we'd handle actual file uploads)
  const [downloadLinks, setDownloadLinks] = useState<DownloadLinkFormState>({
    windows: { url: "", fileSize: "", selected: false },
    macos: { url: "", fileSize: "", selected: false },
    linux: { url: "", fileSize: "", selected: false },
    android: { url: "", fileSize: "", selected: false },
    ios: { url: "", fileSize: "", selected: false },
    steam: { url: "", fileSize: "", selected: false },
    browser: { url: "", fileSize: "", selected: false },
  });
  
  // Fetch categories for dropdown
  const { data: categories } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories"],
  });
  
  // Create game form
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      title: "",
      alternativeTitle: "",
      description: "",
      version: "",
      categoryId: undefined,
      systemRequirements: "",
      primaryLanguage: "portuguese",
      languages: [],
      acceptGuidelines: false,
    },
  });
  
  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: async (data: GameFormValues) => {
      const { acceptGuidelines, primaryLanguage, languages, ...restData } = data;
      // Enviar primaryLanguage como language e languages separadamente
      const res = await apiRequest("POST", "/api/games", {
        ...restData,
        language: primaryLanguage,
        languages: languages
      });
      return await res.json();
    },
    onSuccess: async (game) => {
      // Now create download links if provided for selected platforms
      const promises = Object.entries(downloadLinks)
        .filter(([_, value]) => value.selected && value.url.trim() !== "")
        .map(([os, value]) => {
          return apiRequest("POST", `/api/games/${game.id}/download-links`, {
            gameId: game.id,
            os,
            url: value.url,
            fileSize: value.fileSize || null,
          });
        });
      
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/latest"] });
      
      toast({
        title: "Game submitted successfully",
        description: "Your game has been submitted and is awaiting approval.",
      });
      
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error submitting game",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: GameFormValues) => {
    createGameMutation.mutateAsync(data);
  };
  
  const handleDownloadLinkChange = (
    os: keyof DownloadLinkFormState,
    field: "url" | "fileSize" | "selected",
    value: string | boolean
  ) => {
    setDownloadLinks(prev => ({
      ...prev,
      [os]: {
        ...prev[os],
        [field]: value,
      },
    }));
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <section id="publish" className="mb-10">
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold mb-6">Publicar um Jogo</h1>
              
              <Alert className="mb-6 bg-blue-50 border-blue-200">
                <InfoIcon className="h-4 w-4 text-blue-500" />
                <AlertTitle>Informação sobre o processo de publicação</AlertTitle>
                <AlertDescription>
                  Todos os jogos submetidos passam por um processo de aprovação antes de serem publicados. 
                  Certifique-se de que seu jogo é totalmente acessível para pessoas com deficiência visual.
                </AlertDescription>
              </Alert>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título do Jogo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do seu jogo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="alternativeTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título Alternativo</FormLabel>
                        <FormControl>
                          <Input placeholder="Título alternativo ou apelido do jogo" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Um título alternativo ou apelido usado para o jogo (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria *</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Versão *</FormLabel>
                        <FormControl>
                          <Input placeholder="Por exemplo: 1.0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição *</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={6} 
                            placeholder="Descreva seu jogo, incluindo detalhes sobre a jogabilidade, história e recursos de acessibilidade."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <h2 className="text-base font-medium mb-2">Plataformas Disponíveis *</h2>
                    <FormDescription className="mb-2">
                      Selecione as plataformas em que seu jogo está disponível.
                    </FormDescription>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="platform-windows" 
                          checked={downloadLinks.windows.selected}
                          onCheckedChange={(checked) => 
                            handleDownloadLinkChange("windows", "selected", checked === true)
                          }
                        />
                        <label
                          htmlFor="platform-windows"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Windows
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="platform-macos" 
                          checked={downloadLinks.macos.selected}
                          onCheckedChange={(checked) => 
                            handleDownloadLinkChange("macos", "selected", checked === true)
                          }
                        />
                        <label
                          htmlFor="platform-macos"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          macOS
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="platform-linux" 
                          checked={downloadLinks.linux.selected}
                          onCheckedChange={(checked) => 
                            handleDownloadLinkChange("linux", "selected", checked === true)
                          }
                        />
                        <label
                          htmlFor="platform-linux"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Linux
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="platform-android" 
                          checked={downloadLinks.android.selected}
                          onCheckedChange={(checked) => 
                            handleDownloadLinkChange("android", "selected", checked === true)
                          }
                        />
                        <label
                          htmlFor="platform-android"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Android
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="platform-ios" 
                          checked={downloadLinks.ios.selected}
                          onCheckedChange={(checked) => 
                            handleDownloadLinkChange("ios", "selected", checked === true)
                          }
                        />
                        <label
                          htmlFor="platform-ios"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          iOS
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="platform-steam" 
                          checked={downloadLinks.steam.selected}
                          onCheckedChange={(checked) => 
                            handleDownloadLinkChange("steam", "selected", checked === true)
                          }
                        />
                        <label
                          htmlFor="platform-steam"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Steam
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="platform-browser" 
                          checked={downloadLinks.browser.selected}
                          onCheckedChange={(checked) => 
                            handleDownloadLinkChange("browser", "selected", checked === true)
                          }
                        />
                        <label
                          htmlFor="platform-browser"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Navegador
                        </label>
                      </div>
                    </div>
                    
                    <h2 className="text-base font-medium mb-2">Arquivos para Download *</h2>
                    <FormDescription className="mb-2">
                      Forneça URLs para download dos arquivos para cada plataforma selecionada.
                    </FormDescription>
                    
                    <div className="space-y-4">
                      {downloadLinks.windows.selected && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <div className="mb-2 font-medium">Windows</div>
                          <div className="space-y-2">
                            <Input
                              placeholder="URL de download (ex: https://example.com/game.zip)"
                              value={downloadLinks.windows.url}
                              onChange={(e) => handleDownloadLinkChange("windows", "url", e.target.value)}
                            />
                            <Input
                              placeholder="Tamanho do arquivo (ex: 45MB)"
                              value={downloadLinks.windows.fileSize}
                              onChange={(e) => handleDownloadLinkChange("windows", "fileSize", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      
                      {downloadLinks.macos.selected && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <div className="mb-2 font-medium">macOS</div>
                          <div className="space-y-2">
                            <Input
                              placeholder="URL de download (ex: https://example.com/game.dmg)"
                              value={downloadLinks.macos.url}
                              onChange={(e) => handleDownloadLinkChange("macos", "url", e.target.value)}
                            />
                            <Input
                              placeholder="Tamanho do arquivo (ex: 48MB)"
                              value={downloadLinks.macos.fileSize}
                              onChange={(e) => handleDownloadLinkChange("macos", "fileSize", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      
                      {downloadLinks.linux.selected && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <div className="mb-2 font-medium">Linux</div>
                          <div className="space-y-2">
                            <Input
                              placeholder="URL de download (ex: https://example.com/game.tar.gz)"
                              value={downloadLinks.linux.url}
                              onChange={(e) => handleDownloadLinkChange("linux", "url", e.target.value)}
                            />
                            <Input
                              placeholder="Tamanho do arquivo (ex: 42MB)"
                              value={downloadLinks.linux.fileSize}
                              onChange={(e) => handleDownloadLinkChange("linux", "fileSize", e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {downloadLinks.android.selected && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <div className="mb-2 font-medium">Android</div>
                          <div className="space-y-2">
                            <Input
                              placeholder="URL de download (ex: https://example.com/game.apk)"
                              value={downloadLinks.android.url}
                              onChange={(e) => handleDownloadLinkChange("android", "url", e.target.value)}
                            />
                            <Input
                              placeholder="Tamanho do arquivo (ex: 38MB)"
                              value={downloadLinks.android.fileSize}
                              onChange={(e) => handleDownloadLinkChange("android", "fileSize", e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {downloadLinks.ios.selected && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <div className="mb-2 font-medium">iOS</div>
                          <div className="space-y-2">
                            <Input
                              placeholder="URL de download (ex: https://apps.apple.com/app/id1234)"
                              value={downloadLinks.ios.url}
                              onChange={(e) => handleDownloadLinkChange("ios", "url", e.target.value)}
                            />
                            <Input
                              placeholder="Tamanho do arquivo (ex: 40MB)"
                              value={downloadLinks.ios.fileSize}
                              onChange={(e) => handleDownloadLinkChange("ios", "fileSize", e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {downloadLinks.steam.selected && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <div className="mb-2 font-medium">Steam</div>
                          <div className="space-y-2">
                            <Input
                              placeholder="URL da loja Steam (ex: https://store.steampowered.com/app/1234)"
                              value={downloadLinks.steam.url}
                              onChange={(e) => handleDownloadLinkChange("steam", "url", e.target.value)}
                            />
                            <Input
                              placeholder="Tamanho do arquivo (ex: 1.2GB)"
                              value={downloadLinks.steam.fileSize}
                              onChange={(e) => handleDownloadLinkChange("steam", "fileSize", e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {downloadLinks.browser.selected && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <div className="mb-2 font-medium">Navegador (Browser)</div>
                          <div className="space-y-2">
                            <Input
                              placeholder="URL para jogar no navegador (ex: https://example.com/play)"
                              value={downloadLinks.browser.url}
                              onChange={(e) => handleDownloadLinkChange("browser", "url", e.target.value)}
                            />
                            <Input
                              placeholder="Tamanho aproximado (ex: HTML5 - 15MB)"
                              value={downloadLinks.browser.fileSize}
                              onChange={(e) => handleDownloadLinkChange("browser", "fileSize", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      
                      {(!downloadLinks.windows.selected && !downloadLinks.macos.selected && !downloadLinks.linux.selected && 
                        !downloadLinks.android.selected && !downloadLinks.ios.selected && !downloadLinks.steam.selected && !downloadLinks.browser.selected) && (
                        <p className="text-sm text-red-500">
                          Por favor, selecione pelo menos uma plataforma
                        </p>
                      )}
                    </div>
                    
                    {!downloadLinks.windows.url && !downloadLinks.macos.url && !downloadLinks.linux.url && 
                     !downloadLinks.android.url && !downloadLinks.ios.url && !downloadLinks.steam.url && !downloadLinks.browser.url && (
                      <p className="text-sm text-red-500 mt-2">
                        Por favor, forneça pelo menos um link para download
                      </p>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="primaryLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idioma Principal do Jogo *</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value)}
                          defaultValue={field.value || "portuguese"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o idioma principal do jogo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                        <FormDescription>
                          Selecione o idioma principal do jogo.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <FormLabel>Idiomas Adicionais</FormLabel>
                    <FormDescription>
                      Selecione todos os idiomas que seu jogo suporta além do idioma principal.
                    </FormDescription>
                    
                    <FormField
                      control={form.control}
                      name="languages"
                      render={() => {
                        const primaryLanguage = form.watch('primaryLanguage');
                        const languages = form.watch('languages') || [];
                        
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                            {Object.entries({
                              "portuguese": "Português", 
                              "english": "Inglês", 
                              "spanish": "Espanhol", 
                              "french": "Francês", 
                              "german": "Alemão", 
                              "italian": "Italiano", 
                              "japanese": "Japonês", 
                              "chinese": "Chinês", 
                              "russian": "Russo", 
                              "korean": "Coreano"
                            }).map(([value, label]) => {
                              const isChecked = languages.includes(value) || primaryLanguage === value;
                              const isPrimary = primaryLanguage === value;
                              
                              return (
                                <div key={value} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`lang-${value}`}
                                    disabled={isPrimary}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      if (isPrimary) return;
                                      
                                      if (checked) {
                                        form.setValue('languages', [...languages, value], { shouldValidate: true });
                                      } else {
                                        form.setValue('languages', languages.filter(lang => lang !== value), { shouldValidate: true });
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`lang-${value}`}
                                    className={`text-sm font-medium leading-none ${isPrimary ? 'text-gray-400' : ''}`}
                                  >
                                    {label} {isPrimary ? '(Principal)' : ''}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="systemRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requisitos do Sistema</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={4} 
                            placeholder="Liste os requisitos mínimos e recomendados para rodar seu jogo."
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="acceptGuidelines"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Eu confirmo que este jogo é totalmente acessível para pessoas com deficiência visual e segue as diretrizes de acessibilidade do portal.
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                    <h3 className="font-semibold mb-2">Diretrizes de Acessibilidade</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm text-gray-700">
                      <li>O jogo deve ser utilizável com leitores de tela</li>
                      <li>Todos os elementos visuais devem ter alternativas auditivas</li>
                      <li>Os controles devem ser configuráveis e simples</li>
                      <li>A navegação deve ser intuitiva e consistente</li>
                      <li>O áudio deve ser claro e informativo</li>
                    </ul>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={
                        createGameMutation.isPending || 
                        !Object.values(downloadLinks).some(value => value.selected && value.url.trim() !== "")
                      }
                      className="px-6 py-2"
                    >
                      {createGameMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        "Enviar para Aprovação"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
