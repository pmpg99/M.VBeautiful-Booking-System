import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, CalendarX, CalendarDays, AlertCircle } from "lucide-react";
import { format, addHours, isBefore, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/client/ClientLayout";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RescheduleDialog from "@/components/client/RescheduleDialog";

interface Booking {
  id: string;
  service_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_duration: number;
  status: string;
}

const ClientBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBookings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: clientData } = await supabase
      .from("clients")
      .select("phone")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (clientData) {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("bookings")
        .select("id, service_name, booking_date, start_time, end_time, service_duration, status")
        .eq("client_phone", clientData.phone.replace(/\s/g, ""))
        .gte("booking_date", today)
        .neq("status", "cancelled")
        .order("booking_date", { ascending: true });

      setBookings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Check if booking can be modified (more than 24h before)
  const canModifyBooking = (booking: Booking): boolean => {
    const bookingDateTime = parseISO(`${booking.booking_date}T${booking.start_time}`);
    const minTime = addHours(new Date(), 24);
    return isBefore(minTime, bookingDateTime);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setIsCancelling(true);
    try {
      // Use centralized manage-booking Edge Function
      const { data, error } = await supabase.functions.invoke("manage-booking", {
        body: {
          action: "cancel",
          booking_id: selectedBooking.id,
          payload: {},
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      // Close dialog first and clear state
      setCancelDialogOpen(false);
      setSelectedBooking(null);
      
      // Refresh bookings to remove cancelled one from list
      await fetchBookings();
      
      // Show success message after UI is updated
      toast.success("Marcação cancelada com sucesso", {
        description: "A sua marcação foi cancelada e removida da lista.",
        duration: 5000,
      });
    } catch (error: any) {
      console.error("Error cancelling:", error);
      toast.error(error.message || "Erro ao cancelar. Tente novamente.");
    } finally {
      setIsCancelling(false);
    }
  };

  const openCancelDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const openRescheduleDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setRescheduleDialogOpen(true);
  };

  return (
    <ClientLayout>
      <div className="max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display text-2xl">Marcações</h1>
          <Button onClick={() => navigate("/")} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nova Marcação
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">Não tem marcações agendadas</p>
              <Button onClick={() => navigate("/")}>
                Fazer uma marcação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const canModify = canModifyBooking(booking);
              
              return (
                <Card key={booking.id}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{booking.service_name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(booking.booking_date), "EEEE, dd 'de' MMMM", { locale: pt })}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                          </p>
                        </div>
                        <Badge variant="default">Confirmada</Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2 border-t">
                        {canModify ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => openRescheduleDialog(booking)}
                            >
                              <CalendarDays className="w-4 h-4 mr-1" />
                              Reagendar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-destructive hover:text-destructive"
                              onClick={() => openCancelDialog(booking)}
                            >
                              <CalendarX className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            <span>Alterações não permitidas a menos de 24h do serviço</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Marcação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja cancelar esta marcação?
              {selectedBooking && (
                <span className="block mt-2 font-medium text-foreground">
                  {selectedBooking.service_name} - {format(new Date(selectedBooking.booking_date), "dd/MM/yyyy")} às {selectedBooking.start_time.substring(0, 5)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "A cancelar..." : "Confirmar Cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <RescheduleDialog
        isOpen={rescheduleDialogOpen}
        onClose={() => {
          setRescheduleDialogOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        onReschedule={fetchBookings}
      />
    </ClientLayout>
  );
};

export default ClientBookings;