import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookPlaceholder } from "@/components/ui/book-placeholder";
import { useState, useEffect, useRef } from "react";
import { Wallet, Package, Plus, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, Share2, Copy, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBookListing } from "@/hooks/useBookListing";
import { useWallet } from "@/hooks/useWallet";
import { Link, useLocation, useSearch } from "wouter";
import { TopUpDialog } from "@/components/wallet/TopUpDialog";
import { WithdrawDialog } from "@/components/wallet/WithdrawDialog";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("listings");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { myListings, isLoadingMyListings, deleteListing } = useBookListing();
  const { balance, transactions, isLoadingTransactions, verifyPayment } = useWallet();
  const searchParams = useSearch();
  const verifiedRef = useRef<Set<string>>(new Set());

  // Fetch referral data
  const { data: referralData, isLoading: isLoadingReferral, error: referralError } = useQuery({
    queryKey: ["referral-code"],
    queryFn: async () => {
      const response = await fetch("/api/referrals/my-code", {
        credentials: "include",
      });
      if (!response.ok) {
        console.error("Referral API error:", response.status, response.statusText);
        return null;
      }
      const data = await response.json();
      console.log("Referral data received:", data);
      return data;
    },
  });

  // Handle payment verification after redirect from Paystack
  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams);
    const reference = urlParams.get('reference') || urlParams.get('trxref');

    // Paystack redirects with reference/trxref parameter after payment
    // We verify the payment regardless of status param since Paystack will confirm success/failure
    if (reference && !verifiedRef.current.has(reference)) {
      verifiedRef.current.add(reference);
      verifyPayment.mutate(reference);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  const handleDeleteListing = (id: number, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteListing.mutate(id);
    }
  };

  // Copy referral code to clipboard
  const copyReferralCode = async () => {
    if (!referralData?.referralCode) return;
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Copy referral link to clipboard
  const copyReferralLink = async () => {
    if (!referralData?.referralCode) return;
    const referralLink = `${window.location.origin}/signup?ref=${referralData.referralCode}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Calculate stats from listings
  const activeListingsCount = myListings.filter(l => l.listingStatus === "active").length;

  // Calculate total sales from actual completed transactions (sale type)
  // This gives us the real revenue from sales, not just listing prices
  const totalSalesAmount = transactions
    .filter(t => t.type === "sale" && t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const formatTransactionType = (type: string) => {
    const typeMap: Record<string, string> = {
      'topup': 'Wallet Top-up',
      'withdrawal': 'Withdrawal',
      'purchase': 'Book Purchase',
      'sale': 'Book Sale',
      'refund': 'Refund',
      'escrow_hold': 'Escrow Hold',
      'escrow_release': 'Payment Received',
      'swap_commitment': 'Swap Commitment Fee',
      'swap_logistics': 'Swap Logistics Cost',
      'swap_refund': 'Swap Refund',
      'platform_revenue': 'Platform Fee Collected',
    };
    return typeMap[type] || type;
  };

  const getTransactionIcon = (type: string) => {
    // Types that credit the wallet (money coming in)
    const creditTypes = ['topup', 'sale', 'refund', 'escrow_release', 'swap_refund', 'platform_revenue'];

    if (creditTypes.includes(type)) {
      return <ArrowDownCircle className="w-4 h-4 text-green-600" />;
    }
    // Types that debit the wallet (money going out)
    return <ArrowUpCircle className="w-4 h-4 text-red-600" />;
  };

  const getTransactionAmount = (transaction: any) => {
    const amount = parseFloat(transaction.amount);
    const creditTypes = ['topup', 'sale', 'refund', 'escrow_release', 'swap_refund', 'platform_revenue'];
    const isCredit = creditTypes.includes(transaction.type);

    return {
      amount,
      isCredit,
      prefix: isCredit ? '+' : '-',
      color: isCredit ? 'text-green-600' : 'text-red-600'
    };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      completed: { label: "Completed", className: "bg-green-100 text-green-800" },
      failed: { label: "Failed", className: "bg-red-100 text-red-800" },
      cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className} variant="outline">{config.label}</Badge>;
  };

  return (
    <div className="container px-4 py-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Profile Summary */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(user?.fullName || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user?.fullName || "User"}</CardTitle>
              <CardDescription>{user?.email || user?.phoneNumber}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">Wallet Balance</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                KSh {balance.toLocaleString()}
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="w-full text-xs" onClick={() => setTopUpOpen(true)}>
                  Top Up
                </Button>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setWithdrawOpen(true)}>
                  Withdraw
                </Button>
              </div>
            </div>

            {/* Referral Section */}
            {referralData?.referralCode && (
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-2">
                  <Gift className="w-4 h-4" />
                  <span className="text-sm font-medium">Invite Parents</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Grow the community and unlock more book options near you!
                </p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 rounded border text-sm font-mono">
                      {referralData.referralCode}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyReferralCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={copyReferralLink}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Copy Referral Link
                  </Button>

                  {/* Social Share Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const referralLink = `${window.location.origin}/signup?ref=${referralData.referralCode}`;
                        const message = `Parents, let's stop overpaying for textbooks every year!

I've found a way to cut our school book costs by 60% using Kitabu Connect. It's a verified platform for local peer-to-peer swaps. The best part? You can actually make extra income by renting or selling the books your kids have outgrown to other parents in your area.

It's stress-free and turns your old textbooks into cash for the new ones. Join me here: ${referralLink}`;
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(message)}`,
                          "_blank"
                        );
                      }}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const referralLink = `${window.location.origin}/signup?ref=${referralData.referralCode}`;
                        const message = `Parents, let's stop overpaying for textbooks every year!

I've found a way to cut our school book costs by 60% using Kitabu Connect. It's a verified platform for local peer-to-peer swaps. The best part? You can actually make extra income by renting or selling the books your kids have outgrown to other parents in your area.

It's stress-free and turns your old textbooks into cash for the new ones. Join me here: ${referralLink}`;
                        window.open(
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
                          "_blank"
                        );
                      }}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const referralLink = `${window.location.origin}/signup?ref=${referralData.referralCode}`;
                        const message = `Parents, let's stop overpaying for textbooks every year!

I've found a way to cut our school book costs by 60% using Kitabu Connect. It's a verified platform for local peer-to-peer swaps. The best part? You can actually make extra income by renting or selling the books your kids have outgrown to other parents in your area.

It's stress-free and turns your old textbooks into cash for the new ones. Join me here: ${referralLink}`;
                        window.open(
                          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(message)}`,
                          "_blank"
                        );
                      }}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </Button>
                  </div>
                </div>
                <Link href="/referrals">
                  <Button size="sm" variant="link" className="w-full mt-2 text-xs">
                    View Referral Stats →
                  </Button>
                </Link>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">School:</span>
                <span className="font-medium">{user?.schoolName || "Not set"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Grade:</span>
                <span className="font-medium">Grade {user?.childGrade || "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeListingsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Books for sale</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {totalSalesAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">From sold books</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myListings.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All listings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {myListings.reduce((sum, l) => sum + (l.viewsCount || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total views</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="listings" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Listings</CardTitle>
                <CardDescription>Manage books you are selling.</CardDescription>
              </div>
              <Button asChild>
                <Link href="/sell">
                  <Plus className="w-4 h-4 mr-2" />
                  List a Book
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingMyListings ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading your listings...
                </div>
              ) : myListings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active listings found.
                  <div className="mt-4">
                    <Button asChild>
                      <Link href="/sell">List Your First Book</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {myListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                          {listing.primaryPhotoUrl &&
                           listing.primaryPhotoUrl !== "/placeholder-book.png" &&
                           !listing.primaryPhotoUrl.includes("placeholder") ? (
                            <img
                              src={listing.primaryPhotoUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 p-1">
                              <BookPlaceholder
                                title={listing.title}
                                className="w-full h-full"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{listing.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {listing.author} • {listing.subject} • {listing.classGrade}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant={listing.listingStatus === "active" ? "default" : "secondary"}>
                              {listing.listingStatus}
                            </Badge>
                            <Badge variant="outline">{listing.condition}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <div className="font-bold text-lg">KSh {parseFloat(listing.price.toString()).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {listing.viewsCount || 0} views
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/edit-book/${listing.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteListing(listing.id, listing.title)}
                            disabled={deleteListing.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All your transactions including purchases, sales, and wallet activity.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet. Top up your wallet or start buying books to see your transaction history here.
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => {
                    const txAmount = getTransactionAmount(transaction);
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {getTransactionIcon(transaction.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {transaction.description || formatTransactionType(transaction.type)}
                              </span>
                              {getStatusBadge(transaction.status)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {transaction.paymentReference && (
                                <span className="ml-2">• Ref: {transaction.paymentReference}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`font-bold ${txAmount.color}`}>
                            {txAmount.prefix}KSh {txAmount.amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {transaction.currency || 'KES'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} currentBalance={balance} />
    </div>
  );
}
