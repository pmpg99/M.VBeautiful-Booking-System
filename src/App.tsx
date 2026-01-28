import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminGoogleCallback from "./pages/AdminGoogleCallback";
import ClientAuth from "./pages/ClientAuth";
import ClientPersonalInfo from "./pages/client/ClientPersonalInfo";
import ClientBookings from "./pages/client/ClientBookings";
import ClientHistory from "./pages/client/ClientHistory";
import ClientPasswordSettings from "./pages/client/ClientPasswordSettings";
import ClientPrivacySettings from "./pages/client/ClientPrivacySettings";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import InstallApp from "./pages/InstallApp";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/google-callback" element={<AdminGoogleCallback />} />
              <Route path="/cliente" element={<ClientAuth />} />
              <Route path="/minha-conta" element={<Navigate to="/minha-conta/perfil" replace />} />
              <Route path="/minha-conta/perfil" element={<ClientPersonalInfo />} />
              <Route path="/minha-conta/marcacoes" element={<ClientBookings />} />
              <Route path="/minha-conta/historico" element={<ClientHistory />} />
              <Route path="/minha-conta/definicoes/password" element={<ClientPasswordSettings />} />
              <Route path="/minha-conta/definicoes/privacidade" element={<ClientPrivacySettings />} />
              <Route path="/politica-privacidade" element={<PrivacyPolicy />} />
              <Route path="/termos-servico" element={<TermsOfService />} />
              <Route path="/instalar" element={<InstallApp />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;