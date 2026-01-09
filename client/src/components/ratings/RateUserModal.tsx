import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revieweeId: string;
  revieweeName: string;
  orderId?: number;
  swapOrderId?: number;
  cycleId?: string;
  ratingType: "seller" | "buyer" | "swapper";
}

const ratingCategories = {
  seller: [
    { key: "communicationRating", label: "Communication", description: "Responsiveness and clarity" },
    { key: "accuracyRating", label: "Accuracy", description: "Book matched description" },
    { key: "conditionRating", label: "Condition", description: "Book condition as described" },
    { key: "professionalismRating", label: "Professionalism", description: "Overall conduct" },
  ],
  buyer: [
    { key: "communicationRating", label: "Communication", description: "Responsiveness and clarity" },
    { key: "timelinesRating", label: "Timeliness", description: "Prompt payment" },
    { key: "professionalismRating", label: "Professionalism", description: "Overall conduct" },
  ],
  swapper: [
    { key: "communicationRating", label: "Communication", description: "Responsiveness and clarity" },
    { key: "accuracyRating", label: "Accuracy", description: "Book matched description" },
    { key: "conditionRating", label: "Condition", description: "Book condition as described" },
    { key: "timelinesRating", label: "Timeliness", description: "On-time delivery" },
  ],
};

const quickTags = [
  "Great communication",
  "Fast delivery",
  "Book as described",
  "Friendly",
  "Professional",
  "Honest",
  "Reliable",
  "Would trade again",
];

export function RateUserModal({
  open,
  onOpenChange,
  revieweeId,
  revieweeName,
  orderId,
  swapOrderId,
  cycleId,
  ratingType,
}: RateUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const categories = ratingCategories[ratingType];

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId,
          swapOrderId,
          cycleId,
          revieweeId,
          ratingType,
          overallRating,
          ...categoryRatings,
          reviewText: reviewText.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          isAnonymous,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit rating");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!",
      });

      // Refresh ratings data
      queryClient.invalidateQueries({ queryKey: ["ratings"] });
      queryClient.invalidateQueries({ queryKey: ["user", revieweeId] });

      // Reset form
      setOverallRating(0);
      setCategoryRatings({});
      setReviewText("");
      setSelectedTags([]);
      setIsAnonymous(false);

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Submit Rating",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStarClick = (rating: number, category?: string) => {
    if (category) {
      setCategoryRatings((prev) => ({ ...prev, [category]: rating }));
    } else {
      setOverallRating(rating);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (rating: number) => void; label?: string }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
      {label && <span className="ml-2 text-sm text-muted-foreground">{label}</span>}
    </div>
  );

  const canSubmit = overallRating > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate {revieweeName}</DialogTitle>
          <DialogDescription>
            Share your experience to help the community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Rating */}
          <div className="space-y-2">
            <Label>Overall Experience *</Label>
            <StarRating
              value={overallRating}
              onChange={setOverallRating}
            />
            {overallRating > 0 && (
              <p className="text-sm text-muted-foreground">
                {overallRating === 5 ? "Excellent!" : overallRating === 4 ? "Great" : overallRating === 3 ? "Good" : overallRating === 2 ? "Fair" : "Needs improvement"}
              </p>
            )}
          </div>

          {/* Category Ratings */}
          <div className="space-y-4">
            <Label>Detailed Ratings (Optional)</Label>
            {categories.map((category) => (
              <div key={category.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{category.label}</p>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <StarRating
                  value={categoryRatings[category.key] || 0}
                  onChange={(rating) => handleStarClick(rating, category.key)}
                />
              </div>
            ))}
          </div>

          {/* Quick Tags */}
          <div className="space-y-2">
            <Label>Quick Tags (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {quickTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review">Written Review (Optional)</Label>
            <Textarea
              id="review"
              placeholder="Share more details about your experience..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={1000}
              disabled={submitRatingMutation.isPending}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reviewText.length}/1000 characters
            </p>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
              disabled={submitRatingMutation.isPending}
            />
            <Label htmlFor="anonymous" className="cursor-pointer text-sm">
              Post review anonymously
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitRatingMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => submitRatingMutation.mutate()}
            disabled={!canSubmit || submitRatingMutation.isPending}
          >
            {submitRatingMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
