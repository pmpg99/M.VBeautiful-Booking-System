import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, lastDayOfMonth, getDay, subDays, isSameDay } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { usePortugueseHolidays, isPortugueseHoliday } from "@/hooks/usePortugueseHolidays";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

// BookingData interface for Level 3 support
export interface BookingData {
  name: string;
  price: number;
  duration_minutes: number;
  category_id: string;
  responsible_admin_id?: string | null;
}

interface BookingCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingData | null;
}

interface BookedSlot {
  start_time: string;
  end_time: string;
  service_duration: number;
}

interface BlockedTime {
  id: string;
  blocked_date: string;
  start_time: string | null;
  end_time: string | null;
  is_full_day: boolean;
  service_category: string | null;
}

interface DateException {
  id: string;
  exception_date: string;
  service_category: string | null;
}

// Portuguese phone validation (9 digits starting with 9)
const isValidPortuguesePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return /^9\d{8}$/.test(cleanPhone) || /^351?9\d{8}$/.test(cleanPhone);
};

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
};

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

// Get the last weekend (Saturday and Sunday) of a given month
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

// Convert time string to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if two time ranges overlap
const doTimesOverlap = (
  start1: number, end1: number, 
  start2: number, end2: number
): boolean => {
  return start1 < end2 && end1 > start2;
};

