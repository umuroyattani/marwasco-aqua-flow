import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Droplet, LogOut, Calendar, Clock, CreditCard, User, MapPin } from "lucide-react";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchProfile(session.user.id);
    fetchBookings(session.user.id);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }
    setProfile(data);
  };

  const fetchBookings = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        ratings (
          id,
          rating,
          comment
        )
      `)
      .eq("user_id", userId)
      .order("booking_date", { ascending: false })
      .order("time_slot", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive",
      });
      console.error(error);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const openRatingDialog = (booking: any) => {
    setSelectedBooking(booking);
    setRating(5);
    setComment("");
    setRatingDialogOpen(true);
  };

  const submitRating = async () => {
    if (!selectedBooking) return;

    setSubmittingRating(true);
    try {
      const { error } = await supabase
        .from("ratings")
        .insert({
          user_id: user.id,
          booking_id: selectedBooking.id,
          rating: rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Thank you for your feedback!",
      });

      setRatingDialogOpen(false);
      fetchBookings(user.id); // Refresh to update UI
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const skipRating = () => {
    setRatingDialogOpen(false);
    setSelectedBooking(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-500";
      case "delivered":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "payment_failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const hasRated = (bookingId: string) => {
    return bookings.some((b) => b.id === bookingId && b.ratings && b.ratings.length > 0);
  };

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
            <Button variant="outline" onClick={() => navigate("/booking")}>
              New Booking
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
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">View your bookings and account details</p>
          </div>

          {/* Profile Info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">{profile?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-semibold">{profile?.phone || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold">{profile?.email || user?.email || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bookings List */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                My Bookings
              </CardTitle>
              <CardDescription>
                {bookings.length === 0 ? "No bookings yet" : `${bookings.length} booking(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading bookings...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No bookings yet</p>
                  <Button onClick={() => navigate("/booking")} className="mt-4">
                    Make Your First Booking
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <Card key={booking.id} className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">
                                {format(new Date(booking.booking_date), "PPP")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{booking.time_slot}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <span className="text-sm">{booking.location}</span>
                            </div>
                            <p className="text-sm">
                              <strong>Litres:</strong> {booking.litres.toLocaleString()}
                            </p>
                            <p className="text-sm">
                              <strong>Amount:</strong> KSH {(booking.litres * 2).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {booking.mpesa_receipt_number
                                  ? `Paid - ${booking.mpesa_receipt_number}`
                                  : "Payment Pending"}
                              </span>
                            </div>
                          </div>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </div>

                        {booking.status === "delivered" && !hasRated(booking.id) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRatingDialog(booking)}
                            className="mt-4 w-full"
                          >
                            Rate Our Service
                          </Button>
                        )}

                        {booking.ratings && booking.ratings.length > 0 && (
                          <div className="mt-4 p-3 bg-muted rounded text-sm">
                            <p>
                              <strong>Your Rating:</strong> {booking.ratings[0].rating}/5 ⭐
                            </p>
                            {booking.ratings[0].comment && (
                              <p className="text-muted-foreground italic mt-1">
                                "{booking.ratings[0].comment}"
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Our Service</DialogTitle>
            <DialogDescription>
              How was your experience with our water delivery service?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rating (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={rating === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRating(value)}
                  >
                    {value} ⭐
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Comment (Optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us about your experience..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={skipRating} disabled={submittingRating}>
              Skip
            </Button>
            <Button onClick={submitRating} disabled={submittingRating}>
              {submittingRating ? "Submitting..." : "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
