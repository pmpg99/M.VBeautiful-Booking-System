import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
  display_order: number;
  is_active: boolean;
  has_options: boolean;
  responsible_admin_id: string | null;
}

export interface ServiceOption {
  id: string;
  service_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ServiceWithCategory extends Service {
  category: ServiceCategory;
}

export const useServices = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [catResult, svcResult, optResult] = await Promise.all([
        supabase
          .from("service_categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("services")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("service_options")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
      ]);

      if (catResult.error) throw catResult.error;
      if (svcResult.error) throw svcResult.error;
      if (optResult.error) throw optResult.error;

      setCategories(catResult.data || []);
      setServices(svcResult.data || []);
      setServiceOptions(optResult.data || []);
    } catch (err: any) {
      console.error("Error fetching services:", err);
      setError(err.message || "Failed to load services");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getServicesByCategory = (categoryId: string): Service[] => {
    return services.filter((s) => s.category_id === categoryId);
  };

  const getServicesByCategorySlug = (slug: string): Service[] => {
    const category = categories.find((c) => c.slug === slug);
    if (!category) return [];
    return services.filter((s) => s.category_id === category.id);
  };

  const getCategoryBySlug = (slug: string): ServiceCategory | undefined => {
    return categories.find((c) => c.slug === slug);
  };

  const getOptionsByService = (serviceId: string): ServiceOption[] => {
    return serviceOptions.filter((o) => o.service_id === serviceId);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  const formatPrice = (price: number): string => {
    return `${price.toFixed(2).replace(".", ",")}€`;
  };

  return {
    categories,
    services,
    serviceOptions,
    isLoading,
    error,
    refetch: fetchData,
    getServicesByCategory,
    getServicesByCategorySlug,
    getCategoryBySlug,
    getOptionsByService,
    formatDuration,
    formatPrice,
  };
};
