import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, ArrowRight, MapPin, Clock, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CycleParticipant {
  id: string;
  userId: string;
  userName: string;
  userSchoolName: string;
  userProfilePictureUrl: string | null;
  schoolCounty: string;
  positionInCycle: number;
  bookToGive: {
    id: number;
    title: string;
    author: string;
    subject: string;
    grade: string;
    condition: string;
    coverImageUrl: string | null;
  };
  bookToReceive: {
    id: number;
    title: string;
    author: string;
    subject: string;
    grade: string;
    condition: string;
    coverImageUrl: string | null;
  };
  confirmed: boolean;
  confirmedAt: Date | null;
  logisticsCost: string;
}

interface SwapCycle {
  id: string;
  cycleType: string;
  status: string;
  primaryCounty: string | null;
  isSameCounty: boolean;
  totalLogisticsCost: string;
  avgCostPerParticipant: string;
  confirmationDeadline: Date;
  participants: CycleParticipant[];
}

interface CycleConfirmationFlowProps {
  cycle: SwapCycle;
  currentUserId: string;
}

export default function CycleConfirmationFlow({
  cycle,
  currentUserId,
}: CycleConfirmationFlowProps) {
  const sortedParticipants = [...cycle.participants].sort(
    (a, b) => a.positionInCycle - b.positionInCycle
  );

  const currentUserParticipant = cycle.participants.find(
    (p) => p.userId === currentUserId
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Swap Chain Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Here's how the books will flow through this {cycle.cycleType} swap
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timeline Overview */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Confirmation Deadline
            </p>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            All participants must confirm{" "}
            {formatDistanceToNow(new Date(cycle.confirmationDeadline), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Swap Chain Visualization */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Swap Chain
          </h4>

          {sortedParticipants.map((participant, index) => {
            const nextParticipant =
              sortedParticipants[(index + 1) % sortedParticipants.length];
            const isCurrentUser = participant.userId === currentUserId;

            return (
              <div key={participant.id}>
                {/* Participant Card */}
                <div
                  className={`p-4 rounded-lg border ${
                    isCurrentUser
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                      : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
                  }`}
                >
                  {/* Participant Info */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={participant.userProfilePictureUrl || undefined}
                        />
                        <AvatarFallback>
                          {participant.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">
                          {participant.userName}
                          {isCurrentUser && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (You)
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {participant.userSchoolName}
                        </div>
                      </div>
                    </div>
                    {participant.confirmed && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">Confirmed</span>
                      </div>
                    )}
                  </div>

                  {/* Book Exchange */}
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                    {/* Gives */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Gives
                      </p>
                      <div className="flex gap-2">
                        <div className="w-12 h-16 rounded overflow-hidden border bg-white dark:bg-gray-800 flex-shrink-0">
                          {participant.bookToGive.coverImageUrl ? (
                            <img
                              src={participant.bookToGive.coverImageUrl}
                              alt={participant.bookToGive.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              📚
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs line-clamp-2">
                            {participant.bookToGive.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {participant.bookToGive.author}
                          </p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {participant.bookToGive.subject}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              Gr. {participant.bookToGive.grade}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                    {/* Receives */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Receives
                      </p>
                      <div className="flex gap-2">
                        <div className="w-12 h-16 rounded overflow-hidden border bg-white dark:bg-gray-800 flex-shrink-0">
                          {participant.bookToReceive.coverImageUrl ? (
                            <img
                              src={participant.bookToReceive.coverImageUrl}
                              alt={participant.bookToReceive.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              📚
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs line-clamp-2">
                            {participant.bookToReceive.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {participant.bookToReceive.author}
                          </p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {participant.bookToReceive.subject}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              Gr. {participant.bookToReceive.grade}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Logistics Cost:{" "}
                      <span className="font-semibold text-foreground">
                        KES {parseFloat(participant.logisticsCost).toFixed(0)}
                      </span>
                      {parseFloat(participant.logisticsCost) === 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          FREE (Same School)
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>

                {/* Connection Line (except for last participant) */}
                {index < sortedParticipants.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="h-8 w-0.5 bg-gray-300 dark:bg-gray-700"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
          <h4 className="font-semibold text-sm mb-3">Swap Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Participants</p>
              <p className="font-semibold">{cycle.participants.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Location</p>
              <p className="font-semibold">
                {cycle.isSameCounty
                  ? cycle.primaryCounty || "Same County"
                  : "Multi-County"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Cost</p>
              <p className="font-semibold">
                KES {parseFloat(cycle.totalLogisticsCost).toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Your Cost</p>
              <p className="font-semibold">
                KES{" "}
                {currentUserParticipant
                  ? parseFloat(currentUserParticipant.logisticsCost).toFixed(0)
                  : "0"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
