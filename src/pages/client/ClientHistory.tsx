import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Calendar } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/client/ClientLayout";

interface Booking {
  id: string;
  service_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
}

const ClientHistory = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
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
          .select("id, service_name, booking_date, start_time, end_time")
          .eq("client_phone", clientData.phone.replace(/\s/g, ""))
          .lt("booking_date", today)
          .order("booking_date", { ascending: false });

        setBookings(data || []);
      }
      setLoading(false);
    };

    fetchHistory();
  }, []);

  return (
    <ClientLayout>
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl mb-6">Histórico</h1>

        {loading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Ainda não tem histórico de marcações</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card key={booking.id} className="opacity-80">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{booking.service_name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(booking.booking_date), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {booking.start_time.substring(0, 5)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientHistory;
