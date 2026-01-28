import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import AdminCalendar from "@/components/admin/AdminCalendar";
import AdminServices from "@/components/admin/AdminServices";
import AdminSettings from "@/components/admin/AdminSettings";
import ServiceAdminAssignment from "@/components/admin/ServiceAdminAssignment";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Calendar, Settings, ArrowLeft, Sliders, Users } from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { user, loading, role, username, mustChangePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/admin/login");
      } else if (role !== "full_admin" && role !== "pestanas_admin") {
        // Non-admin users cannot access admin dashboard - redirect to admin login
        navigate("/admin/login");
      }
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (mustChangePassword) {
      setShowPasswordDialog(true);
    }
  }, [mustChangePassword]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isFullAdmin = role === "full_admin";
  const isPestanasAdmin = role === "pestanas_admin";

  return (
    <>
      <Helmet>
        <title>Painel Admin | M.VBeautiful</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 py-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Voltar ao site</span>
              </Link>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <h1 className="text-xl font-display font-semibold">Painel de Administração</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <NotificationBell />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Olá, <span className="font-medium text-foreground">{username}</span>
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto p-4 md:p-6">
          <Tabs defaultValue="calendar" className="space-y-6">
            <TabsList className={`grid w-full max-w-2xl ${isFullAdmin ? 'grid-cols-4' : 'grid-cols-1'}`}>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendário
              </TabsTrigger>
              {isFullAdmin && (
                <TabsTrigger value="services" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Serviços
                </TabsTrigger>
              )}
              {isFullAdmin && (
                <TabsTrigger value="assignments" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Atribuições
                </TabsTrigger>
              )}
              {isFullAdmin && (
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  Definições
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="calendar">
              <AdminCalendar 
                isFullAdmin={isFullAdmin} 
                isPestanasAdmin={isPestanasAdmin} 
              />
            </TabsContent>

            {isFullAdmin && (
              <TabsContent value="services">
                <AdminServices />
              </TabsContent>
            )}

            {isFullAdmin && (
              <TabsContent value="assignments">
                <ServiceAdminAssignment />
              </TabsContent>
            )}

            {isFullAdmin && (
              <TabsContent value="settings">
                <AdminSettings />
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>

      <ChangePasswordDialog 
        open={showPasswordDialog} 
        onClose={() => setShowPasswordDialog(false)} 
      />
    </>
  );
};

export default AdminDashboard;