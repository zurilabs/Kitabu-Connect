import { useQuery } from "@tanstack/react-query";

interface Publisher {
  id: number;
  name: string;
  country: string | null;
  websiteUrl: string | null;
}

export function usePublishers() {
  const { data, isLoading } = useQuery<{
    success: boolean;
    publishers: Publisher[];
  }>({
    queryKey: ["publishers"],
    queryFn: async () => {
      const response = await fetch("/api/publishers");

      if (!response.ok) {
        throw new Error("Failed to fetch publishers");
      }

      return response.json();
    },
  });

  return {
    publishers: data?.publishers || [],
    isLoading,
  };
}
