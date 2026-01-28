import { useState, useEffect, useCallback } from "react";
import { format, getDay as getWeekDay } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarOff, Trash2, CalendarCheck, CalendarPlus } from "lucide-react";
import TimeGridCalendar from "./TimeGridCalendar";
import AdminBookingDialog from "./AdminBookingDialog";

interface Booking {
  id: string;
  service_name: string;
  client_name: string;
  client_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
}

interface BlockedTime {
  id: string;
  blocked_date: string;
  start_time: string | null;
  end_time: string | null;
  is_full_day: boolean;
  reason: string | null;
  service_category: string | null;
}

interface DateException {
  id: string;
  exception_date: string;
  reason: string | null;
  service_category: string | null;
}

interface AdminCalendarProps {
  isFullAdmin: boolean;
  isPestanasAdmin: boolean;
}

const AdminCalendar = ({ isFullAdmin, isPestanasAdmin }: AdminCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [dateExceptions, setDateExceptions] = useState<DateException[]>([]);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [isFullDay, setIsFullDay] = useState(true);
  const [blockStartTime, setBlockStartTime] = useState("10:00");
  const [blockEndTime, setBlockEndTime] = useState("18:30");
  const [blockReason, setBlockReason] = useState("");
  const [blockCategory, setBlockCategory] = useState<string>("all");
  const [unblockReason, setUnblockReason] = useState("");
  const [unblockCategory, setUnblockCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();

  const fetchBookingsAndBlocks = useCallback(async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Fetch bookings - exclude cancelled
    let bookingsQuery = supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", dateStr)
      .neq("status", "cancelled")
      .order("start_time");

    // If pestanas admin, filter by service category
    if (isPestanasAdmin && !isFullAdmin) {
      bookingsQuery = bookingsQuery.ilike("service_name", "%pestanas%");
    }

    const { data: bookingsData } = await bookingsQuery;
    setBookings(bookingsData || []);

    // Fetch blocked times
    const { data: blockedData } = await supabase
      .from("blocked_times")
      .select("*")
      .eq("blocked_date", dateStr);
    
    setBlockedTimes(blockedData || []);

    // Fetch date exceptions
    const { data: exceptionsData } = await supabase
      .from("date_exceptions")
      .select("*")
      .eq("exception_date", dateStr);
    
    setDateExceptions(exceptionsData || []);
  }, [isFullAdmin, isPestanasAdmin]);

  const handleRefreshBookings = useCallback(() => {
    if (selectedDate) {
      fetchBookingsAndBlocks(selectedDate);
    }
  }, [selectedDate, fetchBookingsAndBlocks]);

  useEffect(() => {
    if (selectedDate) {
      fetchBookingsAndBlocks(selectedDate);
    }
  }, [selectedDate, fetchBookingsAndBlocks]);

  const handleBlockTime = async () => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    
    const blockData: any = {
      blocked_date: format(selectedDate, "yyyy-MM-dd"),
      is_full_day: isFullDay,
      reason: blockReason || null,
      service_category: isFullAdmin ? (blockCategory === "all" ? null : blockCategory) : "pestanas",
    };

    if (!isFullDay) {
      blockData.start_time = blockStartTime;
      blockData.end_time = blockEndTime;
    }

    const { error } = await supabase
      .from("blocked_times")
      .insert(blockData);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível bloquear o horário.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Horário bloqueado com sucesso!",
      });
      setShowBlockDialog(false);
      setBlockReason("");
      setIsFullDay(true);
      fetchBookingsAndBlocks(selectedDate);
    }
    
    setIsLoading(false);
  };

  const handleDeleteBlock = async (blockId: string) => {
    const { error } = await supabase
      .from("blocked_times")
      .delete()
      .eq("id", blockId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o bloqueio.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Bloqueio removido com sucesso!",
      });
      if (selectedDate) {
        fetchBookingsAndBlocks(selectedDate);
      }
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      // Use centralized manage-booking Edge Function
      const { data, error } = await supabase.functions.invoke("manage-booking", {
        body: {
          action: "cancel",
          booking_id: bookingId,
          payload: {},
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso",
        description: "Marcação cancelada com sucesso!",
      });
      if (selectedDate) {
        fetchBookingsAndBlocks(selectedDate);
      }
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar a marcação.",
        variant: "destructive",
      });
    }
  };

  const handleUnblockDate = async () => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    
    const exceptionData = {
      exception_date: format(selectedDate, "yyyy-MM-dd"),
      reason: unblockReason || null,
      service_category: isFullAdmin ? (unblockCategory === "all" ? null : unblockCategory) : "pestanas",
    };

    const { error } = await supabase
      .from("date_exceptions")
      .insert(exceptionData);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível desbloquear o dia.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Dia desbloqueado com sucesso!",
      });
      setShowUnblockDialog(false);
      setUnblockReason("");
      fetchBookingsAndBlocks(selectedDate);
    }
    
    setIsLoading(false);
  };

  const handleDeleteException = async (exceptionId: string) => {
    const { error } = await supabase
      .from("date_exceptions")
      .delete()
      .eq("id", exceptionId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a exceção.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Exceção removida com sucesso!",
      });
      if (selectedDate) {
        fetchBookingsAndBlocks(selectedDate);
      }
    }
  };

  // Check if selected date is a recurring day off (Sun=0, Mon=1)
  const isRecurringDayOff = selectedDate ? [0, 1].includes(getWeekDay(selectedDate)) : false;

  return (
    <div className="space-y-6">
      {/* Main Time Grid Calendar */}
      {selectedDate && (
        <TimeGridCalendar
          bookings={bookings}
          selectedDate={selectedDate}
          onDateChange={(date) => setSelectedDate(date)}
          onDeleteBooking={handleDeleteBooking}
          onBookingsChange={handleRefreshBookings}
          canDelete={isFullAdmin || isPestanasAdmin}
          isFullAdmin={isFullAdmin}
          isPestanasAdmin={isPestanasAdmin}
        />
      )}

      {/* Admin Actions - Collapsible sidebar */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Mini Calendar for quick navigation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Navegação Rápida</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={pt}
              className="rounded-md border scale-90 origin-top"
            />
            
            {(isFullAdmin || isPestanasAdmin) && (
              <div className="space-y-2 mt-2 px-2">
                <Button 
                  onClick={() => setShowBookingDialog(true)} 
                  size="sm"
                  className="w-full"
                  disabled={!selectedDate}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Nova Marcação
                </Button>
                
                <Button 
                  onClick={() => setShowBlockDialog(true)} 
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!selectedDate}
                >
                  <CalendarOff className="h-4 w-4 mr-2" />
                  Bloquear
                </Button>
                
                {isRecurringDayOff && (
                  <Button 
                    onClick={() => setShowUnblockDialog(true)} 
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={!selectedDate}
                  >
                    <CalendarCheck className="h-4 w-4 mr-2" />
                    Desbloquear Folga
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blocked Times */}
        {blockedTimes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-destructive" />
                Bloqueios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-2 max-h-48 overflow-auto">
                {blockedTimes.map((block) => (
                  <div 
                    key={block.id} 
                    className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium text-xs">
                        {block.is_full_day 
                          ? "Dia inteiro" 
                          : `${block.start_time} - ${block.end_time}`}
                      </p>
                      {block.reason && (
                        <p className="text-xs text-muted-foreground">{block.reason}</p>
                      )}
                    </div>
                    {(isFullAdmin || isPestanasAdmin) && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteBlock(block.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Exceptions */}
        {dateExceptions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-green-600" />
                Exceções
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-2 max-h-48 overflow-auto">
                {dateExceptions.map((exception) => (
                  <div 
                    key={exception.id} 
                    className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium text-xs">Folga desbloqueada</p>
                      {exception.reason && (
                        <p className="text-xs text-muted-foreground">{exception.reason}</p>
                      )}
                    </div>
                    {(isFullAdmin || isPestanasAdmin) && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteException(exception.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Bloquear Horário - {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: pt })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="fullDay">Dia inteiro</Label>
              <Switch
                id="fullDay"
                checked={isFullDay}
                onCheckedChange={setIsFullDay}
              />
            </div>

            {!isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Hora início</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Hora fim</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {isFullAdmin && (
              <div className="space-y-2">
                <Label htmlFor="category">Categoria de serviços</Label>
                <Select value={blockCategory} onValueChange={setBlockCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os serviços</SelectItem>
                    <SelectItem value="nails">Nail's</SelectItem>
                    <SelectItem value="threading">Threading</SelectItem>
                    <SelectItem value="makeup">Maquilhagem</SelectItem>
                    <SelectItem value="laser">Depilação a Laser</SelectItem>
                    <SelectItem value="pestanas">Pestanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                placeholder="Ex: Férias, Formação..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBlockTime} disabled={isLoading}>
              {isLoading ? "A bloquear..." : "Bloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Dialog */}
      <Dialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Desbloquear Folga - {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: pt })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Este dia é uma folga semanal (Domingo/Segunda). Criar uma exceção permite que clientes marquem serviços neste dia.
            </p>

            {isFullAdmin && (
              <div className="space-y-2">
                <Label htmlFor="unblockCategory">Categoria de serviços</Label>
                <Select value={unblockCategory} onValueChange={setUnblockCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os serviços</SelectItem>
                    <SelectItem value="nails">Nail's</SelectItem>
                    <SelectItem value="threading">Threading</SelectItem>
                    <SelectItem value="makeup">Maquilhagem</SelectItem>
                    <SelectItem value="laser">Depilação a Laser</SelectItem>
                    <SelectItem value="pestanas">Pestanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="unblockReason">Motivo (opcional)</Label>
              <Input
                id="unblockReason"
                placeholder="Ex: Domingo especial, Evento..."
                value={unblockReason}
                onChange={(e) => setUnblockReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnblockDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUnblockDate} disabled={isLoading}>
              {isLoading ? "A desbloquear..." : "Desbloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Booking Dialog */}
      {selectedDate && (
        <AdminBookingDialog
          open={showBookingDialog}
          onOpenChange={setShowBookingDialog}
          selectedDate={selectedDate}
          onBookingCreated={handleRefreshBookings}
          isFullAdmin={isFullAdmin}
          isPestanasAdmin={isPestanasAdmin}
        />
      )}
    </div>
  );
};

export default AdminCalendar;
