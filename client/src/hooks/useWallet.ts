import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

interface WalletBalance {
  balance: number;
  currency: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: string;
  balanceAfter: string;
  description: string;
  createdAt: string;
}

interface TopUpResponse {
  success: boolean;
  authorizationUrl: string;
  reference: string;
}

export function useWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get wallet balance
  const {
    data: walletData,
    isLoading: isLoadingBalance,
    error: balanceError,
  } = useQuery<WalletBalance>({
    queryKey: ["wallet", "balance"],
    queryFn: async () => {
      const response = await fetch("/api/wallet/balance", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch wallet balance");
      }

      const data = await response.json();
      return {
        balance: data.balance,
        currency: data.currency,
      };
    },
  });

  // Get transaction history
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
  } = useQuery<Transaction[]>({
    queryKey: ["wallet", "transactions"],
    queryFn: async () => {
      const response = await fetch("/api/wallet/transactions?limit=50", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      return data.transactions;
    },
  });

  // Initialize wallet top-up
  const initializeTopUp = useMutation({
    mutationFn: async (params: { amount: number; email?: string }) => {
      const response = await fetch("/api/wallet/topup/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          amount: params.amount,
          paymentMethod: "paystack",
          email: params.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to initialize top-up");
      }

      return response.json() as Promise<TopUpResponse>;
    },
    onSuccess: (data) => {
      // Redirect to Paystack payment page
      window.location.href = data.authorizationUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Top-up Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify payment (called after redirect from Paystack)
  const verifyPayment = useMutation({
    mutationFn: async (reference: string) => {
      const response = await fetch(`/api/wallet/topup/verify/${reference}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify payment");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Top-up Successful",
        description: `Your wallet has been credited with KES ${data.amount}`,
      });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    balance: walletData?.balance ?? 0,
    currency: walletData?.currency ?? "KES",
    isLoadingBalance,
    balanceError,
    transactions: transactions ?? [],
    isLoadingTransactions,
    initializeTopUp,
    verifyPayment,
  };
}
