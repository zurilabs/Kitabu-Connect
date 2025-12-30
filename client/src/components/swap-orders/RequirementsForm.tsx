import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, MapPin, Calendar, Home, Phone } from "lucide-react";

interface RequirementsFormProps {
  orderId: number;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderType?: string;
}

export default function RequirementsForm({
  orderId,
  onSuccess,
  open,
  onOpenChange,
  orderType = "swap",
}: RequirementsFormProps) {
  const [loading, setLoading] = useState(false);
  const isPurchase = orderType === "purchase";

  const [formData, setFormData] = useState({
    meetupLocation: "",
    meetupTime: "",
    additionalNotes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.meetupLocation || !formData.meetupLocation.trim()) {
      toast.error("Please enter the meetup location");
      return;
    }

    if (!formData.meetupTime || !formData.meetupTime.trim()) {
      toast.error("Please select a meetup date and time");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/swap-orders/${orderId}/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Meetup requirements submitted successfully!");
        onSuccess();
        onOpenChange(false);
        setFormData({
          meetupLocation: "",
          meetupTime: "",
          additionalNotes: "",
        });
      } else {
        const data = await response.json();
        console.error("Requirements submission error:", data);
        // Show detailed error if available
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach((err: any) => {
            toast.error(err.message || "Validation error");
          });
        } else {
          toast.error(data.message || "Failed to submit meetup requirements");
        }
      }
    } catch (error) {
      console.error("Requirements submission exception:", error);
      toast.error("Failed to submit meetup requirements");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <FileText className="h-4 w-4 mr-2" />
          Submit Meetup Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl">
              🔄 Submit Meetup Requirements
            </DialogTitle>
            <DialogDescription className="text-base">
              Provide the meetup details for this book {isPurchase ? "purchase" : "swap"}. The owner will review and approve them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-6">
            {/* Meetup Location - Same for both purchases and swaps */}
            <div className="space-y-2">
              <Label htmlFor="meetupLocation" className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-green-600" />
                Meetup Location
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="meetupLocation"
                placeholder="e.g., School Library, Main Gate"
                value={formData.meetupLocation}
                onChange={(e) =>
                  setFormData({ ...formData, meetupLocation: e.target.value })
                }
                required
                className="h-11"
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <span className="text-blue-600 font-medium">ℹ️</span>
                Specify a safe, public location for the book exchange
              </p>
            </div>

            {/* Meetup Date & Time - Same for both purchases and swaps */}
            <div className="space-y-2">
              <Label htmlFor="meetupTime" className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-green-600" />
                Meetup Date & Time
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="meetupTime"
                type="datetime-local"
                value={formData.meetupTime}
                onChange={(e) =>
                  setFormData({ ...formData, meetupTime: e.target.value })
                }
                required
                min={new Date().toISOString().slice(0, 16)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <span className="text-blue-600 font-medium">ℹ️</span>
                Choose a convenient date and time for both parties
              </p>
            </div>

            {/* Additional Notes - Same for both */}
            <div className="space-y-2">
              <Label htmlFor="additionalNotes" className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-gray-600" />
                Additional Notes
                <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="additionalNotes"
                placeholder="Any special instructions or preferences for the meetup..."
                value={formData.additionalNotes}
                onChange={(e) =>
                  setFormData({ ...formData, additionalNotes: e.target.value })
                }
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Requirements"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
