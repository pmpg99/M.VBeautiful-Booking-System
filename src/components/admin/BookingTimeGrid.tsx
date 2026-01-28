import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  service_name: string;
  client_name: string;
  client_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_duration?: number;
}

interface BookingTimeGridProps {
  bookings: Booking[];
  selectedDate: Date;
  onDeleteBooking: (id: string) => void;
  onBookingsChange: () => void;
  canDelete: boolean;
}

// Convert time string "HH:MM:SS" or "HH:MM" to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Business hours configuration
const GRID_START_HOUR = 9; // 9:00
const GRID_END_HOUR = 20; // 20:00
const HOUR_HEIGHT_PX = 60; // Height per hour in pixels
const MINUTE_HEIGHT_PX = HOUR_HEIGHT_PX / 60;

// Generate array of hours for the grid
const generateHours = () => {
  const hours: number[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    hours.push(h);
  }
  return hours;
};

// Service category colors for visual distinction
const getServiceColor = (serviceName: string): { bg: string; text: string; border: string } => {
  const name = serviceName.toLowerCase();
  
  if (name.includes("laser")) {
    return { bg: "bg-purple-500/20", text: "text-purple-900 dark:text-purple-100", border: "border-purple-500/50" };
  }
  if (name.includes("pestanas")) {
    return { bg: "bg-blue-500/20", text: "text-blue-900 dark:text-blue-100", border: "border-blue-500/50" };
  }
  if (name.includes("nail") || name.includes("unhas") || name.includes("gel")) {
    return { bg: "bg-pink-500/20", text: "text-pink-900 dark:text-pink-100", border: "border-pink-500/50" };
  }
  if (name.includes("threading") || name.includes("linha")) {
    return { bg: "bg-amber-500/20", text: "text-amber-900 dark:text-amber-100", border: "border-amber-500/50" };
  }
  if (name.includes("maquil") || name.includes("make")) {
    return { bg: "bg-rose-500/20", text: "text-rose-900 dark:text-rose-100", border: "border-rose-500/50" };
  }
  
  return { bg: "bg-primary/20", text: "text-primary-foreground dark:text-primary", border: "border-primary/50" };
};

const BookingTimeGrid = ({ 
  bookings, 
  selectedDate, 
  onDeleteBooking, 
  onBookingsChange,
  canDelete 
}: BookingTimeGridProps) => {
  const hours = useMemo(() => generateHours(), []);

  // Subscribe to real-time updates
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    
    const channel = supabase
      .channel(`bookings-${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `booking_date=eq.${dateStr}`
        },
        () => {
          onBookingsChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, onBookingsChange]);

  // Calculate booking block position and height
  const getBookingStyle = (booking: Booking) => {
    const startMinutes = timeToMinutes(booking.start_time);
    const endMinutes = timeToMinutes(booking.end_time);
    const durationMinutes = endMinutes - startMinutes;
    
    const gridStartMinutes = GRID_START_HOUR * 60;
    const topOffset = (startMinutes - gridStartMinutes) * MINUTE_HEIGHT_PX;
    const height = durationMinutes * MINUTE_HEIGHT_PX;

    return {
      top: `${topOffset}px`,
      height: `${Math.max(height, 30)}px`, // Minimum 30px height
      minHeight: "30px"
    };
  };

  // Determine font size based on block height
  const getFontSize = (booking: Booking): { name: string; service: string } => {
    const startMinutes = timeToMinutes(booking.start_time);
    const endMinutes = timeToMinutes(booking.end_time);
    const durationMinutes = endMinutes - startMinutes;
    const height = durationMinutes * MINUTE_HEIGHT_PX;

    if (height < 40) {
      return { name: "text-[10px]", service: "text-[8px]" };
    }
    if (height < 60) {
      return { name: "text-xs", service: "text-[10px]" };
    }
    if (height < 90) {
      return { name: "text-sm", service: "text-xs" };
    }
    return { name: "text-base", service: "text-sm" };
  };

  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR + 1) * HOUR_HEIGHT_PX;

  return (
    <div className="relative flex border rounded-lg overflow-hidden bg-card">
      {/* Time labels column */}
      <div className="flex-shrink-0 w-16 border-r bg-muted/30">
        {hours.map((hour) => (
          <div 
            key={hour} 
            className="h-[60px] border-b border-border/50 flex items-start justify-end pr-2 pt-1"
          >
            <span className="text-xs text-muted-foreground font-medium">
              {hour.toString().padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Bookings grid */}
      <div className="flex-1 relative" style={{ height: `${gridHeight}px` }}>
        {/* Hour lines */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-b border-border/30"
            style={{ top: `${(hour - GRID_START_HOUR) * HOUR_HEIGHT_PX}px` }}
          />
        ))}

        {/* Half-hour lines */}
        {hours.map((hour) => (
          <div
            key={`${hour}-half`}
            className="absolute left-0 right-0 border-b border-border/15 border-dashed"
            style={{ top: `${(hour - GRID_START_HOUR) * HOUR_HEIGHT_PX + 30}px` }}
          />
        ))}

        {/* Booking blocks */}
        {bookings.map((booking) => {
          const style = getBookingStyle(booking);
          const fontSize = getFontSize(booking);
          const colors = getServiceColor(booking.service_name);
          
          return (
            <div
              key={booking.id}
              className={cn(
                "absolute left-1 right-1 rounded-md border-l-4 px-2 py-1 overflow-hidden transition-all hover:shadow-md group",
                colors.bg,
                colors.border,
                colors.text
              )}
              style={style}
            >
              <div className="flex items-start justify-between h-full">
                <div className="flex-1 min-w-0 overflow-hidden">
                  {/* Client name - prominent */}
                  <p className={cn("font-semibold truncate leading-tight", fontSize.name)}>
                    {booking.client_name}
                  </p>
                  {/* Service name */}
                  <p className={cn("truncate opacity-80 leading-tight", fontSize.service)}>
                    {booking.service_name}
                  </p>
                  {/* Time (only show if enough space) */}
                  {parseInt(style.height) >= 50 && (
                    <p className={cn("opacity-60 leading-tight", fontSize.service)}>
                      {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                    </p>
                  )}
                </div>
                
                {/* Delete button */}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-destructive/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBooking(booking.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {bookings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Sem marcações para este dia
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingTimeGrid;
