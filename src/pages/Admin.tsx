import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Trash2, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Navigation } from "@/components/Navigation";

const Admin = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
    fetchBookings();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user has admin role
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!role) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/booking");
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*, profiles(name, phone, email)")
      .order("booking_date", { ascending: false })
      .order("time_slot", { ascending: true });

    if (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Booking ${newStatus === 'delivered' ? 'marked as delivered' : `status updated to ${newStatus}`}`,
      });
      fetchBookings();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "confirmed":
        return "bg-blue-500";
      case "delivered":
        return "bg-green-500";
      case "payment_failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });
      fetchBookings();
    }
  };

  const exportAudit = async () => {
    const { data, error } = await supabase
      .from("admin_transaction_audit")
      .select("*");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to export audit",
        variant: "destructive",
      });
      return;
    }

    // Convert to CSV
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => JSON.stringify(row[header] || "")).join(",")
      ),
    ].join("\n");

    // Download file
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marwasco-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Audit report exported successfully",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-light">
      <Navigation />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Bookings</CardTitle>
              <Button onClick={exportAudit} variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export Audit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading bookings...</p>
            ) : bookings.length === 0 ? (
              <p className="text-center text-muted-foreground">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4">
                        {/* Customer Info */}
                        <div className="space-y-2 border-b pb-4">
                          <p className="font-bold text-lg">
                            {booking.profiles?.name || "Unknown"}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <p className="text-muted-foreground">
                              📞 {booking.profiles?.phone || "No phone"}
                            </p>
                            <p className="text-muted-foreground">
                              ✉️ {booking.profiles?.email || "No email"}
                            </p>
                          </div>
                        </div>

                        {/* Booking Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-sm">
                              <span className="font-medium">Date:</span> {format(new Date(booking.booking_date), 'PPP')}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Time:</span> {booking.time_slot}
                            </p>
                            <p className="text-sm flex items-start gap-1">
                              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                              <span><span className="font-medium">Location:</span> {booking.location}</span>
                            </p>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm">
                              <span className="font-medium">Litres:</span> {booking.litres.toLocaleString()}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Amount:</span> KSH {(booking.litres * 2).toLocaleString()}
                            </p>
                            {booking.mpesa_receipt_number && (
                              <p className="text-sm text-green-600">
                                ✓ Receipt: {booking.mpesa_receipt_number}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status and Actions */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t pt-4">
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                          
                          <div className="flex flex-wrap gap-2">
                            {booking.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateBookingStatus(booking.id, "confirmed")}
                              >
                                Confirm Payment
                              </Button>
                            )}
                            {booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateBookingStatus(booking.id, "delivered")}
                              >
                                Mark as Delivered
                              </Button>
                            )}
                            {booking.status !== 'payment_failed' && booking.status !== 'delivered' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateBookingStatus(booking.id, "payment_failed")}
                              >
                                Mark Failed
                              </Button>
                            )}
                            {(booking.status === 'pending' || booking.status === 'payment_failed') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteBooking(booking.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
