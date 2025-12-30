import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "./use-toast";

interface CreatePurchaseOrderInput {
  bookListingId: number;
  deliveryMethod?: "meetup" | "delivery" | "shipping";
  deliveryAddress?: string;
  buyerNotes?: string;
}

interface InitializePaymentInput {
  purchaseOrderId: number;
  email?: string;
}

interface VerifyPaymentInput {
  purchaseOrderId: number;
  reference: string;
}

export function usePurchaseOrder() {
  const { toast } = useToast();

  // Create purchase order
  const createPurchaseOrder = useMutation({
    mutationFn: async (data: CreatePurchaseOrderInput) => {
      const response = await fetch("/api/swap-orders/purchase/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create purchase order");
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize payment
  const initializePayment = useMutation({
    mutationFn: async ({ purchaseOrderId, email }: InitializePaymentInput) => {
      const response = await fetch(`/api/swap-orders/purchase/${purchaseOrderId}/pay/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to initialize payment");
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify payment
  const verifyPayment = useMutation({
    mutationFn: async ({ purchaseOrderId, reference }: VerifyPaymentInput) => {
      const response = await fetch(
        `/api/swap-orders/purchase/${purchaseOrderId}/pay/verify/${reference}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify payment");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful!",
        description: "Your order is now in progress. The seller can now dispatch the book.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createPurchaseOrder,
    initializePayment,
    verifyPayment,
  };
}
