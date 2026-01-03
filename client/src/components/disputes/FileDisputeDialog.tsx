import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface FileDisputeDialogProps {
  cycleId: string;
  respondentId?: string;
  triggerButton?: React.ReactNode;
}

export default function FileDisputeDialog({
  cycleId,
  respondentId,
  triggerButton,
}: FileDisputeDialogProps) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    disputeType: "",
    title: "",
    description: "",
    priority: "medium",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.disputeType || !formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cycleId,
          respondentId,
          disputeType: formData.disputeType,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to file dispute");
      }

      const data = await response.json();
      toast.success("Dispute filed successfully");
      setOpen(false);

      // Navigate to the dispute detail page
      setLocation(`/disputes/${data.disputeId}`);
    } catch (error: any) {
      console.error("Error filing dispute:", error);
      toast.error(error.message || "Failed to file dispute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            File Dispute
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>File a Dispute</DialogTitle>
          <DialogDescription>
            Submit a dispute if you've encountered an issue with this transaction.
            Our team will review your case and help resolve it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="disputeType">
              Dispute Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.disputeType}
              onValueChange={(value) =>
                setFormData({ ...formData, disputeType: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dispute type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="book_condition">Book Condition</SelectItem>
                <SelectItem value="missing_book">Missing Book</SelectItem>
                <SelectItem value="wrong_book">Wrong Book</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="description_mismatch">
                  Description Mismatch
                </SelectItem>
                <SelectItem value="non_delivery">Non-Delivery</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Brief summary of the issue"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              minLength={5}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 5 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about the issue, including what happened and when..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              minLength={10}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. Be as specific as possible.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Filing..." : "File Dispute"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
