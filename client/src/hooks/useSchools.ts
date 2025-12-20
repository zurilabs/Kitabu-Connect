import { useQuery } from "@tanstack/react-query";

interface School {
  id: string;
  name: string;
  location: string;
  latitude: string;
  longitude: string;
}

export function useSchools() {
  const { data, isLoading } = useQuery<{
    schools: School[];
  }>({
    queryKey: ["schools"],
    queryFn: async () => {
      const response = await fetch("/api/schools");

      if (!response.ok) {
        throw new Error("Failed to fetch schools");
      }

      return response.json();
    },
  });

  return {
    schools: data?.schools || [],
    isLoading,
  };
}
