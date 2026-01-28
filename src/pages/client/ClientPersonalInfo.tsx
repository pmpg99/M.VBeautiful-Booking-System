import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/client/ClientLayout";

interface ClientData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

const ClientPersonalInfo = () => {
  const [client, setClient] = useState<ClientData | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchClientData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("clients")
        .select("id, name, phone, email")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setClient(data);
        setName(data.name);
        setPhone(formatPhone(data.phone));
        setEmail(data.email || "");
      }
      setLoading(false);
    };

    fetchClientData();
  }, []);

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  };

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);

    const { error } = await supabase
      .from("clients")
      .update({
        name,
        phone: phone.replace(/\s/g, ""),
        email: email || null,
      })
      .eq("id", client.id);

    if (error) {
      toast.error("Erro ao guardar alterações");
    } else {
      toast.success("Informações atualizadas com sucesso");
    }
    setSaving(false);
  };

  return (
    <ClientLayout>
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl mb-6">Informações Pessoais</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Os Seus Dados
            </CardTitle>
            <CardDescription>
              Atualize as suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground">A carregar...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="O seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telemóvel</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="912 345 678"
                      className="pl-10"
                      maxLength={11}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "A guardar..." : "Guardar Alterações"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
};

export default ClientPersonalInfo;
