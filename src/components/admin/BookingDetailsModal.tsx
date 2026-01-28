import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Phone, Mail, Clock, Euro, User, Scissors, Calendar, X, Pencil, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookingDetails {
  id: string;
  service_name: string;
  client_name: string;
  client_phone: string;
  client_email?: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_duration?: number;
  therapist?: string;
  price?: number;
}

interface BookingDetailsModalProps {
  booking: BookingDetails | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

const getTherapistInfo = (therapist?: string): { name: string; color: string; bgColor: string } => {
  if (therapist === "Jo.Visage" || therapist?.toLowerCase().includes("joana")) {
    return { name: "Joana", color: "text-teal-700 dark:text-teal-300", bgColor: "bg-teal-500/20" };
  }
  return { name: "Marta", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-500/20" };
};

const BookingDetailsModal = ({ 
  booking, 
  open, 
  onClose, 
  onDelete,
  onUpdate,
  canDelete = false,
  canEdit = false
}: BookingDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedEmail, setEditedEmail] = useState("");

  if (!booking) return null;

  const therapistInfo = getTherapistInfo(booking.therapist);
  const bookingDate = new Date(booking.booking_date);

  const handleStartEdit = () => {
    setEditedName(booking.client_name);
    setEditedPhone(booking.client_phone);
    setEditedEmail(booking.client_email || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName("");
    setEditedPhone("");
    setEditedEmail("");
  };

  const handleSave = async () => {
    if (!editedName.trim() || !editedPhone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      // Use centralized manage-booking Edge Function
      const { data, error } = await supabase.functions.invoke("manage-booking", {
        body: {
          action: "update_client_info",
          booking_id: booking.id,
          payload: {
            client_name: editedName.trim(),
            client_phone: editedPhone.trim(),
            client_email: editedEmail.trim() || null
          }
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Dados do cliente atualizados");
      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      console.error("Error updating booking:", error);
      toast.error(error.message || "Erro ao atualizar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = (isEditing ? editedPhone : booking.client_phone).replace(/\D/g, "");
    const formattedPhone = phone.startsWith("351") ? phone : `351${phone}`;
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
  };

  const handleCall = () => {
    window.open(`tel:${isEditing ? editedPhone : booking.client_phone}`, "_blank");
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Marcação" : "Detalhes da Marcação"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client Info */}
          <div className="space-y-3">
            {isEditing ? (
              <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome do Cliente *</Label>
                  <Input
                    id="edit-name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone *</Label>
                  <Input
                    id="edit-phone"
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    placeholder="912345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email (opcional)</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{booking.client_name}</p>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={handleStartEdit}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Contact buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={handleCall}
                  >
                    <Phone className="h-4 w-4" />
                    {booking.client_phone}
                  </Button>
                  <Button 
                    variant="default" 
                    size="icon"
                    onClick={handleWhatsApp}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </Button>
                </div>

                {booking.client_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{booking.client_email}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Service & Date Info */}
          <div className="grid gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Scissors className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{booking.service_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={therapistInfo.bgColor}>
                    {therapistInfo.name}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(bookingDate, "EEEE, d 'de' MMMM", { locale: pt })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(bookingDate, "yyyy", { locale: pt })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                </p>
                {booking.service_duration && (
                  <p className="text-sm text-muted-foreground">
                    {booking.service_duration} minutos
                  </p>
                )}
              </div>
            </div>

            {booking.price !== undefined && booking.price > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
                <Euro className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-lg">{booking.price.toFixed(2)}€</p>
                  <p className="text-sm text-muted-foreground">Preço do serviço</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isEditing ? (
            <>
              <Button variant="outline" className="flex-1" onClick={handleCancelEdit} disabled={isSaving}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "A guardar..." : "Guardar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Fechar
              </Button>
              {canDelete && onDelete && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    onDelete(booking.id);
                    handleClose();
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar Marcação
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailsModal;
