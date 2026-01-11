import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Share2, Gift, Users, TrendingUp, Award, CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  invalidReferrals: number;
  referralsThisMonth: number;
}

interface Referral {
  id: number;
  referralCode: string;
  referrerId: string;
  refereeId: string | null;
  refereeName: string | null;
  status: string;
  qualificationDate: string | null;
  createdAt: string;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  profilePictureUrl: string | null;
  totalReferrals: number;
  qualifiedReferrals: number;
  rank: number;
}

export default function ReferralsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch or create referral code first
  const { data: referralCodeData, isLoading: isLoadingCode, error: codeError } = useQuery({
    queryKey: ["referral-code"],
    queryFn: async () => {
      console.log("Fetching referral code...");
      const response = await fetch("/api/referrals/my-code", {
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch referral code:", response.status, errorText);
        throw new Error("Failed to fetch referral code");
      }
      const data = await response.json();
      console.log("Referral code data:", data);
      return data;
    },
    enabled: !!user,
    retry: 2,
  });

  // Fetch referral stats (will now have the code already created)
  const { data: statsData, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ["referral-stats"],
    queryFn: async () => {
      console.log("Fetching referral stats...");
      const response = await fetch("/api/referrals/stats", {
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch stats:", response.status, errorText);
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      console.log("Stats data:", data);
      return data;
    },
    enabled: !!user && !!referralCodeData, // Only fetch stats after code is created
    retry: 2,
  });

  // Fetch leaderboard
  const { data: leaderboardData } = useQuery({
    queryKey: ["referral-leaderboard"],
    queryFn: async () => {
      const response = await fetch("/api/referrals/leaderboard?limit=10", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
  });

  const stats: ReferralStats | undefined = statsData?.stats;
  const referralCode = statsData?.referralCode;
  const referralLink = statsData?.referralLink;
  const referrals: Referral[] = statsData?.referrals || [];
  const leaderboard: LeaderboardEntry[] = leaderboardData?.leaderboard || [];

  console.log("Render state:", {
    user: !!user,
    isLoadingCode,
    isLoadingStats,
    referralCodeData,
    statsData,
    referralCode,
    referralLink,
    stats,
    codeError,
    statsError
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const shareReferralLink = async () => {
    const shareMessage = `Parents, let's stop overpaying for textbooks every year!

I've found a way to cut our school book costs by 60% using Kitabu Connect. It's a verified platform for local peer-to-peer swaps. The best part? You can actually make extra income by renting or selling the books your kids have outgrown to other parents in your area.

It's stress-free and turns your old textbooks into cash for the new ones. Join me here: ${referralLink}`;

    if (navigator.share && referralLink) {
      try {
        await navigator.share({
          title: "Cut Your Textbook Costs by 60%",
          text: shareMessage,
        });
      } catch (error) {
        copyToClipboard(referralLink, "Referral link");
      }
    } else if (referralLink) {
      copyToClipboard(referralLink, "Referral link");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "qualified":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Qualified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "invalid":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Invalid</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Show error state
  if (codeError || statsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Referrals</CardTitle>
            <CardDescription>
              {codeError ? "Failed to load referral code" : "Failed to load referral stats"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {(codeError as Error)?.message || (statsError as Error)?.message}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingCode || isLoadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isLoadingCode ? "Generating your referral code..." : "Loading referrals..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Referral Program</h1>
          <p className="text-gray-600">Share your referral code to help grow our community and unlock more book options near you!</p>
        </div>

        {/* Referral Code Card */}
        <Card className="mb-8 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-purple-600" />
              Your Referral Code
            </CardTitle>
            <CardDescription>
              Invite other parents and expand your local textbook network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Referral Code */}
              <div className="bg-white p-4 rounded-lg border-2 border-purple-300 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Your Referral Code</p>
                    <p className="text-3xl font-bold text-purple-600 tracking-wider">{referralCode || "Loading..."}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => referralCode && copyToClipboard(referralCode, "Referral code")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Referral Link */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Referral Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-50 px-3 py-2 rounded border text-sm text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                    {referralLink || "Loading..."}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => referralLink && copyToClipboard(referralLink, "Referral link")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    onClick={shareReferralLink}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (referralLink) {
                      const message = `Parents, let's stop overpaying for textbooks every year!

I've found a way to cut our school book costs by 60% using Kitabu Connect. It's a verified platform for local peer-to-peer swaps. The best part? You can actually make extra income by renting or selling the books your kids have outgrown to other parents in your area.

It's stress-free and turns your old textbooks into cash for the new ones. Join me here: ${referralLink}`;
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(message)}`,
                        "_blank"
                      );
                    }
                  }}
                  className="flex-1 min-w-[120px]"
                >
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (referralLink) {
                      const message = `Parents, let's stop overpaying for textbooks every year!

I've found a way to cut our school book costs by 60% using Kitabu Connect. It's a verified platform for local peer-to-peer swaps. The best part? You can actually make extra income by renting or selling the books your kids have outgrown to other parents in your area.

It's stress-free and turns your old textbooks into cash for the new ones. Join me here: ${referralLink}`;
                      window.open(
                        `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
                        "_blank"
                      );
                    }
                  }}
                  className="flex-1 min-w-[120px]"
                >
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (referralLink) {
                      const message = `Parents, let's stop overpaying for textbooks every year!

I've found a way to cut our school book costs by 60% using Kitabu Connect. It's a verified platform for local peer-to-peer swaps. The best part? You can actually make extra income by renting or selling the books your kids have outgrown to other parents in your area.

It's stress-free and turns your old textbooks into cash for the new ones. Join me here: ${referralLink}`;
                      window.open(
                        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(message)}`,
                        "_blank"
                      );
                    }
                  }}
                  className="flex-1 min-w-[120px]"
                >
                  Facebook
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalReferrals}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Qualified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{stats.qualifiedReferrals}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingReferrals}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">{stats.referralsThisMonth}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">My Referrals</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* My Referrals Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Your Referrals</CardTitle>
                <CardDescription>
                  Track the status of people you've invited
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referrals.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No referrals yet</h3>
                    <p className="text-gray-600 mb-4">Invite other parents to unlock more book options in your area!</p>
                    <Button onClick={shareReferralLink} className="bg-purple-600 hover:bg-purple-700">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Your Link
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {referrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback className="bg-purple-100 text-purple-600">
                              {referral.refereeName?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">
                              {referral.refereeName || "User"}
                            </p>
                            <p className="text-sm text-gray-500">
                              Joined {new Date(referral.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(referral.status)}
                          {referral.qualificationDate && (
                            <p className="text-xs text-gray-500">
                              Qualified {new Date(referral.qualificationDate).toLocaleDateString()}
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

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-600" />
                  Top Referrers
                </CardTitle>
                <CardDescription>
                  See who's leading the community growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No leaderboard data available yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.userId}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          index === 0 ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300" :
                          index === 1 ? "bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300" :
                          index === 2 ? "bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300" :
                          "bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10">
                            {index < 3 ? (
                              <Award className={`w-8 h-8 ${
                                index === 0 ? "text-yellow-500" :
                                index === 1 ? "text-gray-400" :
                                "text-orange-400"
                              }`} />
                            ) : (
                              <span className="text-xl font-bold text-gray-400">#{entry.rank}</span>
                            )}
                          </div>
                          <Avatar>
                            <AvatarImage src={entry.profilePictureUrl || undefined} />
                            <AvatarFallback className="bg-purple-100 text-purple-600">
                              {entry.userName?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-gray-900">{entry.userName}</p>
                            <p className="text-sm text-gray-500">
                              {entry.qualifiedReferrals} qualified referrals
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">{entry.totalReferrals}</p>
                          <p className="text-xs text-gray-500">total referrals</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* How It Works Section */}
        <Card className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle>Why Invite Other Parents?</CardTitle>
            <CardDescription className="text-gray-700">
              The more parents join, the better it gets for everyone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold mb-2">More Books Near You</h3>
                <p className="text-sm text-gray-600">
                  More parents in your area means more textbooks available locally for quick pickups
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="font-semibold mb-2">Better Prices</h3>
                <p className="text-sm text-gray-600">
                  Larger community creates more competition, giving you better deals on the books you need
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="font-semibold mb-2">Sell Faster</h3>
                <p className="text-sm text-gray-600">
                  More buyers means your children's outgrown textbooks sell quicker, putting money back in your pocket
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
