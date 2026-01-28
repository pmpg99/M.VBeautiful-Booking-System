import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useServices } from "@/hooks/useServices";
import { CalendarPlus } from "lucide-react";

interface AdminBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onBookingCreated: () => void;
  isFullAdmin: boolean;
  isPestanasAdmin: boolean;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

const AdminBookingDialog = ({
  open,
  onOpenChange,
  selectedDate,
  onBookingCreated,
  isFullAdmin,
  isPestanasAdmin,
}: AdminBookingDialogProps) => {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [startTime, setStartTime] = useState("10:00");
  const [isLoading, setIsLoading] = useState(false);
  const [existingClient, setExistingClient] = useState<Client | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);

  const { toast } = useToast();
  const { 
    categories, 
    services, 
    serviceOptions,
    getServicesByCategory, 
    getOptionsByService,
    formatDuration, 
    formatPrice 
  } = useServices();

  // Filter categories based on admin role
  const availableCategories = categories.filter((cat) => {
    if (isFullAdmin) return true;
    if (isPestanasAdmin) return cat.slug === "pestanas";
    return false;
  });

  // Get services for selected category
  const availableServices = selectedCategoryId 
    ? getServicesByCategory(selectedCategoryId) 
    : [];

  // Get options for selected service
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const availableOptions = selectedServiceId 
    ? getOptionsByService(selectedServiceId) 
    : [];

  // Calculate duration and end time
  const getDurationAndPrice = () => {
    if (selectedOptionId) {
      const option = serviceOptions.find((o) => o.id === selectedOptionId);
      return option ? { duration: option.duration_minutes, price: option.price } : null;
    }
    if (selectedService) {
      return { duration: selectedService.duration_minutes, price: selectedService.price };
    }
    return null;
  };

  const getServiceName = () => {
    if (selectedOptionId) {
      const option = serviceOptions.find((o) => o.id === selectedOptionId);
      return option ? `${selectedService?.name} - ${option.name}` : "";
    }
    return selectedService?.name || "";
  };

  const calculateEndTime = (start: string, durationMinutes: number): string => {
    const [hours, minutes] = start.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  // Search for existing client by phone
  useEffect(() => {
    const searchClient = async () => {
      const cleanPhone = clientPhone.replace(/\s/g, "");
      if (cleanPhone.length < 9) {
        setExistingClient(null);
        return;
      }

      setIsSearchingClient(true);
      const { data } = await supabase
        .from("clients")
        .select("id, name, phone, email")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (data) {
        setExistingClient(data);
        setClientName(data.name);
        setClientEmail(data.email || "");
      } else {
        setExistingClient(null);
      }
      setIsSearchingClient(false);
    };

    const debounce = setTimeout(searchClient, 500);
    return () => clearTimeout(debounce);
  }, [clientPhone]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setSelectedCategoryId("");
      setSelectedServiceId("");
      setSelectedOptionId("");
      setStartTime("10:00");
      setExistingClient(null);
    }
  }, [open]);

  // Reset service when category changes
  useEffect(() => {
    setSelectedServiceId("");
    setSelectedOptionId("");
  }, [selectedCategoryId]);

  // Reset option when service changes
  useEffect(() => {
    setSelectedOptionId("");
  }, [selectedServiceId]);

  const handleSubmit = async () => {
    // Validate required fields
    if (!clientName.trim()) {
      toast({ title: "Erro", description: "Nome do cliente é obrigatório", variant: "destructive" });
      return;
    }
    if (!clientPhone.trim()) {
      toast({ title: "Erro", description: "Telefone é obrigatório", variant: "destructive" });
      return;
    }
    if (!selectedServiceId) {
      toast({ title: "Erro", description: "Selecione um serviço", variant: "destructive" });
      return;
    }
    if (selectedService?.has_options && !selectedOptionId) {
      toast({ title: "Erro", description: "Selecione uma opção do serviço", variant: "destructive" });
      return;
    }

    const durationPrice = getDurationAndPrice();
    if (!durationPrice) {
      toast({ title: "Erro", description: "Não foi possível calcular a duração", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Use centralized manage-booking Edge Function
      const response = await supabase.functions.invoke("manage-booking", {
        body: {
          action: "create",
          payload: {
            service_name: getServiceName(),
            service_duration: durationPrice.duration,
            booking_date: format(selectedDate, "yyyy-MM-dd"),
            start_time: startTime,
            end_time: calculateEndTime(startTime, durationPrice.duration),
            client_name: clientName.trim(),
            client_phone: clientPhone.replace(/\s/g, ""),
            client_email: clientEmail.trim() || null,
            is_admin_booking: true,
            responsible_admin_id: selectedService?.responsible_admin_id || null,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar marcação");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "Sucesso", description: "Marcação criada com sucesso!" });
      onOpenChange(false);
      onBookingCreated();
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({ 
        title: "Erro", 
        description: error.message || "Não foi possível criar a marcação", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const durationPrice = getDurationAndPrice();

  // Generate time slots from 10:00 to 18:00
  const timeSlots = [];
  for (let h = 10; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 18 && m > 0) break;
      const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      timeSlots.push(time);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Nova Marcação - {format(selectedDate, "d 'de' MMMM", { locale: pt })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="912345678"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
            {isSearchingClient && (
              <p className="text-xs text-muted-foreground">A procurar cliente...</p>
            )}
            {existingClient && (
              <p className="text-xs text-green-600">Cliente encontrado: {existingClient.name}</p>
            )}
          </div>

          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cliente *</Label>
            <Input
              id="name"
              placeholder="Nome completo"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              disabled={!!existingClient}
            />
          </div>

          {/* Client Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              disabled={!!existingClient}
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Selection */}
          {selectedCategoryId && (
            <div className="space-y-2">
              <Label>Serviço *</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar serviço" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.name} - {formatPrice(svc.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Option Selection (if service has options) */}
          {selectedService?.has_options && availableOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Opção *</Label>
              <Select value={selectedOptionId} onValueChange={setSelectedOptionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar opção" />
                </SelectTrigger>
                <SelectContent>
                  {availableOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name} - {formatPrice(opt.price)} ({formatDuration(opt.duration_minutes)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>Hora de Início *</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration and Price Summary */}
          {durationPrice && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Duração:</span>
                <span className="font-medium">{formatDuration(durationPrice.duration)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Término:</span>
                <span className="font-medium">{calculateEndTime(startTime, durationPrice.duration)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Preço:</span>
                <span className="font-medium">{formatPrice(durationPrice.price)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "A criar..." : "Criar Marcação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminBookingDialog;