import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Droplet, LogOut, Clock } from "lucide-react";

const TIME_SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

const Booking = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots();
    }
  }, [selectedDate]);

  const fetchBookedSlots = async () => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("bookings")
      .select("time_slot")
      .eq("booking_date", dateStr);

    if (error) {
      console.error("Error fetching bookings:", error);
      return;
    }

    const slots = data?.map((booking) => booking.time_slot) || [];
    setBookedSlots(slots);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot || !user) return;

    setLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      // Create booking first
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          booking_date: dateStr,
          time_slot: selectedSlot,
          status: "pending",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Get user profile for phone number
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile?.phone) {
        throw new Error("Phone number not found. Please update your profile.");
      }

      // Initiate M-Pesa payment (500 KES for water tanker)
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        "mpesa-payment",
        {
          body: {
            bookingId: booking.id,
            phoneNumber: profile.phone,
            amount: 500,
          },
        }
      );

      if (paymentError) throw paymentError;

      if (paymentResult.success) {
        toast({
          title: "Payment Request Sent!",
          description: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
        });

        // Refresh booked slots
        fetchBookedSlots();
        setSelectedSlot(null);
      } else {
        throw new Error(paymentResult.error || "Payment initiation failed");
      }
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const availableSlots = TIME_SLOTS.filter((slot) => !bookedSlots.includes(slot));
  const allSlotsFull = availableSlots.length === 0;

  return (
    <div className="min-h-screen bg-gradient-light">
      {/* Header */}
      <header className="bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Droplet className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Marwasco</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/profile")}>
              My Bookings
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Book Your Water Tanker</h1>
            <p className="text-muted-foreground">Select a date and time slot for delivery</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
                <CardDescription>Choose your preferred delivery date</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Time Slots */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Available Time Slots</CardTitle>
                <CardDescription>
                  {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allSlotsFull ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-destructive" />
                    <p className="font-semibold text-destructive">BOOKINGS FULL</p>
                    <p className="text-sm">Please choose another date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {TIME_SLOTS.map((slot) => {
                      const isBooked = bookedSlots.includes(slot);
                      const isSelected = selectedSlot === slot;

                      return (
                        <Button
                          key={slot}
                          variant={isSelected ? "default" : "outline"}
                          disabled={isBooked}
                          onClick={() => setSelectedSlot(slot)}
                          className="h-14"
                        >
                          {slot}
                          {isBooked && <span className="ml-2 text-xs">(Full)</span>}
                        </Button>
                      );
                    })}
                  </div>
                )}

                {selectedSlot && !allSlotsFull && (
                  <Button
                    onClick={handleBooking}
                    disabled={loading}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {loading ? "Booking..." : "Confirm Booking"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
