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
import { FileText, MapPin, Calendar } from "lucide-react";

interface RequirementsFormProps {
  orderId: number;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RequirementsForm({
  orderId,
  onSuccess,
  open,
  onOpenChange,
}: RequirementsFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meetupLocation: "",
    meetupTime: "",
    additionalNotes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.meetupLocation || !formData.meetupTime) {
      toast.error("Please fill in all required fields");
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
        toast.success("Requirements submitted successfully!");
        onSuccess();
        onOpenChange(false);
        setFormData({
          meetupLocation: "",
          meetupTime: "",
          additionalNotes: "",
        });
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to submit requirements");
      }
    } catch (error) {
      toast.error("Failed to submit requirements");
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Submit Meetup Requirements</DialogTitle>
            <DialogDescription>
              Provide the meetup details for this book swap. The owner will review and approve them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Meetup Location */}
            <div className="space-y-2">
              <Label htmlFor="meetupLocation" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Meetup Location *
              </Label>
              <Input
                id="meetupLocation"
                placeholder="e.g., School Library, Main Gate"
                value={formData.meetupLocation}
                onChange={(e) =>
                  setFormData({ ...formData, meetupLocation: e.target.value })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Specify a safe, public location for the exchange
              </p>
            </div>

            {/* Meetup Time */}
            <div className="space-y-2">
              <Label htmlFor="meetupTime" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Meetup Date & Time *
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
              />
              <p className="text-xs text-muted-foreground">
                Choose a convenient time for both parties
              </p>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="additionalNotes"
                placeholder="Any special instructions or notes about the meetup..."
                value={formData.additionalNotes}
                onChange={(e) =>
                  setFormData({ ...formData, additionalNotes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
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
