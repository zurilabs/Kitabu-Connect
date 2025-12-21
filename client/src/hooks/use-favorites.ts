import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get list of favorited book IDs for the current user
 */
export function useFavoriteIds() {
  return useQuery<number[]>({
    queryKey: ["favoriteIds"],
    queryFn: async () => {
      const response = await fetch("/api/favorites/ids", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch favorite IDs");
      }

      const data = await response.json();
      return data.favoriteIds || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to get all favorites with full book details
 */
export function useFavorites(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["favorites", limit, offset],
    queryFn: async () => {
      const response = await fetch(
        `/api/favorites?limit=${limit}&offset=${offset}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch favorites");
      }

      return response.json();
    },
  });
}

/**
 * Hook to get favorites count
 */
export function useFavoritesCount() {
  return useQuery<number>({
    queryKey: ["favoritesCount"],
    queryFn: async () => {
      const response = await fetch("/api/favorites/count", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch favorites count");
      }

      const data = await response.json();
      return data.count;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to check if a specific book is favorited
 */
export function useIsFavorited(listingId: number) {
  const { data: favoriteIds = [] } = useFavoriteIds();
  return favoriteIds.includes(listingId);
}
