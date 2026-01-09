import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  qualifiedReferrals: number;
  totalReferrals: number;
  hasReducedEscrowHold: boolean;
  hasFeaturedSeller: boolean;
  hasPriorityListing: boolean;
  schoolName: string;
}

export function ReferralLeaderboard() {
  const { data: globalData, isLoading: isLoadingGlobal } = useQuery<{ success: boolean; leaderboard: LeaderboardEntry[] }>({
    queryKey: ["referrals", "leaderboard", "global"],
    queryFn: async () => {
      const response = await fetch("/api/referrals/leaderboard?scope=global&limit=10", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      return response.json();
    },
  });

  const { data: schoolData, isLoading: isLoadingSchool } = useQuery<{ success: boolean; leaderboard: LeaderboardEntry[] }>({
    queryKey: ["referrals", "leaderboard", "school"],
    queryFn: async () => {
      const response = await fetch("/api/referrals/leaderboard?scope=school&limit=10", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      return response.json();
    },
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-semibold">#{rank}</span>;
    }
  };

  const LeaderboardTable = ({ data, isLoading }: { data?: LeaderboardEntry[]; isLoading: boolean }) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No referral data available yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {data.map((entry, index) => {
          const rank = index + 1;
          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                rank <= 3 ? "bg-muted/50" : "hover:bg-muted/30"
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-10 flex items-center justify-center">
                {getRankIcon(rank)}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.userName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {entry.schoolName || "Unknown School"}
                </p>
              </div>

              {/* Stats */}
              <div className="text-right">
                <p className="font-bold text-lg">{entry.qualifiedReferrals}</p>
                <p className="text-xs text-muted-foreground">qualified</p>
              </div>

              {/* Badges */}
              <div className="flex gap-1">
                {entry.hasPriorityListing && (
                  <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center" title="Priority Listing">
                    <Award className="h-3 w-3" />
                  </Badge>
                )}
                {entry.hasReducedEscrowHold && (
                  <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center" title="Reduced Escrow">
                    <Trophy className="h-3 w-3" />
                  </Badge>
                )}
                {entry.hasFeaturedSeller && (
                  <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center" title="Featured Seller">
                    <Medal className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Top referrers in the community</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="global">
          <TabsList className="w-full">
            <TabsTrigger value="global" className="flex-1">
              Global
            </TabsTrigger>
            <TabsTrigger value="school" className="flex-1">
              Your School
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-6">
            <LeaderboardTable
              data={globalData?.leaderboard}
              isLoading={isLoadingGlobal}
            />
          </TabsContent>

          <TabsContent value="school" className="mt-6">
            <LeaderboardTable
              data={schoolData?.leaderboard}
              isLoading={isLoadingSchool}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
