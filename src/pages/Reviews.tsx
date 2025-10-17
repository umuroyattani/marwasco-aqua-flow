import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    name: string;
  } | null;
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    fetchReviews();
  };

  const fetchReviews = async () => {
    setLoading(true);

    try {
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("id, rating, comment, created_at, user_id")
        .order("created_at", { ascending: false });

      if (ratingsError) {
        console.error("Error fetching reviews:", ratingsError);
        toast({
          title: "Error",
          description: "Failed to load reviews",
          variant: "destructive",
        });
        return;
      }

      if (!ratingsData || ratingsData.length === 0) {
        setReviews([]);
        setAverageRating(0);
        setLoading(false);
        return;
      }

      // Fetch profiles for the reviews
      const userIds = [...new Set(ratingsData.map(r => r.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);

      // Merge reviews with profiles
      const reviewsWithProfiles = ratingsData.map(rating => ({
        ...rating,
        profiles: profilesData?.find(p => p.user_id === rating.user_id) || null
      }));

      setReviews(reviewsWithProfiles);

      // Calculate average rating
      const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
      setAverageRating(Math.round(avg * 10) / 10);
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-light">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-center">Customer Reviews</CardTitle>
            {reviews.length > 0 && (
              <div className="text-center mt-4">
                <div className="flex justify-center items-center gap-2 mb-2">
                  {renderStars(Math.round(averageRating))}
                </div>
                <p className="text-2xl font-bold text-primary">{averageRating} out of 5</p>
                <p className="text-sm text-muted-foreground">Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No reviews yet</p>
                <p className="text-sm text-muted-foreground">Be the first to share your experience!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {review.profiles?.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{review.profiles?.name || "Anonymous"}</h3>
                            <span className="text-sm text-muted-foreground">{formatDate(review.created_at)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 mb-3">
                            {renderStars(review.rating)}
                          </div>
                          
                          {review.comment && (
                            <p className="text-sm text-muted-foreground">{review.comment}</p>
                          )}
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

export default Reviews;
