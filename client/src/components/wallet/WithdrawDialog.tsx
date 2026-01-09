import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
}

interface AvailableBalanceData {
  totalBalance: number;
  lockedInEscrow: number;
  availableForWithdrawal: number;
  pendingEscrows: Array<{
    escrowId: number;
    amount: number;
    releaseAt: string;
    daysRemaining: number;
  }>;
}

export function WithdrawDialog({ open, onOpenChange, currentBalance }: WithdrawDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "bank" | "paypal">("mpesa");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);

  // Fetch available balance (considering escrow locks)
  const { data: availableData, isLoading: isLoadingBalance } = useQuery<AvailableBalanceData>({
    queryKey: ["wallet", "withdrawal", "available"],
    queryFn: async () => {
      const response = await fetch("/api/wallet/withdrawal/available", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch available balance");
      }

      const data = await response.json();
      return data;
    },
    enabled: open, // Only fetch when dialog is open
  });

  const availableBalance = availableData?.availableForWithdrawal ?? currentBalance;
  const lockedInEscrow = availableData?.lockedInEscrow ?? 0;

  // Fetch list of banks from Paystack
  const { data: banksData, isLoading: isLoadingBanks } = useQuery<{ name: string; code: string }[]>({
    queryKey: ["banks"],
    queryFn: async () => {
      const response = await fetch("/api/wallet/banks", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch banks");
      }

      const data = await response.json();
      return data.banks || [];
    },
    enabled: open && paymentMethod === "bank",
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Reset account verification when bank or account number changes
  useEffect(() => {
    setAccountVerified(false);
    setAccountName("");
  }, [bankCode, bankAccount]);

  // Verify bank account
  const verifyBankAccount = async () => {
    if (!bankCode || !bankAccount) {
      toast({
        title: "Missing Information",
        description: "Please select a bank and enter account number",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingAccount(true);
    try {
      const response = await fetch("/api/wallet/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountNumber: bankAccount,
          bankCode: bankCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Account verification failed");
      }

      setAccountName(data.accountName);
      setAccountVerified(true);
      toast({
        title: "Account Verified",
        description: `Account belongs to ${data.accountName}`,
      });
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
      setAccountVerified(false);
    } finally {
      setIsVerifyingAccount(false);
    }
  };

  // Withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async (params: {
      amount: number;
      paymentMethod: "mpesa" | "bank" | "paypal";
      accountDetails: any;
    }) => {
      const response = await fetch("/api/wallet/withdrawal/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Withdrawal failed");
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Withdrawal Requested",
        description: data.message || "Your withdrawal request has been submitted successfully.",
      });

      // Reset form
      setAmount("");
      setMpesaPhone("");
      setBankAccount("");
      setAccountName("");
      setBankCode("");
      setBankName("");
      setPaypalEmail("");
      setAccountVerified(false);

      // Refresh wallet data
      queryClient.invalidateQueries({ queryKey: ["wallet"] });

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWithdraw = () => {
    const amountNumber = parseFloat(amount);

    // Validation
    if (!amountNumber || amountNumber < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal amount is KES 100",
        variant: "destructive",
      });
      return;
    }

    if (amountNumber > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: lockedInEscrow > 0
          ? `You have KES ${lockedInEscrow.toLocaleString()} locked in escrow from recent sales. These funds will be available after the 7-day hold period.`
          : "Insufficient available balance for withdrawal.",
        variant: "destructive",
      });
      return;
    }

    // Build account details based on payment method
    const accountDetails: any = {};

    if (paymentMethod === "mpesa") {
      if (!mpesaPhone) {
        toast({
          title: "Missing Information",
          description: "Please enter your M-Pesa phone number",
          variant: "destructive",
        });
        return;
      }
      accountDetails.mpesaPhone = mpesaPhone;
    } else if (paymentMethod === "bank") {
      if (!bankCode || !bankAccount || !accountName) {
        toast({
          title: "Missing Information",
          description: "Please fill in all bank account details and verify your account",
          variant: "destructive",
        });
        return;
      }
      if (!accountVerified) {
        toast({
          title: "Account Not Verified",
          description: "Please verify your bank account before proceeding",
          variant: "destructive",
        });
        return;
      }
      accountDetails.bankCode = bankCode;
      accountDetails.bankName = bankName;
      accountDetails.accountNumber = bankAccount;
      accountDetails.accountName = accountName;
    } else if (paymentMethod === "paypal") {
      if (!paypalEmail) {
        toast({
          title: "Missing Information",
          description: "Please enter your PayPal email",
          variant: "destructive",
        });
        return;
      }
      accountDetails.paypalEmail = paypalEmail;
    }

    // Submit withdrawal
    withdrawMutation.mutate({
      amount: amountNumber,
      paymentMethod,
      accountDetails,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Withdraw available funds from your wallet to your preferred payment method.
          </DialogDescription>
        </DialogHeader>

        {isLoadingBalance ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Withdrawals are processed within 1-3 business days.
              </AlertDescription>
            </Alert>

            {lockedInEscrow > 0 && (
              <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <Lock className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-xs text-orange-900 dark:text-orange-100">
                  <strong>KES {lockedInEscrow.toLocaleString()}</strong> is locked in escrow from recent sales.
                  These funds will be available for withdrawal after the 7-day hold period.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">Amount (KES)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="100"
                  max={availableBalance}
                  disabled={withdrawMutation.isPending}
                />
                <div className="text-xs space-y-1">
                  <p className="text-muted-foreground">
                    <strong>Available for withdrawal:</strong> KES {availableBalance.toLocaleString()}
                  </p>
                  {lockedInEscrow > 0 && (
                    <p className="text-orange-600 dark:text-orange-400">
                      <strong>Locked in escrow:</strong> KES {lockedInEscrow.toLocaleString()}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <strong>Minimum:</strong> KES 100 • <strong>Maximum:</strong> KES 100,000
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as any)}
                  disabled={withdrawMutation.isPending}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mpesa" id="mpesa" />
                    <Label htmlFor="mpesa" className="font-normal">M-Pesa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bank" id="bank" />
                    <Label htmlFor="bank" className="font-normal">Bank Transfer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <Label htmlFor="paypal" className="font-normal">PayPal</Label>
                  </div>
                </RadioGroup>
              </div>

              {paymentMethod === "mpesa" && (
                <div className="space-y-2">
                  <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                  <Input
                    id="mpesa-phone"
                    type="tel"
                    placeholder="e.g., 0712345678"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    disabled={withdrawMutation.isPending}
                  />
                </div>
              )}

              {paymentMethod === "bank" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Select Bank</Label>
                    {isLoadingBanks ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading banks...
                      </div>
                    ) : (
                      <Select
                        value={bankCode}
                        onValueChange={(value) => {
                          setBankCode(value);
                          const selected = banksData?.find(b => b.code === value);
                          setBankName(selected?.name || "");
                        }}
                        disabled={withdrawMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose your bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {banksData?.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-account">Account Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bank-account"
                        placeholder="Your account number"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        disabled={withdrawMutation.isPending || isVerifyingAccount}
                        className={accountVerified ? "border-green-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={verifyBankAccount}
                        disabled={!bankCode || !bankAccount || isVerifyingAccount || accountVerified}
                      >
                        {isVerifyingAccount ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : accountVerified ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                  </div>
                  {accountVerified && accountName && (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-xs text-green-900 dark:text-green-100">
                        <strong>Account verified:</strong> {accountName}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {paymentMethod === "paypal" && (
                <div className="space-y-2">
                  <Label htmlFor="paypal-email">PayPal Email</Label>
                  <Input
                    id="paypal-email"
                    type="email"
                    placeholder="your@email.com"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    disabled={withdrawMutation.isPending}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={withdrawMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={!amount || withdrawMutation.isPending || availableBalance <= 0}
              >
                {withdrawMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Request Withdrawal"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
