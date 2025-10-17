import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Trash2, FileDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Navigation } from "@/components/Navigation";

const Admin = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
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
      return;
    }

    // Only fetch bookings if admin verified
    fetchBookings();
  };

  const fetchBookings = async () => {
    setLoading(true);
    
    try {
      // Fetch bookings first
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("booking_date", { ascending: false })
        .order("time_slot", { ascending: true });

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        toast({
          title: "Error",
          description: "Failed to load bookings",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Fetch profiles separately
      const userIds = [...new Set(bookingsData.map(b => b.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, phone, email")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Merge bookings with profiles
      const bookingsWithProfiles = bookingsData.map(booking => ({
        ...booking,
        profiles: profilesData?.find(p => p.user_id === booking.user_id) || null
      }));

      setBookings(bookingsWithProfiles);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
    let query = supabase
      .from("admin_transaction_audit")
      .select("*");

    // Apply filters if selected
    if (filterMonth && filterMonth !== "all" && filterYear) {
      const monthNum = parseInt(filterMonth);
      const yearNum = parseInt(filterYear);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
      
      query = query
        .gte("payment_date", startDate.toISOString())
        .lte("payment_date", endDate.toISOString());
    } else if (filterYear) {
      const startDate = new Date(parseInt(filterYear), 0, 1);
      const endDate = new Date(parseInt(filterYear), 11, 31);
      
      query = query
        .gte("payment_date", startDate.toISOString())
        .lte("payment_date", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Failed to export audit",
        variant: "destructive",
      });
      return;
    }

    if (!data || data.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions found for the selected period",
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
    
    // Generate filename based on filters
    let filename = "marwasco-audit";
    if (filterMonth && filterMonth !== "all" && filterYear) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      filename += `-${monthNames[parseInt(filterMonth) - 1]}-${filterYear}`;
    } else if (filterYear) {
      filename += `-${filterYear}`;
    } else {
      filename += `-${format(new Date(), "yyyy-MM-dd")}`;
    }
    filename += ".csv";
    
    a.download = filename;
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
            <div className="flex flex-col gap-4">
              <CardTitle>All Bookings</CardTitle>
              
              {/* Export Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Filter Year</label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Filter Month (Optional)</label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="All months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="2">February</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                      <SelectItem value="5">May</SelectItem>
                      <SelectItem value="6">June</SelectItem>
                      <SelectItem value="7">July</SelectItem>
                      <SelectItem value="8">August</SelectItem>
                      <SelectItem value="9">September</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                      <SelectItem value="11">November</SelectItem>
                      <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={exportAudit} variant="outline" className="shrink-0">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
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
                              <span className="font-medium">Amount:</span> KSH {Math.round((booking.litres * 7000) / 13000).toLocaleString()}
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
