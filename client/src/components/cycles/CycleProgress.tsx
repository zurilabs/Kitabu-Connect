import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  ArrowRight,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface CycleProgressProps {
  status: string;
  confirmedParticipantsCount: number;
  totalParticipantsCount: number;
  confirmationDeadline: Date | null;
  completionDeadline: Date | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export default function CycleProgress({
  status,
  confirmedParticipantsCount,
  totalParticipantsCount,
  confirmationDeadline,
  completionDeadline,
  confirmedAt,
  completedAt,
  cancelledAt,
}: CycleProgressProps) {
  const stages = [
    {
      key: "pending_confirmation",
      label: "Confirmation",
      icon: Clock,
      description: "Waiting for all participants to confirm",
    },
    {
      key: "confirmed",
      label: "Confirmed",
      icon: CheckCircle2,
      description: "All participants confirmed",
    },
    {
      key: "active",
      label: "Exchange",
      icon: ArrowRight,
      description: "Books being exchanged",
    },
    {
      key: "completed",
      label: "Completed",
      icon: Package,
      description: "Swap completed successfully",
    },
  ];

  const getStageStatus = (stageKey: string): "completed" | "active" | "pending" | "cancelled" => {
    if (status === "cancelled" || status === "timeout") return "cancelled";

    const stageOrder = ["pending_confirmation", "confirmed", "active", "completed"];
    const currentIndex = stageOrder.indexOf(status);
    const stageIndex = stageOrder.indexOf(stageKey);

    if (currentIndex > stageIndex) return "completed";
    if (currentIndex === stageIndex) return "active";
    return "pending";
  };

  const getStatusBadge = () => {
    switch (status) {
      case "pending_confirmation":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Awaiting Confirmation ({confirmedParticipantsCount}/{totalParticipantsCount})
          </Badge>
        );
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed - Ready to Exchange
          </Badge>
        );
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <ArrowRight className="h-3 w-3 mr-1" />
            Exchange In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
            <Package className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // If cancelled or timeout, show error state
  if (status === "cancelled" || status === "timeout") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center py-6">
            <div className="mb-4">
              {status === "cancelled" ? (
                <XCircle className="h-12 w-12 text-red-500" />
              ) : (
                <AlertCircle className="h-12 w-12 text-gray-500" />
              )}
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {status === "cancelled" ? "Swap Cancelled" : "Swap Expired"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {status === "cancelled"
                ? "This swap cycle was cancelled by one of the participants."
                : "This swap cycle expired because not all participants confirmed within 48 hours."}
            </p>
            {getStatusBadge()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Current Status Badge */}
        <div className="flex justify-center mb-6">{getStatusBadge()}</div>

        {/* Progress Timeline */}
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-800"></div>

          {/* Stages */}
          <div className="space-y-6">
            {stages.map((stage, index) => {
              const stageStatus = getStageStatus(stage.key);
              const Icon = stage.icon;

              return (
                <div key={stage.key} className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                      stageStatus === "completed"
                        ? "bg-green-500 border-green-500 text-white"
                        : stageStatus === "active"
                        ? "bg-blue-500 border-blue-500 text-white"
                        : stageStatus === "cancelled"
                        ? "bg-gray-300 border-gray-300 text-gray-600"
                        : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400"
                    }`}
                  >
                    {stageStatus === "completed" ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : stageStatus === "active" ? (
                      <Icon className="h-6 w-6 animate-pulse" />
                    ) : stageStatus === "cancelled" ? (
                      <XCircle className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <h4
                      className={`font-semibold ${
                        stageStatus === "active"
                          ? "text-blue-700 dark:text-blue-400"
                          : stageStatus === "completed"
                          ? "text-green-700 dark:text-green-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {stage.label}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stage.description}
                    </p>

                    {/* Additional Info */}
                    {stage.key === "pending_confirmation" &&
                      stageStatus === "active" &&
                      confirmationDeadline && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                          Deadline:{" "}
                          {new Date(confirmationDeadline).toLocaleDateString()}{" "}
                          {new Date(confirmationDeadline).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}

                    {stage.key === "confirmed" && confirmedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Confirmed on{" "}
                        {new Date(confirmedAt).toLocaleDateString()}{" "}
                        {new Date(confirmedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}

                    {stage.key === "active" &&
                      stageStatus === "active" &&
                      completionDeadline && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          Complete by:{" "}
                          {new Date(completionDeadline).toLocaleDateString()}{" "}
                          {new Date(completionDeadline).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}

                    {stage.key === "completed" && completedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Completed on{" "}
                        {new Date(completedAt).toLocaleDateString()}{" "}
                        {new Date(completedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
