import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Navigation } from "@/components/Navigation";

const TIME_SLOTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

const Booking = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [litres, setLitres] = useState<number>(1000);
  const [location, setLocation] = useState<string>("");
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
    // Only show slots as booked if they are confirmed or delivered
    const { data, error } = await supabase
      .from("bookings")
      .select("time_slot")
      .eq("booking_date", dateStr)
      .in("status", ["confirmed", "delivered"]);

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

    if (!location.trim()) {
      toast({
        title: "Error",
        description: "Please enter a delivery location",
        variant: "destructive",
      });
      return;
    }

    if (litres < 100 || litres > 50000) {
      toast({
        title: "Error",
        description: "Please enter a valid number of litres (100-50000)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const calculatedAmount = litres * 2; // KSH 2 per litre

    try {
      // Check if slot is already booked and confirmed/delivered
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("booking_date", dateStr)
        .eq("time_slot", selectedSlot)
        .in("status", ["confirmed", "delivered"])
        .maybeSingle();

      if (existingBooking) {
        toast({
          title: "Slot Unavailable",
          description: "This time slot has just been booked. Please select another slot.",
          variant: "destructive",
        });
        fetchBookedSlots();
        setLoading(false);
        return;
      }

      // Create booking first
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          booking_date: dateStr,
          time_slot: selectedSlot,
          status: "pending",
          litres: litres,
          location: location,
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

      // Initiate M-Pesa payment with calculated amount
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        "mpesa-payment",
        {
          body: {
            bookingId: booking.id,
            phoneNumber: profile.phone,
            amount: calculatedAmount,
          },
        }
      );

      if (paymentError) throw paymentError;

      if (paymentResult.success) {
        toast({
          title: "Payment Request Sent!",
          description: `Please check your phone and enter your M-Pesa PIN to pay KSH ${calculatedAmount.toLocaleString()}`,
        });

        // Navigate to success page
        navigate(`/booking-success?bookingId=${booking.id}`);
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
      <Navigation />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Book Your Water Tanker</h1>
            <p className="text-muted-foreground">Select date, time, and delivery details</p>
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

            {/* Booking Details & Time Slots */}
            <div className="space-y-6">
              {/* Booking Details */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Booking Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Delivery Location *</Label>
                    <Input
                      id="location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter your delivery address"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="litres">Number of Litres *</Label>
                    <Input
                      id="litres"
                      type="number"
                      value={litres}
                      onChange={(e) => setLitres(parseInt(e.target.value) || 0)}
                      min="100"
                      max="50000"
                      step="100"
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Amount to pay: <span className="font-semibold text-primary">KSH {(litres * 2).toLocaleString()}</span>
                    </p>
                  </div>
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
                      disabled={loading || !location.trim()}
                      className="w-full mt-4"
                      size="lg"
                    >
                      {loading ? "Processing..." : `Pay KSH ${(litres * 2).toLocaleString()} & Confirm`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
