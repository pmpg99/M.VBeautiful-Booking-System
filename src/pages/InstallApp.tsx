import { useEffect, useState } from "react";
import { Download, Share, Plus, Smartphone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>App Instalada!</CardTitle>
              <CardDescription>
                A app M.VBeautiful já está instalada no seu dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pode encontrar a app no ecrã principal do seu telemóvel.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto mb-4 w-20 h-20 rounded-2xl overflow-hidden shadow-lg">
              <img src="/pwa-192x192.png" alt="M.VBeautiful App" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Instalar M.VBeautiful
            </h1>
            <p className="text-muted-foreground">
              Tenha acesso rápido aos seus serviços e marcações
            </p>
          </div>

          {/* Android/Chrome with native prompt available */}
          {deferredPrompt && (
            <Card className="border-primary">
              <CardContent className="pt-6">
                <Button onClick={handleInstallClick} className="w-full" size="lg">
                  <Download className="h-5 w-5 mr-2" />
                  Instalar App
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Toque para adicionar ao ecrã inicial
                </p>
              </CardContent>
            </Card>
          )}

          {/* iOS Instructions - Safari doesn't support beforeinstallprompt */}
          {isIOS && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Instruções para iPhone
                </CardTitle>
                <CardDescription>
                  Siga estes passos no Safari
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Toque no ícone de Partilhar</p>
                    <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                      <Share className="h-5 w-5" />
                      <span className="text-sm">O ícone com uma seta para cima</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Role para baixo e toque em</p>
                    <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                      <Plus className="h-5 w-5" />
                      <span className="text-sm">"Adicionar ao Ecrã Principal"</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Confirme tocando em "Adicionar"</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      A app aparecerá no seu ecrã principal
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop - No install prompt available */}
          {!isIOS && !deferredPrompt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Visite no Telemóvel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Para instalar a app, visite este site no seu telemóvel usando o Chrome (Android) ou Safari (iPhone).
                </p>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-lg">Vantagens da App</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Acesso rápido sem abrir o browser
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Notificações de marcações
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Funciona mesmo sem internet
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Experiência de app nativa
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InstallApp;
