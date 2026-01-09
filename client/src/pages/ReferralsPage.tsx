import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, Users, Award, TrendingUp, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReferralShareModal } from "@/components/referrals/ReferralShareModal";
import { ReferralLeaderboard } from "@/components/referrals/ReferralLeaderboard";
import { format } from "date-fns";

interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  invalidReferrals: number;
  hasReducedEscrowHold: boolean;
  hasFeaturedSeller: boolean;
  hasPriorityListing: boolean;
  hasVerifiedCommunityBadge: boolean;
}

interface Referral {
  id: number;
  referralCode: string;
  refereeId: string | null;
  refereeName: string | null;
  signupCompletedAt: string | null;
  firstTransactionAt: string | null;
  status: string;
  isFraudulent: boolean;
}

interface ReferralData {
  stats: ReferralStats;
  referralCode: string;
  referralLink: string;
  referrals: Referral[];
}

export default function ReferralsPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const { data, isLoading } = useQuery<{ success: boolean; data: ReferralData }>({
    queryKey: ["referrals", "stats"],
    queryFn: async () => {
      const response = await fetch("/api/referrals/stats", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch referral stats");
      }

      const result = await response.json();
      return { success: result.success, data: result };
    },
  });

  const referralData = data?.data;

  const copyReferralCode = async () => {
    if (!referralData?.referralCode) return;

    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const copyReferralLink = async () => {
    if (!referralData?.referralLink) return;

    try {
      await navigator.clipboard.writeText(referralData.referralLink);
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const stats = referralData?.stats;
  const referrals = referralData?.referrals || [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invite Friends & Earn Rewards</h1>
          <p className="text-muted-foreground mt-2">
            Share Kitabu Connect with your friends and unlock exclusive benefits
          </p>
        </div>
        <Button onClick={() => setShareModalOpen(true)} size="lg" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share Referral Link
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time signups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Referrals</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.qualifiedReferrals || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed first swap</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReferrals || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting first swap</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Features</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[
                stats?.hasReducedEscrowHold,
                stats?.hasFeaturedSeller,
                stats?.hasPriorityListing,
                stats?.hasVerifiedCommunityBadge,
              ].filter(Boolean).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unlocked rewards</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>Share this code with friends to start earning rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 p-4 bg-muted rounded-lg">
              <code className="text-2xl font-mono font-bold">{referralData?.referralCode}</code>
            </div>
            <Button onClick={copyReferralCode} variant="outline" size="icon">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono truncate">
              {referralData?.referralLink}
            </div>
            <Button onClick={copyReferralLink} variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShareModalOpen(true)} variant="outline" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unlocked Features */}
      {stats && (stats.hasReducedEscrowHold || stats.hasFeaturedSeller || stats.hasPriorityListing || stats.hasVerifiedCommunityBadge) && (
        <Card>
          <CardHeader>
            <CardTitle>Unlocked Rewards</CardTitle>
            <CardDescription>Features you've earned through referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.hasVerifiedCommunityBadge && (
                <Badge variant="secondary" className="gap-1">
                  <Award className="h-3 w-3" />
                  Verified Community Member
                </Badge>
              )}
              {stats.hasFeaturedSeller && (
                <Badge variant="secondary" className="gap-1">
                  <Award className="h-3 w-3" />
                  Featured Seller Badge
                </Badge>
              )}
              {stats.hasReducedEscrowHold && (
                <Badge variant="secondary" className="gap-1">
                  <Award className="h-3 w-3" />
                  Reduced Escrow Hold (5 days)
                </Badge>
              )}
              {stats.hasPriorityListing && (
                <Badge variant="secondary" className="gap-1">
                  <Award className="h-3 w-3" />
                  Priority Listing Placement
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs Section */}
      <Tabs defaultValue="referrals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="referrals">Your Referrals ({referrals.length})</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="rewards">How It Works</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
              <CardDescription>Track your referred users and their progress</CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No referrals yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start sharing your referral code to earn rewards
                  </p>
                  <Button onClick={() => setShareModalOpen(true)}>
                    Share Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {referral.refereeName || "User Signed Up"}
                          </p>
                          <Badge
                            variant={
                              referral.status === "qualified"
                                ? "default"
                                : referral.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {referral.status}
                          </Badge>
                          {referral.isFraudulent && (
                            <Badge variant="destructive">Flagged</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {referral.signupCompletedAt
                            ? `Joined ${format(new Date(referral.signupCompletedAt), "MMM d, yyyy")}`
                            : "Pending signup"}
                        </p>
                      </div>
                      <div className="text-right">
                        {referral.firstTransactionAt ? (
                          <p className="text-sm text-green-600 font-medium">
                            First swap completed
                          </p>
                        ) : referral.signupCompletedAt ? (
                          <p className="text-sm text-muted-foreground">
                            Awaiting first swap
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Pending
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <ReferralLeaderboard />
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle>How Referral Rewards Work</CardTitle>
              <CardDescription>Unlock exclusive features by inviting friends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Share Your Link</h4>
                    <p className="text-sm text-muted-foreground">
                      Send your unique referral link to friends via WhatsApp, email, or social media
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">They Sign Up</h4>
                    <p className="text-sm text-muted-foreground">
                      Your friend creates an account using your referral code
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">First Transaction</h4>
                    <p className="text-sm text-muted-foreground">
                      Once they complete their first swap or purchase within 30 days, you both earn rewards
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4">Reward Tiers</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Award className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">3 Qualified Referrals</p>
                      <p className="text-sm text-muted-foreground">
                        Networker badge + Featured Seller status
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Award className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">5 Qualified Referrals</p>
                      <p className="text-sm text-muted-foreground">
                        Community Builder badge + Reduced escrow hold (5 days instead of 7)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Award className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">10 Qualified Referrals</p>
                      <p className="text-sm text-muted-foreground">
                        Community Champion badge + Priority listing placement
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Award className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">25 Qualified Referrals</p>
                      <p className="text-sm text-muted-foreground">
                        Campus Legend badge + Exclusive recognition
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Share Modal */}
      <ReferralShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        referralCode={referralData?.referralCode || ""}
        referralLink={referralData?.referralLink || ""}
      />
    </div>
  );
}
