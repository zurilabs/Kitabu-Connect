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
      refetchInterval: 5000, // Poll every 5 seconds for new messages
      refetchIntervalInBackground: true, // Continue polling even when tab is not focused
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
      refetchInterval: 3000, // Poll every 3 seconds for new messages in active conversation
      refetchIntervalInBackground: false, // Only poll when user is viewing the conversation
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
