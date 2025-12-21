import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  listingId: number;
  initialIsFavorited?: boolean;
  variant?: "default" | "icon";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function FavoriteButton({
  listingId,
  initialIsFavorited = false,
  variant = "icon",
  size = "icon",
  className,
}: FavoriteButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/favorites/${listingId}/toggle`, {
        method: "PUT",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update favorites");
      }

      return response.json();
    },
    onMutate: async () => {
      // Optimistic update
      setIsFavorited(!isFavorited);
    },
    onSuccess: (data) => {
      // Update actual state from server response
      setIsFavorited(data.isFavorited);

      toast({
        title: data.isFavorited ? "Added to Favorites" : "Removed from Favorites",
        description: data.isFavorited
          ? "Book added to your favorites list"
          : "Book removed from your favorites list",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favoriteIds"] });
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update on error
      setIsFavorited(!isFavorited);

      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMutation.mutate();
  };

  return (
    <Button
      variant={variant === "icon" ? "ghost" : "outline"}
      size={size}
      onClick={handleClick}
      disabled={toggleMutation.isPending}
      className={cn(
        "transition-colors",
        isFavorited && "text-red-500 hover:text-red-600",
        className
      )}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn(
          "h-5 w-5",
          size === "sm" && "h-4 w-4",
          size === "lg" && "h-6 w-6",
          isFavorited && "fill-current"
        )}
      />
      {variant === "default" && (
        <span className="ml-2">{isFavorited ? "Favorited" : "Favorite"}</span>
      )}
    </Button>
  );
}
