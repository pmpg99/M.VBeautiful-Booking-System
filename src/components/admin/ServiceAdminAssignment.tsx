import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Save, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Admin {
  id: string;
  username: string;
  role: string;
}

interface ServiceWithAdmin {
  id: string;
  name: string;
  category_name: string;
  responsible_admin_id: string | null;
}

const ServiceAdminAssignment = () => {
  const { role } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [services, setServices] = useState<ServiceWithAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, string | null>>({});

  // Only full_admin can access this
  if (role !== "full_admin") {
    return null;
  }

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch admins
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", [
          "55bdbd94-f418-4bfa-bf2d-af5dc3670207", // Jo.Visage
          "e918b05c-80fc-46e6-8a02-886a4a06d938", // M.vbadmin
        ]);

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const adminsList = (profilesData || []).map((profile) => ({
        id: profile.id,
        username: profile.username,
        role: rolesData?.find((r) => r.user_id === profile.id)?.role || "admin",
      }));

      setAdmins(adminsList);

      // Fetch services with categories
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          id,
          name,
          responsible_admin_id,
          service_categories (
            name
          )
        `)
        .order("name");

      if (servicesError) throw servicesError;

      const servicesList = (servicesData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        category_name: s.service_categories?.name || "Sem categoria",
        responsible_admin_id: s.responsible_admin_id,
      }));

      setServices(servicesList);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdminChange = (serviceId: string, adminId: string | null) => {
    setChanges((prev) => ({
      ...prev,
      [serviceId]: adminId === "none" ? null : adminId,
    }));
  };

  const getCurrentValue = (service: ServiceWithAdmin) => {
    if (service.id in changes) {
      return changes[service.id] || "none";
    }
    return service.responsible_admin_id || "none";
  };

  const hasChanges = Object.keys(changes).length > 0;

  const handleSaveAll = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      // Update each changed service
      for (const [serviceId, adminId] of Object.entries(changes)) {
        const { error } = await supabase
          .from("services")
          .update({ responsible_admin_id: adminId })
          .eq("id", serviceId);

        if (error) throw error;
      }

      toast.success("Atribuições guardadas com sucesso");
      setChanges({});
      fetchData();
    } catch (error: any) {
      console.error("Error saving assignments:", error);
      toast.error(error.message || "Erro ao guardar atribuições");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category_name;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, ServiceWithAdmin[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Atribuição de Serviços por Administrador
            </CardTitle>
            <CardDescription>
              Defina qual administrador é responsável por cada serviço (para sincronização com Google Calendar)
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Alterações
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category} className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryServices.map((service) => {
                  const currentValue = getCurrentValue(service);
                  const isChanged = service.id in changes;
                  const assignedAdmin = admins.find((a) => a.id === (currentValue === "none" ? null : currentValue));

                  return (
                    <div
                      key={service.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isChanged ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.name}</span>
                        {currentValue !== "none" && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <Select
                        value={currentValue}
                        onValueChange={(value) => handleAdminChange(service.id, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Selecionar admin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem atribuição</SelectItem>
                          {admins.map((admin) => (
                            <SelectItem key={admin.id} value={admin.id}>
                              {admin.username}
                              {admin.role === "full_admin" && " (Full Admin)"}
                              {admin.role === "pestanas_admin" && " (Pestanas)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum serviço encontrado.</p>
              <p className="text-sm mt-2">Crie serviços primeiro na aba "Serviços".</p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Como funciona:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Atribua cada serviço ao administrador responsável</li>
            <li>• Quando um cliente marca esse serviço, o evento será criado no Google Calendar do admin atribuído</li>
            <li>• Se não houver atribuição, o evento vai para qualquer admin conectado ao Google Calendar</li>
            <li>• <strong>M.vbadmin (Marta)</strong> - Responsável pela maioria dos serviços</li>
            <li>• <strong>Jo.Visage (Joana)</strong> - Responsável pelos serviços de Pestanas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceAdminAssignment;
