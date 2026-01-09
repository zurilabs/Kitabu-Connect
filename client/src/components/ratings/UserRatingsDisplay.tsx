import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ThumbsUp, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface UserRating {
  id: number;
  reviewerId: string;
  reviewerName: string;
  ratingType: string;
  overallRating: number;
  communicationRating: number | null;
  accuracyRating: number | null;
  timelinesRating: number | null;
  conditionRating: number | null;
  professionalismRating: number | null;
  reviewText: string | null;
  tags: string | null;
  isAnonymous: boolean;
  responseText: string | null;
  createdAt: string;
}

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<string, number>;
  categoryAverages: {
    communication: number;
    accuracy: number;
    timeliness: number;
    condition: number;
    professionalism: number;
  };
}

interface UserRatingsDisplayProps {
  userId: string;
  ratingType?: "seller" | "buyer" | "swapper";
  limit?: number;
}

export function UserRatingsDisplay({ userId, ratingType, limit = 10 }: UserRatingsDisplayProps) {
  const [showAll, setShowAll] = useState(false);

  const { data: ratingsData, isLoading: isLoadingRatings } = useQuery<{
    success: boolean;
    ratings: UserRating[];
  }>({
    queryKey: ["ratings", "user", userId, ratingType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (ratingType) params.append("ratingType", ratingType);
      params.append("limit", String(limit));

      const response = await fetch(`/api/ratings/user/${userId}?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch ratings");
      }

      return response.json();
    },
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery<{
    success: boolean;
    stats: RatingStats;
  }>({
    queryKey: ["ratings", "user", userId, "stats"],
    queryFn: async () => {
      const response = await fetch(`/api/ratings/user/${userId}/stats`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch rating stats");
      }

      return response.json();
    },
  });

  const ratings = ratingsData?.ratings || [];
  const stats = statsData?.stats;

  const displayedRatings = showAll ? ratings : ratings.slice(0, 5);

  const StarDisplay = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );

  if (isLoadingRatings || isLoadingStats) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!ratings.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ratings & Reviews</CardTitle>
          <CardDescription>No ratings yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>This user hasn't received any ratings yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Ratings & Reviews</CardTitle>
            <CardDescription>
              {stats?.totalRatings || 0} review{stats?.totalRatings !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          {stats && (
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</span>
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              </div>
              <p className="text-sm text-muted-foreground">Average rating</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Category Averages */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pb-4 border-b">
            {stats.categoryAverages.communication > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Communication</p>
                <div className="flex items-center justify-center">
                  <span className="font-semibold">{stats.categoryAverages.communication.toFixed(1)}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 ml-0.5" />
                </div>
              </div>
            )}
            {stats.categoryAverages.accuracy > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                <div className="flex items-center justify-center">
                  <span className="font-semibold">{stats.categoryAverages.accuracy.toFixed(1)}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 ml-0.5" />
                </div>
              </div>
            )}
            {stats.categoryAverages.timeliness > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Timeliness</p>
                <div className="flex items-center justify-center">
                  <span className="font-semibold">{stats.categoryAverages.timeliness.toFixed(1)}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 ml-0.5" />
                </div>
              </div>
            )}
            {stats.categoryAverages.condition > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Condition</p>
                <div className="flex items-center justify-center">
                  <span className="font-semibold">{stats.categoryAverages.condition.toFixed(1)}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 ml-0.5" />
                </div>
              </div>
            )}
            {stats.categoryAverages.professionalism > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Professional</p>
                <div className="flex items-center justify-center">
                  <span className="font-semibold">{stats.categoryAverages.professionalism.toFixed(1)}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 ml-0.5" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Individual Ratings */}
        <div className="space-y-4">
          {displayedRatings.map((rating) => {
            const tags = rating.tags ? JSON.parse(rating.tags) : [];

            return (
              <div key={rating.id} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {rating.isAnonymous ? "Anonymous" : rating.reviewerName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {rating.ratingType}
                      </Badge>
                    </div>
                    <StarDisplay rating={rating.overallRating} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(rating.createdAt), "MMM d, yyyy")}
                  </span>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Review Text */}
                {rating.reviewText && (
                  <p className="text-sm text-muted-foreground mb-2">{rating.reviewText}</p>
                )}

                {/* Response */}
                {rating.responseText && (
                  <div className="mt-3 pl-4 border-l-2 border-muted">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Response from seller:
                    </p>
                    <p className="text-sm">{rating.responseText}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show More Button */}
        {ratings.length > 5 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `Show All ${ratings.length} Reviews`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
