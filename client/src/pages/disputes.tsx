import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Shield,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Dispute {
  id: string;
  cycleId: string;
  reporterId: string;
  respondentId: string | null;
  disputeType: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  evidencePhotoUrls: string[] | null;
  conditionReportId: string | null;
  respondentResponseDeadline: Date;
  resolutionDeadline: Date;
  disputeValue: string | null;
  resolution: string | null;
  resolutionType: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  adminNotes: string | null;
  mediatorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DisputesResponse {
  success: boolean;
  disputes: {
    dispute: Dispute;
    reporter: any;
    respondent: any;
    cycle: any;
  }[];
}

export default function DisputesPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"all" | "open" | "resolved">("all");

  // Fetch user's disputes
  const { data, isLoading, refetch } = useQuery<DisputesResponse>({
    queryKey: ["disputes"],
    queryFn: async () => {
      const response = await fetch("/api/disputes", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch disputes");
      }

      return response.json();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
      case "awaiting_response":
        return <Clock className="h-4 w-4" />;
      case "investigating":
        return <AlertTriangle className="h-4 w-4" />;
      case "resolved":
      case "closed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "escalated":
        return <ArrowUpCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      awaiting_response: "secondary",
      investigating: "outline",
      resolved: "default",
      closed: "secondary",
      escalated: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"} className="capitalize">
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      urgent: "destructive",
    };

    return (
      <Badge variant={variants[priority] || "default"} className="capitalize">
        {priority}
      </Badge>
    );
  };

  const getDisputeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      book_condition: "Book Condition",
      missing_book: "Missing Book",
      wrong_book: "Wrong Book",
      damage: "Damage",
      description_mismatch: "Description Mismatch",
      non_delivery: "Non-Delivery",
      other: "Other",
    };
    return labels[type] || type;
  };

  const filteredDisputes = data?.disputes.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "open") {
      return ["open", "awaiting_response", "investigating", "escalated"].includes(
        item.dispute.status
      );
    }
    if (activeTab === "resolved") {
      return ["resolved", "closed"].includes(item.dispute.status);
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading disputes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Disputes
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your dispute cases
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <FileText className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">
            All ({data?.disputes.length || 0})
          </TabsTrigger>
          <TabsTrigger value="open">
            Open (
            {data?.disputes.filter((d) =>
              ["open", "awaiting_response", "investigating", "escalated"].includes(
                d.dispute.status
              )
            ).length || 0}
            )
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved (
            {data?.disputes.filter((d) =>
              ["resolved", "closed"].includes(d.dispute.status)
            ).length || 0}
            )
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {!filteredDisputes || filteredDisputes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No disputes found</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {activeTab === "all"
                    ? "You have no disputes at the moment"
                    : `No ${activeTab} disputes`}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredDisputes.map((item) => {
              const { dispute } = item;
              const isReporter = true; // This should check if current user is the reporter
              const role = isReporter ? "Reporter" : "Respondent";

              return (
                <Card
                  key={dispute.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/disputes/${dispute.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(dispute.status)}
                          <CardTitle className="text-lg">{dispute.title}</CardTitle>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {getStatusBadge(dispute.status)}
                          {getPriorityBadge(dispute.priority)}
                          <Badge variant="outline">
                            {getDisputeTypeLabel(dispute.disputeType)}
                          </Badge>
                          <Badge variant="outline">{role}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {dispute.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">
                          {formatDistanceToNow(new Date(dispute.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      {dispute.status !== "resolved" && dispute.status !== "closed" && (
                        <div>
                          <p className="text-muted-foreground">Response Deadline</p>
                          <p className="font-medium">
                            {formatDistanceToNow(
                              new Date(dispute.respondentResponseDeadline),
                              { addSuffix: true }
                            )}
                          </p>
                        </div>
                      )}

                      {dispute.resolvedAt && (
                        <div>
                          <p className="text-muted-foreground">Resolved</p>
                          <p className="font-medium">
                            {formatDistanceToNow(new Date(dispute.resolvedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      )}

                      {dispute.disputeValue && (
                        <div>
                          <p className="text-muted-foreground">Dispute Value</p>
                          <p className="font-medium">KSh {dispute.disputeValue}</p>
                        </div>
                      )}
                    </div>

                    {dispute.resolution && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                        <p className="text-sm">{dispute.resolution}</p>
                        {dispute.resolutionType && (
                          <Badge variant="outline" className="mt-2 capitalize">
                            {dispute.resolutionType.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