const BookingCalendar = ({ isOpen, onClose, bookingData }: BookingCalendarProps) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [step, setStep] = useState<"auth" | "date" | "time" | "details">("auth");
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [adminLeaves, setAdminLeaves] = useState<string[]>([]);
  const [dateExceptions, setDateExceptions] = useState<DateException[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Honeypot field - invisible to users, bots fill this out
  const [website, setWebsite] = useState("");
  const [categorySlug, setCategorySlug] = useState<string>("");

  const portugueseHolidays = usePortugueseHolidays(6);
  const { settings, getDaysOffNumbers } = useBusinessSettings();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session) {
        setStep("date");
        // Pre-fill client data if available
        const { data: clientData } = await supabase
          .from("clients")
          .select("name, phone, email")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (clientData) {
          setName(clientData.name || "");
          setPhone(clientData.phone ? formatPhoneNumber(clientData.phone) : "");
          setEmail(clientData.email || "");
        }
      } else {
        setStep("auth");
      }
    };

    if (isOpen) {
      checkAuth();
    }
  }, [isOpen]);

  // Fetch category to determine if laser service
  useEffect(() => {
    const fetchCategory = async () => {
      if (!bookingData) return;
      
      const { data } = await supabase
        .from("service_categories")
        .select("slug")
        .eq("id", bookingData.category_id)
        .single();
      
      if (data) {
        setCategorySlug(data.slug);
      }
    };
    
    if (isOpen && bookingData) {
      fetchCategory();
    }
  }, [isOpen, bookingData]);

  const isLaserService = categorySlug.includes("laser");

  const timeSlots = useMemo(() => {
    if (!bookingData) return [];
    const hours = isLaserService ? settings.laserWorkingHours : settings.workingHours;
    return generateTimeSlots(bookingData.duration_minutes, hours.start, hours.end);
  }, [bookingData, isLaserService, settings]);

  // Get available laser dates for next 6 months
  const laserAvailableDates = useMemo(() => {
    const dates: Date[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const targetMonth = now.getMonth() + i;
      const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      dates.push(...getLastWeekendOfMonth(targetYear, normalizedMonth));
    }
    return dates.filter(d => d >= now);
  }, []);

  // Fetch admin leaves (full day blocks) and date exceptions for calendar display
  useEffect(() => {
    const fetchAdminLeavesAndExceptions = async () => {
      // Fetch full day blocks
      const { data: blocksData, error: blocksError } = await supabase
        .from('blocked_times')
        .select('blocked_date')
        .eq('is_full_day', true);
      
      if (!blocksError && blocksData) {
        setAdminLeaves(blocksData.map(d => d.blocked_date));
      }
      
      // Fetch date exceptions (unblocked days)
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('date_exceptions')
        .select('id, exception_date, service_category');
      
      if (!exceptionsError && exceptionsData) {
        setDateExceptions(exceptionsData);
      }
    };
    
    if (isOpen) fetchAdminLeavesAndExceptions();
  }, [isOpen]);

  // Fetch booked slots and blocked times when date is selected
  useEffect(() => {
    const fetchSlotsAndBlocks = async () => {
      if (!selectedDate) return;
      
      setIsLoadingBookings(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Fetch booked slots using secure RPC function (no PII exposed)
        // Filter by responsible admin to only show conflicts for the same professional
        const { data: slotsData, error: slotsError } = await supabase
          .rpc('get_booked_slots', { 
            p_booking_date: dateStr,
            p_admin_id: bookingData?.responsible_admin_id || null
          });
        
        if (slotsError) {
          console.error('Error fetching booked slots:', slotsError);
        } else {
          setBookedSlots((slotsData as unknown as BookedSlot[]) || []);
        }
        
        // Fetch blocked times
        const { data: blockedData, error: blockedError } = await supabase
          .from('blocked_times')
          .select('id, blocked_date, start_time, end_time, is_full_day, service_category')
          .eq('blocked_date', dateStr);
        
        if (blockedError) {
          console.error('Error fetching blocked times:', blockedError);
        } else {
          setBlockedTimes(blockedData || []);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoadingBookings(false);
      }
    };

    fetchSlotsAndBlocks();
  }, [selectedDate]);

  // Check if a time slot would overlap with existing bookings or blocked times
  const isTimeSlotBlocked = (time: string): boolean => {
    if (!bookingData) return false;
    
    const newStart = timeToMinutes(time);
    const newEnd = newStart + bookingData.duration_minutes;
    
    // Check against blocked times
    const isBlockedByAdmin = blockedTimes.some(block => {
      // If full day blocked, all times are blocked
      if (block.is_full_day) {
        return true;
      }
      
      // Check time overlap
      if (block.start_time && block.end_time) {
        const blockStart = timeToMinutes(block.start_time.substring(0, 5));
        const blockEnd = timeToMinutes(block.end_time.substring(0, 5));
        return doTimesOverlap(newStart, newEnd, blockStart, blockEnd);
      }
      
      return false;
    });
    
    if (isBlockedByAdmin) return true;
    
    // Check against booked slots
    if (bookedSlots.length === 0) return false;
    
    return bookedSlots.some(slot => {
      const existingStart = timeToMinutes(slot.start_time.substring(0, 5));
      const existingEnd = timeToMinutes(slot.end_time.substring(0, 5));
      return doTimesOverlap(newStart, newEnd, existingStart, existingEnd);
    });
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return true;
    
    // Block Portuguese holidays
    if (isPortugueseHoliday(date, portugueseHolidays)) return true;
    
    // Block admin leaves (full day blocks)
    const dateStr = format(date, 'yyyy-MM-dd');
    if (adminLeaves.includes(dateStr)) return true;
    
    // Check recurring days off (Sun/Mon by default)
    const dayOfWeek = getDay(date);
    const daysOff = getDaysOffNumbers();
    
    if (daysOff.includes(dayOfWeek)) {
      // Check if admin has created an exception for this date
      const hasException = dateExceptions.some(
        ex => ex.exception_date === dateStr && 
        (ex.service_category === null || ex.service_category === categorySlug)
      );
      // If no exception exists, the day is blocked
      if (!hasException) return true;
    }
    
    // Laser services: additional restriction to last weekend only
    if (isLaserService) {
      return !laserAvailableDates.some(d => isSameDay(d, date));
    }
    
    return false;
  };

  // Handle phone input with formatting and validation
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
    
    if (formatted.length > 0 && !isValidPortuguesePhone(formatted)) {
      setPhoneError("Número inválido. Use formato português (9XX XXX XXX)");
    } else {
      setPhoneError("");
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) setStep("time");
  };

  const handleTimeSelect = (time: string) => {
    // Check for overlap before selecting
    if (isTimeSlotBlocked(time)) {
      toast.error("Este horário sobrepõe uma marcação já existente. Por favor, escolha outro horário.");
      return;
    }
    setSelectedTime(time);
    setStep("details");
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2).replace(".", ",")}€`;
  };

  const handleSubmit = async () => {
    // Honeypot check - if this field is filled, it's a bot
    if (website) {
      console.warn("Honeypot triggered - likely bot submission");
      // Pretend success to not alert the bot
      toast.success("Marcação confirmada!");
      handleClose();
      return;
    }

    if (!selectedDate || !selectedTime || !name || !phone || !bookingData) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (!isValidPortuguesePhone(phone)) {
      toast.error("Por favor, insira um número de telemóvel português válido");
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedDate = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: pt });
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Calculate end time based on service duration
      const startMinutes = timeToMinutes(selectedTime);
      const endMinutes = startMinutes + bookingData.duration_minutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      
      // Use centralized manage-booking Edge Function
      const { data, error: bookingError } = await supabase.functions.invoke('manage-booking', {
        body: {
          action: "create",
          payload: {
            service_name: bookingData.name,
            service_duration: bookingData.duration_minutes,
            booking_date: dateStr,
            start_time: selectedTime,
            end_time: endTime,
            client_name: name,
            client_phone: phone.replace(/\s/g, ''),
            client_email: email || null,
            responsible_admin_id: bookingData.responsible_admin_id || null
          }
        }
      });
      
      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        toast.error("Erro ao criar a marcação. Por favor, tente novamente.");
        setIsSubmitting(false);
        return;
      }

      if (data?.error) {
        console.error('Booking error:', data.error);
        if (data.error.includes('sobrepõe')) {
          toast.error("Este horário sobrepõe uma marcação já existente. Por favor, escolha outro horário.");
          setStep("time");
        } else if (data.error.includes('telefone')) {
          toast.error(data.error);
        } else {
          toast.error(data.error);
        }
        setIsSubmitting(false);
        return;
      }
      
      // Success - notifications are now handled by the Edge Function
      toast.success(
        `Marcação confirmada! ${bookingData.name} para ${formattedDate} às ${selectedTime}.`
      );
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedTime("");
      setName("");
      setPhone("");
      setEmail("");
      setStep(isAuthenticated ? "date" : "auth");
      setBookedSlots([]);
      onClose();
    } catch (err) {
      console.error('Error submitting booking:', err);
      toast.error("Erro ao processar a marcação. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(isAuthenticated ? "date" : "auth");
    setSelectedDate(undefined);
    setSelectedTime("");
    setName("");
    setPhone("");
    setEmail("");
    setWebsite("");
    setBookedSlots([]);
    onClose();
  };

  const goBack = () => {
    if (step === "details") {
      setSelectedTime("");
      setStep("time");
    } else if (step === "time") {
      setSelectedDate(undefined);
      setStep("date");
    }
  };

  if (!bookingData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {step === "auth" && "Iniciar Sessão"}
            {step === "date" && "Escolha a Data"}
            {step === "time" && "Escolha a Hora"}
            {step === "details" && "Confirme os Detalhes"}
          </DialogTitle>
        </DialogHeader>

        {/* Auth step - redirect to login */}
        {step === "auth" && (
          <div className="space-y-4 py-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Para fazer uma marcação, precisa de criar uma conta ou iniciar sessão.
                </p>
                <Button onClick={() => navigate("/cliente")} className="w-full">
                  Iniciar Sessão / Registar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Date selection step */}
        {step === "date" && (
          <div className="space-y-4">
            <Card className="p-4">
              <p className="font-medium">{bookingData.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDuration(bookingData.duration_minutes)} • {formatPrice(bookingData.price)}
              </p>
            </Card>
            
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              locale={pt}
              className="rounded-md border mx-auto"
            />
          </div>
        )}

        {/* Time selection step */}
        {step === "time" && selectedDate && (
          <div className="space-y-4">
            <Card className="p-4">
              <p className="font-medium">{bookingData.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
              </p>
            </Card>

            {isLoadingBookings ? (
              <p className="text-center text-muted-foreground">A carregar horários...</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                {timeSlots.map((time) => {
                  const isBlocked = isTimeSlotBlocked(time);
                  return (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTimeSelect(time)}
                      disabled={isBlocked}
                      className={isBlocked ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      {time}
                    </Button>
                  );
                })}
              </div>
            )}

            <Button variant="ghost" onClick={goBack} className="w-full">
              ← Voltar
            </Button>
          </div>
        )}

        {/* Details confirmation step */}
        {step === "details" && (
          <div className="space-y-4">
            <Card className="p-4">
              <p className="font-medium">{bookingData.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })} às {selectedTime}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDuration(bookingData.duration_minutes)} • {formatPrice(bookingData.price)}
              </p>
            </Card>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="O seu nome"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telemóvel *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="912 345 678"
                  required
                />
                {phoneError && (
                  <p className="text-xs text-destructive">{phoneError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              {/* Honeypot field - hidden from users */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <Input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={goBack} className="w-full sm:w-auto">
                ← Voltar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !name || !phone || !!phoneError}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "A confirmar..." : "Confirmar Marcação"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingCalendar;