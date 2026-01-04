import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export interface WishlistItem {
  id: number;
  childId: number;
  title: string;
  publisher?: string | null;
  author?: string | null;
  isbn?: string | null;
  edition?: string | null;
  subject?: string | null;
  grade?: string | null;
  curriculum?: string | null;
  notes?: string | null;
  status: "active" | "fulfilled" | "cancelled";
  matchedListingId?: number | null;
  notifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  child?: {
    id: number;
    name?: string | null;
    grade: string;
  };
}

export interface CreateWishlistItemInput {
  childId: number;
  title: string;
  publisher?: string | null;
  author?: string | null;
  isbn?: string | null;
  edition?: string | null;
  subject?: string | null;
  grade?: string | null;
  curriculum?: string | null;
  notes?: string | null;
}

export interface UpdateWishlistItemInput {
  title?: string;
  publisher?: string | null;
  author?: string | null;
  isbn?: string | null;
  edition?: string | null;
  subject?: string | null;
  grade?: string | null;
  curriculum?: string | null;
  notes?: string | null;
  status?: "active" | "fulfilled" | "cancelled";
}

export function useWishlist(status?: string) {
  const queryClient = useQueryClient();

  // Get all wishlist items for the parent
  const {
    data: wishlistData,
    isLoading,
    error,
  } = useQuery<{ success: boolean; wishlistItems: WishlistItem[] }>({
    queryKey: ["wishlist", status],
    queryFn: async () => {
      const url = status
        ? `/api/wishlist?status=${status}`
        : "/api/wishlist";
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch wishlist");
      }

      return response.json();
    },
  });

  return {
    wishlistItems: wishlistData?.wishlistItems || [],
    isLoading,
    error,
  };
}

export function useWishlistByChild(childId: number | null) {
  const queryClient = useQueryClient();

  // Get wishlist items for a specific child
  const {
    data: wishlistData,
    isLoading,
    error,
  } = useQuery<{ success: boolean; wishlistItems: WishlistItem[] }>({
    queryKey: ["wishlist", "child", childId],
    queryFn: async () => {
      if (!childId) throw new Error("Child ID is required");

      const response = await fetch(`/api/wishlist/child/${childId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch child wishlist");
      }

      return response.json();
    },
    enabled: !!childId,
  });

  return {
    wishlistItems: wishlistData?.wishlistItems || [],
    isLoading,
    error,
  };
}

export function useCreateWishlistItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWishlistItemInput) => {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create wishlist item");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist", "child", variables.childId] });
      toast({
        title: "Success",
        description: "Wishlist item added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateWishlistItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateWishlistItemInput;
    }) => {
      const response = await fetch(`/api/wishlist/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update wishlist item");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "Success",
        description: "Wishlist item updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteWishlistItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/wishlist/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete wishlist item");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "Success",
        description: "Wishlist item deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

