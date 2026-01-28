import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminGoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const exchangeCode = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setErrorMessage("Autorização negada pelo utilizador.");
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMessage("Código de autorização não encontrado.");
        return;
      }

      if (!user) {
        setStatus("error");
        setErrorMessage("Utilizador não autenticado.");
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/admin/google-callback`;

        const { data, error: invokeError } = await supabase.functions.invoke(
          "google-calendar-auth",
          {
            body: {
              action: "exchangeCode",
              userId: user.id,
              code,
              redirectUri,
            },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        if (!data.success) {
          throw new Error(data.error || "Falha ao trocar código por tokens");
        }

        setStatus("success");
        toast({
          title: "Sucesso!",
          description: "Google Calendar conectado com sucesso.",
        });

        // Redirect after a short delay
        setTimeout(() => {
          navigate("/admin", { replace: true });
        }, 2000);
      } catch (err) {
        console.error("Error exchanging code:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Erro desconhecido");
      }
    };

    exchangeCode();
  }, [searchParams, user, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        {status === "processing" && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-display font-semibold mb-2">
              A processar...
            </h1>
            <p className="text-muted-foreground">
              A conectar o Google Calendar à sua conta.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-semibold mb-2">
              Conectado com Sucesso!
            </h1>
            <p className="text-muted-foreground mb-4">
              O Google Calendar foi conectado à sua conta. A redirecionar...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-display font-semibold mb-2">
              Erro na Conexão
            </h1>
            <p className="text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={() => navigate("/admin", { replace: true })}>
              Voltar ao Painel
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminGoogleCallback;
