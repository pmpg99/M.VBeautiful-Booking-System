import { useNavigate, useLocation } from "react-router-dom";
import { User, Calendar, History, Settings, Lock, Shield, Home, LogOut, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useState } from "react";

const menuItems = [
  { title: "Informações Pessoais", url: "/minha-conta/perfil", icon: User },
  { title: "Marcações", url: "/minha-conta/marcacoes", icon: Calendar },
  { title: "Histórico", url: "/minha-conta/historico", icon: History },
];

const settingsSubItems = [
  { title: "Alterar Password", url: "/minha-conta/definicoes/password", icon: Lock },
  { title: "Definições de Privacidade", url: "/minha-conta/definicoes/privacidade", icon: Shield },
];

interface ClientSidebarProps {
  clientName?: string;
}

export function ClientSidebar({ clientName }: ClientSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith("/minha-conta/definicoes")
  );

  const isActive = (path: string) => location.pathname === path;
  const isSettingsActive = location.pathname.startsWith("/minha-conta/definicoes");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão terminada");
    navigate("/");
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{clientName || "Cliente"}</p>
              <p className="text-xs text-muted-foreground">Área Pessoal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {/* Home Link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/")}
                  className="text-primary hover:bg-primary/10"
                >
                  <Home className="w-4 h-4" />
                  {!collapsed && <span>Página Principal</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    className={cn(
                      isActive(item.url) && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Collapsible */}
        <SidebarGroup>
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                className={cn(
                  "w-full justify-between",
                  isSettingsActive && "bg-primary/10 text-primary font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  {!collapsed && <span>Definições de Conta</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      settingsOpen && "rotate-180"
                    )}
                  />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu className="pl-4 mt-1">
                {settingsSubItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      className={cn(
                        "text-sm",
                        isActive(item.url) && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span>Terminar Sessão</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
