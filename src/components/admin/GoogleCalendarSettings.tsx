import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, CheckCircle2, XCircle, Loader2, Link2, Unlink, RefreshCw } from "lucide-react";

type ConnectionStatus = "loading" | "not_configured" | "disconnected" | "connected" | "expired";

const GoogleCalendarSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const checkConnectionStatus = async () => {
    if (!user) {
      setStatus("disconnected");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "check", userId: user.id },
      });

      if (error) {
        console.error("Error checking connection:", error);
        setStatus("not_configured");
        return;
      }

      if (!data.configured) {
        setStatus("not_configured");
      } else if (!data.connected) {
        setStatus("disconnected");
      } else if (data.expired) {
        setStatus("expired");
      } else {
        setStatus("connected");
      }
    } catch (err) {
      console.error("Error checking Google Calendar status:", err);
      setStatus("not_configured");
    }
  };

  useEffect(() => {
    checkConnectionStatus();
  }, [user]);

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Necessita estar autenticado para conectar.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      const redirectUri = `${window.location.origin}/admin/google-callback`;
      
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { 
          action: "getAuthUrl", 
          userId: user.id,
          redirectUri 
        },
      });

      if (error || !data.authUrl) {
        throw new Error(error?.message || "Falha ao obter URL de autorização");
      }

      // Redirect to Google authorization page
      window.location.href = data.authUrl;
    } catch (err) {
      console.error("Error connecting to Google Calendar:", err);
      toast({
        title: "Erro",
        description: "Falha ao iniciar conexão com Google Calendar.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    setIsDisconnecting(true);

    try {
      const { error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "disconnect", userId: user.id },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Sucesso",
        description: "Google Calendar desconectado com sucesso.",
      });
      setStatus("disconnected");
    } catch (err) {
      console.error("Error disconnecting:", err);
      toast({
        title: "Erro",
        description: "Falha ao desconectar Google Calendar.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!user) return;

    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "refresh", userId: user.id },
      });

      if (error || !data.success) {
        throw new Error(error?.message || "Falha ao renovar token");
      }

      toast({
        title: "Sucesso",
        description: "Token renovado com sucesso.",
      });
      setStatus("connected");
    } catch (err) {
      console.error("Error refreshing token:", err);
      toast({
        title: "Erro",
        description: "Falha ao renovar token. Tente reconectar.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        );

      case "not_configured":
        return (
          <div className="text-center py-6">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              As credenciais OAuth do Google Calendar não estão configuradas.
            </p>
            <p className="text-sm text-muted-foreground">
              Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos secrets do backend.
            </p>
          </div>
        );

      case "disconnected":
        return (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Conecte o Google Calendar para sincronizar automaticamente as marcações.
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Conectar Google Calendar
            </Button>
          </div>
        );

      case "expired":
        return (
          <div className="text-center py-6">
            <RefreshCw className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              O token de acesso expirou. Renove a conexão para continuar a sincronização.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRefreshToken} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Renovar Token
              </Button>
              <Button variant="outline" onClick={handleDisconnect} disabled={isDisconnecting}>
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4 mr-2" />
                )}
                Desconectar
              </Button>
            </div>
          </div>
        );

      case "connected":
        return (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-green-600 font-medium mb-2">Google Calendar Conectado</p>
            <p className="text-sm text-muted-foreground mb-4">
              As marcações serão sincronizadas automaticamente com o seu calendário.
            </p>
            <Button variant="outline" onClick={handleDisconnect} disabled={isDisconnecting}>
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4 mr-2" />
              )}
              Desconectar
            </Button>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Calendar className="h-5 w-5" />
          Integração Google Calendar
        </CardTitle>
        <CardDescription>
          Sincronize automaticamente as marcações com o Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

export default GoogleCalendarSettings;
