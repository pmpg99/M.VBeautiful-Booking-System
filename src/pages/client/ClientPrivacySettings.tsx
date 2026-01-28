import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Bell, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { ClientLayout } from "@/components/client/ClientLayout";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

const ClientPrivacySettings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const handleToggle = (setting: string, value: boolean) => {
    switch (setting) {
      case "email":
        setEmailNotifications(value);
        break;
      case "sms":
        setSmsNotifications(value);
        break;
      case "marketing":
        setMarketingEmails(value);
        break;
    }
    toast.success("Preferência atualizada");
  };

  return (
    <ClientLayout>
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl mb-6">Definições de Privacidade</h1>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Notificações Push
              </CardTitle>
              <CardDescription>
                Receba alertas instantâneos no seu dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PushNotificationToggle variant="switch" showLabel={true} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações
              </CardTitle>
              <CardDescription>
                Gerir as suas preferências de comunicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber confirmações e lembretes por email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={(value) => handleToggle("email", value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notifications">Notificações por SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber lembretes de marcações por SMS
                  </p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={smsNotifications}
                  onCheckedChange={(value) => handleToggle("sms", value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Marketing
              </CardTitle>
              <CardDescription>
                Preferências de comunicação promocional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-emails">Emails Promocionais</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber ofertas especiais e novidades
                  </p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={marketingEmails}
                  onCheckedChange={(value) => handleToggle("marketing", value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacidade de Dados
              </CardTitle>
              <CardDescription>
                Informações sobre os seus dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Os seus dados pessoais são armazenados de forma segura e utilizados apenas para 
                gestão das suas marcações e comunicação relacionada com os serviços. Não partilhamos 
                os seus dados com terceiros para fins de marketing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientPrivacySettings;
