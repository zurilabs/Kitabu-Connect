import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookPlaceholder } from "@/components/ui/book-placeholder";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { ArrowLeft, ArrowLeftRight, Camera, Loader2 } from "lucide-react";

export default function SwapRequestForm() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();

  const params = new URLSearchParams(searchParams);
  const listingId = params.get("listingId");
  const orderType = params.get("type") || "swap"; // "swap" or "purchase"

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestedBook, setRequestedBook] = useState<any>(null);
  const [isLoadingBook, setIsLoadingBook] = useState(true);

  const isPurchase = orderType === "purchase";

  const [formData, setFormData] = useState({
    offeredBookTitle: "",
    offeredBookAuthor: "",
    offeredBookCondition: "Good" as "New" | "Like New" | "Good" | "Fair",
    offeredBookDescription: "",
    offeredBookPhotoUrl: "",
    message: "",
  });

  // Fetch the requested book details
  useEffect(() => {
    if (!listingId) {
      toast({
        title: "Error",
        description: "No book listing specified",
        variant: "destructive",
      });
      setLocation("/marketplace");
      return;
    }

    const fetchBook = async () => {
      try {
        const response = await fetch(`/api/books/${listingId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch book");
        }

        const data = await response.json();
        setRequestedBook(data.listing);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load book details",
          variant: "destructive",
        });
        setLocation("/marketplace");
      } finally {
        setIsLoadingBook(false);
      }
    };

    fetchBook();
  }, [listingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - only check offered book for swaps
    if (!isPurchase && !formData.offeredBookTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter the title of the book you're offering",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isPurchase ? "/api/swap-orders" : "/api/swaps";
      const payload = isPurchase
        ? {
            requestedBookId: parseInt(listingId!),
            orderType: "purchase",
          }
        : {
            requestedListingId: parseInt(listingId!),
            ...formData,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to create ${isPurchase ? 'purchase' : 'swap'} request`);
      }

      toast({
        title: isPurchase ? "Purchase Request Sent!" : "Swap Request Sent!",
        description: isPurchase
          ? "The seller will be notified of your purchase request."
          : "The book owner will be notified of your swap request.",
      });

      setLocation("/swaps");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingBook) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!requestedBook) {
    return null;
  }

  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        className="mb-6 pl-0 hover:pl-2 transition-all"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="grid md:grid-cols-[1fr,1.5fr] gap-8">
        {/* Book You're Requesting/Purchasing */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                {isPurchase ? "You're Purchasing" : "You're Requesting"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-[3/4] rounded-lg overflow-hidden border bg-gradient-to-br from-muted to-muted/50">
                {requestedBook.primaryPhotoUrl &&
                 requestedBook.primaryPhotoUrl !== "/placeholder-book.png" &&
                 !requestedBook.primaryPhotoUrl.includes("placeholder") ? (
                  <img
                    src={requestedBook.primaryPhotoUrl}
                    alt={requestedBook.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <BookPlaceholder
                      title={requestedBook.title}
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{requestedBook.title}</h3>
                <p className="text-sm text-muted-foreground">{requestedBook.author}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Condition: {requestedBook.condition}
                </p>
                {isPurchase && requestedBook.price && (
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-primary">
                      KES {Number(requestedBook.price).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      + 5% platform fee (KES {(Number(requestedBook.price) * 0.05).toLocaleString()})
                    </p>
                  </div>
                )}
              </div>
              {!isPurchase && requestedBook.willingToSwapFor && (
                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Looking for:
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {requestedBook.willingToSwapFor}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Swap/Purchase Request Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {isPurchase ? "Confirm Purchase Request" : "What Are You Offering?"}
              </CardTitle>
              <CardDescription>
                {isPurchase
                  ? "Review the details and send your purchase request to the seller"
                  : "Tell the owner about the book you want to swap"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {!isPurchase && (
                  <>
                <div className="space-y-2">
                  <Label htmlFor="title">Book Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Physics Form 3 Textbook"
                    value={formData.offeredBookTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, offeredBookTitle: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Author (Optional)</Label>
                  <Input
                    id="author"
                    placeholder="e.g., John Doe"
                    value={formData.offeredBookAuthor}
                    onChange={(e) =>
                      setFormData({ ...formData, offeredBookAuthor: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>
                  <Select
                    value={formData.offeredBookCondition}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, offeredBookCondition: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Like New">Like New</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the book's condition, any highlights, wear and tear, etc."
                    rows={4}
                    value={formData.offeredBookDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, offeredBookDescription: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo">Book Photo (Optional)</Label>
                  <ImageUpload
                    value={formData.offeredBookPhotoUrl}
                    onChange={(value) =>
                      setFormData({ ...formData, offeredBookPhotoUrl: value })
                    }
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    Upload a photo of the book you're offering to increase trust
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">
                    {isPurchase ? "Message to Seller (Optional)" : "Message to Owner (Optional)"}
                  </Label>
                  <Textarea
                    id="message"
                    placeholder={isPurchase
                      ? "Add a message to the seller (e.g., preferred pickup time, questions about the book...)"
                      : "Introduce yourself and explain why you'd like to swap..."}
                    rows={3}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                  />
                </div>
                  </>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 ${isPurchase ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                        {isPurchase ? "Send Purchase Request" : "Send Swap Request"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
