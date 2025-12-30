import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Truck,
  Package,
  AlertCircle,
  CreditCard,
  ShoppingCart,
} from "lucide-react";

interface SwapOrder {
  status: string;
  orderType?: string;
  requirementsSubmitted: boolean;
  requirementsApproved: boolean;
  requesterReceivedBook: boolean;
  ownerReceivedBook: boolean;
  requesterPaidFee?: boolean;
  ownerPaidFee?: boolean;
}

interface OrderTimelineProps {
  swapOrder: SwapOrder;
  isRequester: boolean;
}

export default function OrderTimeline({ swapOrder, isRequester }: OrderTimelineProps) {
  const isPurchase = swapOrder.orderType === "purchase";

  // Purchase order timeline
  const purchaseSteps = [
    {
      id: "payment",
      title: "Payment",
      description: swapOrder.requesterPaidFee
        ? "Payment received"
        : "Awaiting payment",
      icon: CreditCard,
      completed: swapOrder.requesterPaidFee || false,
      active: swapOrder.status === "awaiting_payment",
    },
    {
      id: "delivery_details",
      title: "Delivery Details",
      description: swapOrder.requirementsSubmitted
        ? "Details provided"
        : "Awaiting details",
      icon: FileText,
      completed: swapOrder.requirementsSubmitted,
      active: swapOrder.status === "requirements_gathering",
    },
    {
      id: "dispatch",
      title: "Dispatch",
      description: swapOrder.ownerShipped
        ? "Book dispatched"
        : "Awaiting dispatch",
      icon: Truck,
      completed: swapOrder.ownerShipped || swapOrder.status === "delivered" || swapOrder.status === "completed",
      active: swapOrder.status === "in_progress" && !swapOrder.ownerShipped,
    },
    {
      id: "delivery",
      title: "Delivery",
      description: swapOrder.requesterReceivedBook
        ? "Buyer confirmed receipt"
        : "Awaiting delivery confirmation",
      icon: Package,
      completed: swapOrder.requesterReceivedBook || false,
      active: swapOrder.status === "delivered" || (swapOrder.ownerShipped && !swapOrder.requesterReceivedBook),
    },
    {
      id: "completed",
      title: "Completed",
      description: "Purchase successful!",
      icon: CheckCircle2,
      completed: swapOrder.status === "completed",
      active: false,
    },
  ];

  // Swap order timeline (original)
  const swapSteps = [
    {
      id: "requirements",
      title: "Requirements",
      description: swapOrder.requirementsSubmitted
        ? "Meetup details submitted"
        : "Waiting for meetup details",
      icon: FileText,
      completed: swapOrder.requirementsSubmitted,
      active: swapOrder.status === "requirements_gathering",
    },
    {
      id: "approved",
      title: "Approved",
      description: swapOrder.requirementsApproved
        ? "Requirements approved"
        : "Pending approval",
      icon: CheckCircle2,
      completed: swapOrder.requirementsApproved,
      active:
        swapOrder.requirementsSubmitted &&
        !swapOrder.requirementsApproved,
    },
    {
      id: "in_progress",
      title: "In Progress",
      description: "Book exchange happening",
      icon: Truck,
      completed: swapOrder.status === "in_progress" || swapOrder.status === "delivered" || swapOrder.status === "completed",
      active: swapOrder.status === "in_progress",
    },
    {
      id: "delivered",
      title: "Delivery",
      description: swapOrder.requesterReceivedBook && swapOrder.ownerReceivedBook
        ? "Both confirmed"
        : swapOrder.requesterReceivedBook || swapOrder.ownerReceivedBook
        ? "1 party confirmed"
        : "Awaiting confirmation",
      icon: Package,
      completed: swapOrder.requesterReceivedBook && swapOrder.ownerReceivedBook,
      active: swapOrder.status === "delivered",
    },
    {
      id: "completed",
      title: "Completed",
      description: "Swap successful!",
      icon: CheckCircle2,
      completed: swapOrder.status === "completed",
      active: false,
    },
  ];

  // Show cancelled/disputed status
  if (swapOrder.status === "cancelled") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-sm text-red-900 dark:text-red-100">
                Order Cancelled
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                This {isPurchase ? "purchase" : "swap"} order has been cancelled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (swapOrder.status === "disputed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="font-medium text-sm text-orange-900 dark:text-orange-100">
                Order Disputed
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                This order is under review
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use appropriate steps based on order type
  const steps = isPurchase ? purchaseSteps : swapSteps;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Order Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="relative">
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-[15px] top-[32px] w-[2px] h-[calc(100%+16px)]",
                      step.completed
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  />
                )}

                {/* Step Content */}
                <div className="flex gap-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "rounded-full p-2 flex items-center justify-center z-10",
                      step.completed
                        ? "bg-primary text-primary-foreground"
                        : step.active
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "font-medium text-sm",
                          step.completed
                            ? "text-foreground"
                            : step.active
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </p>
                      {step.completed && (
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      )}
                      {step.active && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
