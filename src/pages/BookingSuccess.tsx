import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const bookingId = searchParams.get("bookingId");

  useEffect(() => {
    if (!bookingId) {
      navigate("/booking");
      return;
    }

    const fetchBooking = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();
      
      if (data) {
        setBooking(data);
      }
    };

    fetchBooking();
  }, [bookingId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-light">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Booking Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {booking && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Date:</span> {format(new Date(booking.booking_date), 'PPP')}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Time:</span> {booking.time_slot}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Location:</span> {booking.location}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Litres:</span> {booking.litres.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Amount:</span> KSH {(booking.litres * 2).toLocaleString()}
                </p>
              </div>
            )}
            
            <div className="text-center space-y-4">
              <p className="text-lg">
                Your booking for <span className="font-semibold">{booking && format(new Date(booking.booking_date), 'PPP')}</span> at <span className="font-semibold">{booking?.time_slot}</span> has been confirmed!
              </p>
              <p className="text-muted-foreground">
                You will receive a message or call from our service providers to confirm the delivery details.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate("/profile")}
                variant="default"
                className="w-full sm:w-auto"
              >
                Rate Our Services
              </Button>
              <Button
                onClick={() => navigate("/booking")}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Make Another Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingSuccess;
