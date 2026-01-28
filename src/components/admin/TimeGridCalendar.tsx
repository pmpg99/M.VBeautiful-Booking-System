import { useState, useEffect, useMemo, useCallback } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingDetailsModal from "./BookingDetailsModal";

interface Booking {
  id: string;
  service_name: string;
  client_name: string;
  client_phone: string;
  client_email?: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_duration?: number;
}

interface ServiceInfo {
  name: string;
  responsible_admin_id: string | null;
  admin_username?: string;
  price: number;
}

interface TimeGridCalendarProps {
  bookings: Booking[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onDeleteBooking: (id: string) => void;
  onBookingsChange: () => void;
  canDelete: boolean;
  isFullAdmin: boolean;
  isPestanasAdmin: boolean;
}

// Business hours configuration
const GRID_START_HOUR = 9;
const GRID_END_HOUR = 20;
const HOUR_HEIGHT_PX = 60;
const MINUTE_HEIGHT_PX = HOUR_HEIGHT_PX / 60;

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const generateHours = () => {
  const hours: number[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    hours.push(h);
  }
  return hours;
};

// Therapist colors - Marta (Rose) vs Joana (Teal)
const getTherapistColor = (adminUsername?: string): { bg: string; text: string; border: string } => {
  if (adminUsername === "Jo.Visage" || adminUsername?.toLowerCase().includes("joana")) {
    return { 
      bg: "bg-teal-500/30", 
      text: "text-teal-950 dark:text-teal-100", 
      border: "border-l-teal-500" 
    };
  }
  // Default to Marta
  return { 
    bg: "bg-rose-500/30", 
    text: "text-rose-950 dark:text-rose-100", 
    border: "border-l-rose-500" 
  };
};

type ViewMode = "day" | "week";

const TimeGridCalendar = ({
  bookings,
  selectedDate,
  onDateChange,
  onDeleteBooking,
  onBookingsChange,
  canDelete,
}: TimeGridCalendarProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [weekBookings, setWeekBookings] = useState<Record<string, Booking[]>>({});
  const [servicesInfo, setServicesInfo] = useState<Record<string, ServiceInfo>>({});
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const hours = useMemo(() => generateHours(), []);

  // Fetch services with admin info
  useEffect(() => {
    const fetchServicesInfo = async () => {
      const { data } = await supabase
        .from("services")
        .select(`
          name,
          responsible_admin_id,
          price,
          profiles:responsible_admin_id (username)
        `);
      
      if (data) {
        const info: Record<string, ServiceInfo> = {};
        data.forEach((service: any) => {
          info[service.name] = {
            name: service.name,
            responsible_admin_id: service.responsible_admin_id,
            admin_username: service.profiles?.username,
            price: service.price,
          };
        });
        setServicesInfo(info);
      }
    };
    
    fetchServicesInfo();
  }, []);

  // Generate week days starting from Monday
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Fetch bookings for the week
  const fetchWeekBookings = useCallback(async () => {
    if (viewMode !== "week") return;
    
    const startDate = format(weekDays[0], "yyyy-MM-dd");
    const endDate = format(weekDays[6], "yyyy-MM-dd");
    
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .gte("booking_date", startDate)
      .lte("booking_date", endDate)
      .neq("status", "cancelled")
      .order("start_time");
    
    const grouped: Record<string, Booking[]> = {};
    (data || []).forEach((booking) => {
      if (!grouped[booking.booking_date]) {
        grouped[booking.booking_date] = [];
      }
      grouped[booking.booking_date].push(booking);
    });
    
    setWeekBookings(grouped);
  }, [viewMode, weekDays]);

  useEffect(() => {
    fetchWeekBookings();
  }, [fetchWeekBookings]);

  // Real-time subscription
  useEffect(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    const channel = supabase
      .channel(`bookings-grid-${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          onBookingsChange();
          if (viewMode === "week") {
            fetchWeekBookings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, onBookingsChange, viewMode, fetchWeekBookings]);

  const getBookingStyle = (booking: Booking) => {
    const startMinutes = timeToMinutes(booking.start_time);
    const endMinutes = timeToMinutes(booking.end_time);
    const durationMinutes = endMinutes - startMinutes;
    
    const gridStartMinutes = GRID_START_HOUR * 60;
    const topOffset = (startMinutes - gridStartMinutes) * MINUTE_HEIGHT_PX;
    const height = durationMinutes * MINUTE_HEIGHT_PX;

    return {
      top: `${topOffset}px`,
      height: `${Math.max(height, 28)}px`,
    };
  };

  const getFontSize = (booking: Booking): { name: string; service: string } => {
    const startMinutes = timeToMinutes(booking.start_time);
    const endMinutes = timeToMinutes(booking.end_time);
    const durationMinutes = endMinutes - startMinutes;
    const height = durationMinutes * MINUTE_HEIGHT_PX;

    if (height < 35) return { name: "text-[9px]", service: "text-[7px]" };
    if (height < 50) return { name: "text-[10px]", service: "text-[8px]" };
    if (height < 70) return { name: "text-xs", service: "text-[10px]" };
    return { name: "text-sm", service: "text-xs" };
  };

  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR + 1) * HOUR_HEIGHT_PX;

  const navigateDate = (direction: number) => {
    if (viewMode === "day") {
      onDateChange(addDays(selectedDate, direction));
    } else {
      onDateChange(addDays(selectedDate, direction * 7));
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const getTherapistName = (serviceName: string): string => {
    const info = servicesInfo[serviceName];
    if (info?.admin_username === "Jo.Visage") return "Joana";
    return "Marta";
  };

  const renderBookingBlock = (booking: Booking, isCompact: boolean = false) => {
    const style = getBookingStyle(booking);
    const fontSize = getFontSize(booking);
    const serviceInfo = servicesInfo[booking.service_name];
    const colors = getTherapistColor(serviceInfo?.admin_username);
    const therapistName = getTherapistName(booking.service_name);

    return (
      <div
        key={booking.id}
        onClick={() => handleBookingClick(booking)}
        className={cn(
          "absolute rounded-md border-l-4 px-1.5 py-0.5 overflow-hidden transition-all hover:shadow-lg hover:z-20 cursor-pointer",
          colors.bg,
          colors.border,
          colors.text,
          isCompact ? "left-0.5 right-0.5" : "left-1 right-1"
        )}
        style={style}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Client name + Service - most important info */}
          <p className={cn("font-bold truncate leading-tight", fontSize.name)}>
            {booking.client_name}
          </p>
          <p className={cn("truncate leading-tight opacity-90", fontSize.service)}>
            {booking.service_name}
          </p>
          {/* Therapist indicator for larger blocks */}
          {parseInt(style.height) >= 50 && (
            <p className={cn("opacity-70 leading-tight font-medium", fontSize.service)}>
              {therapistName} • {booking.start_time.slice(0, 5)}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderDayColumn = (date: Date, dayBookings: Booking[], isCompact: boolean = false) => {
    const isToday = isSameDay(date, new Date());
    const isSelected = isSameDay(date, selectedDate);

    return (
      <div
        key={date.toISOString()}
        className={cn(
          "relative flex-1 border-r border-border/30 last:border-r-0",
          isToday && "bg-primary/5"
        )}
        style={{ height: `${gridHeight}px` }}
        onClick={() => viewMode === "week" && onDateChange(date)}
      >
        {/* Hour lines */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-b border-border/20"
            style={{ top: `${(hour - GRID_START_HOUR) * HOUR_HEIGHT_PX}px` }}
          />
        ))}

        {/* Half-hour lines */}
        {hours.map((hour) => (
          <div
            key={`${hour}-half`}
            className="absolute left-0 right-0 border-b border-border/10 border-dashed"
            style={{ top: `${(hour - GRID_START_HOUR) * HOUR_HEIGHT_PX + 30}px` }}
          />
        ))}

        {/* Booking blocks */}
        {dayBookings.map((booking) => renderBookingBlock(booking, isCompact))}

        {/* Selection indicator for week view */}
        {viewMode === "week" && isSelected && (
          <div className="absolute inset-0 ring-2 ring-primary ring-inset pointer-events-none" />
        )}
      </div>
    );
  };

  // Prepare booking details for modal
  const getBookingDetailsForModal = () => {
    if (!selectedBooking) return null;
    const serviceInfo = servicesInfo[selectedBooking.service_name];
    return {
      ...selectedBooking,
      therapist: serviceInfo?.admin_username,
      price: serviceInfo?.price,
    };
  };

  return (
    <>
      <div className="bg-card rounded-lg border overflow-hidden">
        {/* Header with navigation and view toggle */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigateDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-lg font-display font-semibold ml-2">
              {viewMode === "day"
                ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: pt })
                : `${format(weekDays[0], "d MMM", { locale: pt })} - ${format(weekDays[6], "d MMM yyyy", { locale: pt })}`}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-rose-500/30 border-l-2 border-rose-500" />
                <span className="text-muted-foreground">Marta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-teal-500/30 border-l-2 border-teal-500" />
                <span className="text-muted-foreground">Joana</span>
              </div>
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="grid w-40 grid-cols-2">
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Day headers for week view */}
        {viewMode === "week" && (
          <div className="flex border-b">
            <div className="w-16 flex-shrink-0 border-r bg-muted/30" />
            {weekDays.map((date) => {
              const isToday = isSameDay(date, new Date());
              const isSelected = isSameDay(date, selectedDate);
              
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "flex-1 py-2 text-center border-r last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors",
                    isToday && "bg-primary/10",
                    isSelected && "bg-primary/20"
                  )}
                  onClick={() => onDateChange(date)}
                >
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(date, "EEE", { locale: pt })}
                  </p>
                  <p className={cn(
                    "text-xl font-semibold",
                    isToday && "text-primary"
                  )}>
                    {format(date, "d")}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Time grid */}
        <div className="flex overflow-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
          {/* Time labels column */}
          <div className="flex-shrink-0 w-16 border-r bg-muted/20">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[60px] border-b border-border/20 flex items-start justify-end pr-2 pt-0.5"
              >
                <span className="text-xs text-muted-foreground font-medium">
                  {hour.toString().padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {viewMode === "day" ? (
            renderDayColumn(selectedDate, bookings, false)
          ) : (
            <div className="flex flex-1">
              {weekDays.map((date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const dayBookings = weekBookings[dateStr] || [];
                return renderDayColumn(date, dayBookings, true);
              })}
            </div>
          )}
        </div>

        {/* Empty state for day view */}
        {viewMode === "day" && bookings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm bg-card/80 px-4 py-2 rounded-lg">
              Sem marcações para este dia
            </p>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={getBookingDetailsForModal()}
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onDelete={onDeleteBooking}
        onUpdate={() => {
          onBookingsChange();
          if (viewMode === "week") {
            fetchWeekBookings();
          }
        }}
        canDelete={canDelete}
        canEdit={canDelete}
      />
    </>
  );
};

export default TimeGridCalendar;
