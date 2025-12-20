import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CreateBookListingData {
  // Basic Information
  title: string;
  isbn?: string;
  author: string;
  publisher?: string;
  edition?: string;
  publicationYear?: number;

  // Classification
  subject: string;
  classGrade: string;
  curriculum?: string;
  term?: string;
  language?: string;
  bindingType?: string;
  region?: string;

  // Condition & Pricing
  condition: "New" | "Like New" | "Good" | "Fair";
  conditionNotes?: string;
  price: number;
  originalRetailPrice?: number;
  negotiable?: boolean;
  quantityAvailable?: number;

  // Description & Photos
  description?: string;
  primaryPhotoUrl?: string;
  additionalPhotos?: string[];
}

interface BookListing extends CreateBookListingData {
  id: number;
  sellerId: string;
  listingStatus: string;
  listingType: string;
  viewsCount: number;
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
  photos?: Array<{
    id: number;
    photoUrl: string;
    displayOrder: number;
  }>;
}

export function useBookListing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all book listings
  const { data: listings, isLoading: isLoadingListings } = useQuery<{
    success: boolean;
    listings: BookListing[];
  }>({
    queryKey: ["books"],
    queryFn: async () => {
      const response = await fetch("/api/books", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch book listings");
      }

      return response.json();
    },
  });

  // Fetch current user's listings
  const { data: myListings, isLoading: isLoadingMyListings } = useQuery<{
    success: boolean;
    listings: BookListing[];
  }>({
    queryKey: ["my-books"],
    queryFn: async () => {
      const response = await fetch("/api/my-books", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch my listings");
      }

      return response.json();
    },
  });

  // Fetch single book listing
  const fetchBookListing = (id: number) => {
    return useQuery<{
      success: boolean;
      listing: BookListing;
    }>({
      queryKey: ["book", id],
      queryFn: async () => {
        const response = await fetch(`/api/books/${id}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch book listing");
        }

        return response.json();
      },
    });
  };

  // Create book listing mutation
  const createListing = useMutation({
    mutationFn: async (data: CreateBookListingData) => {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create book listing");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["my-books"] });
      toast({
        title: "Success!",
        description: "Your book has been listed successfully.",
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

  // Update book listing mutation
  const updateListing = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateBookListingData> }) => {
      const response = await fetch(`/api/books/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update book listing");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["my-books"] });
      queryClient.invalidateQueries({ queryKey: ["book", variables.id] });
      toast({
        title: "Success!",
        description: "Your book listing has been updated.",
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

  // Delete book listing mutation
  const deleteListing = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/books/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete book listing");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["my-books"] });
      toast({
        title: "Success!",
        description: "Your book listing has been deleted.",
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

  return {
    listings: listings?.listings || [],
    isLoadingListings,
    myListings: myListings?.listings || [],
    isLoadingMyListings,
    fetchBookListing,
    createListing,
    updateListing,
    deleteListing,
  };
}
