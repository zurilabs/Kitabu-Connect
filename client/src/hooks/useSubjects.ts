import { useQuery } from "@tanstack/react-query";

interface Subject {
  id: number;
  name: string;
  description: string | null;
  iconUrl: string | null;
  sortOrder: number | null;
}

export function useSubjects() {
  const { data, isLoading } = useQuery<{
    success: boolean;
    subjects: Subject[];
  }>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await fetch("/api/subjects");

      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }

      return response.json();
    },
  });

  return {
    subjects: data?.subjects || [],
    isLoading,
  };
}






