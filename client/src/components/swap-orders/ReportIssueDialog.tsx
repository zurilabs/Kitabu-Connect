import { useState } from "react";
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
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ReportIssueDialogProps {
  swapOrderId: number;
  onSuccess?: () => void;
}

const DISPUTE_TYPES = [
  { value: "book_condition", label: "Book Condition Issue" },
  { value: "missing_book", label: "Missing Book" },
  { value: "wrong_book", label: "Wrong Book Received" },
  { value: "damage", label: "Damage During Exchange" },
  { value: "description_mismatch", label: "Description Mismatch" },
  { value: "non_delivery", label: "Non-Delivery" },
  { value: "other", label: "Other Issue" },
];

export default function ReportIssueDialog({
  swapOrderId,
  onSuccess,
}: ReportIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disputeType, setDisputeType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!disputeType) {
      toast.error("Please select an issue type");
      return;
    }
    if (!title || title.length < 5) {
      toast.error("Please enter a title (at least 5 characters)");
      return;
    }
    if (!description || description.length < 10) {
      toast.error("Please enter a description (at least 10 characters)");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          swapOrderId,
          disputeType,
          title,
          description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create dispute");
      }

      const data = await response.json();
      toast.success("Issue reported successfully");
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating dispute:", error);
      toast.error(error.message || "Failed to report issue");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDisputeType("");
    setTitle("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-orange-600 border-orange-200 hover:bg-orange-50">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Report an Issue
          </DialogTitle>
          <DialogDescription>
            Describe the problem you're experiencing with this order. Our team
            will review and help resolve it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="disputeType">Issue Type</Label>
            <Select value={disputeType} onValueChange={setDisputeType}>
              <SelectTrigger>
                <SelectValue placeholder="Select the type of issue" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in detail. Include any relevant information such as dates, communications, or discrepancies."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
