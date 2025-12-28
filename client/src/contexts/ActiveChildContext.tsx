import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface Child {
  id: number;
  parentId: string;
  name: string | null;
  grade: string;
  displayOrder: number;
  displayName: string; // Computed: name or "Child N"
  schoolId: string | null;
  schoolName: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActiveChildContextType {
  children: Child[];
  activeChild: Child | null;
  setActiveChild: (child: Child | null) => void;
  isLoading: boolean;
  refetchChildren: () => void;
}

const ActiveChildContext = createContext<ActiveChildContextType | undefined>(undefined);

export const ActiveChildProvider = ({ children: reactChildren }: { children: ReactNode }) => {
  const [activeChild, setActiveChild] = useState<Child | null>(null);

  // Fetch children from API
  const { data: childrenData, isLoading, refetch } = useQuery<{ children: Child[] }>({
    queryKey: ["children"],
    queryFn: async () => {
      const response = await fetch("/api/children", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch children");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const children = childrenData?.children || [];

  // Auto-select first child on load (resets each session)
  useEffect(() => {
    if (children.length > 0 && !activeChild) {
      setActiveChild(children[0]);
    }
  }, [children, activeChild]);

  return (
    <ActiveChildContext.Provider
      value={{
        children,
        activeChild,
        setActiveChild,
        isLoading,
        refetchChildren: refetch,
      }}
    >
      {reactChildren}
    </ActiveChildContext.Provider>
  );
};

export const useActiveChild = () => {
  const context = useContext(ActiveChildContext);
  if (context === undefined) {
    throw new Error("useActiveChild must be used within an ActiveChildProvider");
  }
  return context;
};
