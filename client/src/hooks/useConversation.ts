import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

interface CreateConversationInput {
  otherUserId: string;
  bookListingId?: number;
}

interface SendMessageInput {
  conversationId: number;
  receiverId: string;
  content: string;
}

export function useConversation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all conversations for the current user
  const useConversations = () => {
    return useQuery({
      queryKey: ["conversations"],
      queryFn: async () => {
        const response = await fetch("/api/conversations", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch conversations");
        }

        return response.json();
      },
      // OPTIMIZED POLLING STRATEGY:
      // - Poll every 30 seconds (down from 5 seconds) to reduce server load
      // - Only poll when tab is focused (users actively viewing the app)
      // - For real-time messaging, consider implementing WebSocket/SSE in the future
      refetchInterval: 30000, // Poll every 30 seconds (was 5 seconds)
      refetchIntervalInBackground: false, // Don't poll when tab is not active (was true)
      // Cache for 20 seconds to reduce redundant queries
      staleTime: 20000,
    });
  };

  // Create or get a conversation
  const createConversation = useMutation({
    mutationFn: async (data: CreateConversationInput) => {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create conversation");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get messages in a conversation
  const useConversationMessages = (conversationId: number | null) => {
    return useQuery({
      queryKey: ["conversations", conversationId, "messages"],
      queryFn: async () => {
        if (!conversationId) throw new Error("Conversation ID required");

        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        return response.json();
      },
      enabled: !!conversationId,
      // OPTIMIZED: Poll every 10 seconds for new messages (down from 3 seconds)
      // This is acceptable for messaging - 10 seconds is still responsive enough
      refetchInterval: 10000, // Poll every 10 seconds (was 3 seconds)
      refetchIntervalInBackground: false, // Only poll when user is viewing the conversation
      // Cache for 5 seconds
      staleTime: 5000,
    });
  };

  // Send a message
  const sendMessage = useMutation({
    mutationFn: async (data: SendMessageInput) => {
      const response = await fetch(`/api/conversations/${data.conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          content: data.content,
          receiverId: data.receiverId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", variables.conversationId, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await fetch(`/api/conversations/${conversationId}/mark-read`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to mark messages as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    useConversations,
    createConversation,
    useConversationMessages,
    sendMessage,
    markAsRead,
  };
}
