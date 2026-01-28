import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format, getDay, lastDayOfMonth, subDays, isSameDay, addHours, isBefore } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { usePortugueseHolidays, isPortugueseHoliday } from "@/hooks/usePortugueseHolidays";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronLeft } from "lucide-react";

interface RescheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    service_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    service_duration: number;
    responsible_admin_id?: string | null;
  } | null;
  onReschedule: () => void;
}

interface BookedSlot {
  start_time: string;
  end_time: string;
  service_duration: number;
}

// Generate time slots based on working hours
const generateTimeSlots = (serviceDuration: number, startHour: string, endHour: string): string[] => {
  const slots: string[] = [];
  const [startH, startM] = startHour.split(':').map(Number);
  const [endH, endM] = endHour.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
  }
  return slots;
};

// Convert time string to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Get the last weekend of a given month
const getLastWeekendOfMonth = (year: number, month: number): Date[] => {
  const lastDay = lastDayOfMonth(new Date(year, month));
  const lastDayOfWeek = getDay(lastDay);
  
  let lastSunday: Date;
  if (lastDayOfWeek === 0) {
    lastSunday = lastDay;
  } else {
    lastSunday = subDays(lastDay, lastDayOfWeek);
  }
  
  const lastSaturday = subDays(lastSunday, 1);
  return [lastSaturday, lastSunday];
};

const RescheduleDialog = ({ isOpen, onClose, booking, onReschedule }: RescheduleDialogProps) => {
  const [step, setStep] = useState<"date" | "time">("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categorySlug, setCategorySlug] = useState<string>("");

  const portugueseHolidays = usePortugueseHolidays(6);
  const { settings, getDaysOffNumbers } = useBusinessSettings();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && booking) {
      setStep("date");
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      
      // Fetch category slug
      const fetchCategory = async () => {
        const { data } = await supabase
          .from("services")
          .select("service_categories(slug)")
          .eq("name", booking.service_name)
          .maybeSingle();
        
        if (data?.service_categories) {
          setCategorySlug((data.service_categories as any).slug || "");
        }
      };
      fetchCategory();
    }
  }, [isOpen, booking]);

  const isLaserService = categorySlug.includes("laser");

  const timeSlots = useMemo(() => {
    if (!booking) return [];
    const hours = isLaserService ? settings.laserWorkingHours : settings.workingHours;
    return generateTimeSlots(booking.service_duration, hours.start, hours.end);
  }, [booking, isLaserService, settings]);

  // Get available laser dates for next 6 months
  const laserAvailableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    
    for (let i = 0; i < 6; i++) {
      const month = (today.getMonth() + i) % 12;
      const year = today.getFullYear() + Math.floor((today.getMonth() + i) / 12);
      dates.push(...getLastWeekendOfMonth(year, month));
    }
    
    return dates.filter(d => d >= today);
  }, []);

  // Fetch booked slots when date changes
  const fetchBookedSlots = useCallback(async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Get the responsible_admin_id from the booking being rescheduled
    const adminId = booking?.responsible_admin_id || null;
    
    const { data: slotsData } = await supabase
      .rpc('get_booked_slots', { 
        p_booking_date: dateStr,
        p_admin_id: adminId 
      });
    
    setBookedSlots((slotsData as unknown as BookedSlot[]) || []);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots(selectedDate);
    }
  }, [selectedDate, fetchBookedSlots]);

  const daysOffNumbers = useMemo(() => getDaysOffNumbers(), [getDaysOffNumbers]);

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Minimum 24h ahead for rescheduling
    const minDate = addHours(new Date(), 24);
    if (isBefore(date, minDate)) return true;
    
    // Check days off
    const dayOfWeek = date.getDay();
    if (daysOffNumbers.includes(dayOfWeek)) return true;
    
    // Check holidays
    if (isPortugueseHoliday(date, portugueseHolidays)) return true;
    
    // Laser service date restrictions
    if (isLaserService) {
      const isInLastWeekend = laserAvailableDates.some(d => isSameDay(d, date));
      if (!isInLastWeekend) return true;
    }
    
    return false;
  };

  const isTimeSlotBooked = (slot: string): boolean => {
    if (!booking) return false;
    const slotMinutes = timeToMinutes(slot);
    const slotEndMinutes = slotMinutes + booking.service_duration;
    
    return bookedSlots.some(booked => {
      const bookedStartMinutes = timeToMinutes(booked.start_time);
      const bookedEndMinutes = timeToMinutes(booked.end_time);
      
      return (slotMinutes < bookedEndMinutes && slotEndMinutes > bookedStartMinutes);
    });
  };

  const handleReschedule = async () => {
    if (!booking || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const startMinutes = timeToMinutes(selectedTime);
      const endMinutes = startMinutes + booking.service_duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;

      // Use centralized manage-booking Edge Function
      const { data, error } = await supabase.functions.invoke("manage-booking", {
        body: {
          action: "reschedule",
          booking_id: booking.id,
          payload: {
            new_date: format(selectedDate, "yyyy-MM-dd"),
            new_start_time: `${selectedTime}:00`,
            new_end_time: endTime,
          },
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Marcação reagendada com sucesso!");
      onReschedule();
      onClose();
    } catch (error: any) {
      console.error("Error rescheduling:", error);
      toast.error(error.message || "Erro ao reagendar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Reagendar Marcação
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Service info */}
          <div className="mb-4 p-3 rounded-lg bg-muted/50">
            <p className="font-medium">{booking.service_name}</p>
            <p className="text-sm text-muted-foreground">
              Duração: {booking.service_duration} min
            </p>
          </div>

          {step === "date" && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Selecione a nova data:
              </p>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date) setStep("time");
                  }}
                  disabled={isDateDisabled}
                  locale={pt}
                  className="rounded-md border"
                />
              </div>
            </div>
          )}

          {step === "time" && selectedDate && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setStep("date")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm">
                  <span className="text-muted-foreground">Data:</span>{" "}
                  <span className="font-medium">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
                  </span>
                </p>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                Selecione o novo horário:
              </p>

              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {timeSlots.map((slot) => {
                  const isBooked = isTimeSlotBooked(slot);
                  return (
                    <Button
                      key={slot}
                      variant={selectedTime === slot ? "default" : "outline"}
                      size="sm"
                      disabled={isBooked}
                      onClick={() => setSelectedTime(slot)}
                      className={cn(
                        "text-sm",
                        isBooked && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {slot}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {step === "time" && (
            <Button
              onClick={handleReschedule}
              disabled={!selectedTime || isSubmitting}
            >
              {isSubmitting ? "A reagendar..." : "Confirmar Reagendamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleDialog;