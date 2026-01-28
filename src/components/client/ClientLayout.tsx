import { useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "./ClientSidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ClientData {
  name: string;
  phone: string;
  email: string | null;
}

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSession = (session: Session | null) => {
    if (!session) {
      navigate("/cliente");
      return;
    }

    setUser(session.user);

    // Defer Supabase calls to avoid auth deadlock
    setTimeout(() => {
      // Check if admin (redirect to admin panel)
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data: roleData }) => {
          if (roleData) {
            navigate("/admin");
            return;
          }

          // Fetch client info
          supabase
            .from("clients")
            .select("name, phone, email")
            .eq("user_id", session.user.id)
            .maybeSingle()
            .then(({ data: clientData }) => {
              if (clientData) {
                setClient(clientData);
              }
              setLoading(false);
            });
        });
    }, 0);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <SidebarProvider>
        <div className="flex-1 flex w-full">
          <ClientSidebar clientName={client?.name} />
          <main className="flex-1 p-4 md:p-6">
            <div className="md:hidden mb-4">
              <SidebarTrigger />
            </div>
            {children}
          </main>
        </div>
      </SidebarProvider>
      <Footer />
    </div>
  );
}

export { type ClientData };
