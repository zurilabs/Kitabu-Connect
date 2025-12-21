import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  BookOpen,
  AlertCircle,
  Truck,
  Loader2,
  ArrowLeftRight
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useBookListing } from "@/hooks/useBookListing";
import { useAuth } from "@/hooks/useAuth";
import { extractIdFromSlug } from "@/lib/utils";

export default function BookDetails() {
  const { id: slug } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Extract book ID from slug
  const bookId = slug ? parseInt(extractIdFromSlug(slug)) : 0;
  const { data: bookData, isLoading } = useBookListing().fetchBookListing(bookId);

  if (isLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bookData?.listing) {
    return <div className="container py-20 text-center">Book not found</div>;
  }

  const book = bookData.listing;
  const isSwap = book.listingType === 'swap';
  const bookPrice = book.price ? Number(book.price) : 0;
  const originalPrice = book.originalRetailPrice ? Number(book.originalRetailPrice) : null;
  const convenienceFee = bookPrice * 0.05; // 5% convenience fee
  const totalPrice = bookPrice + convenienceFee;

  const handleBuy = async () => {
    setIsProcessing(true);

    // Simulate Paystack processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsProcessing(false);
    setShowConfirm(false);

    toast({
      title: "Payment Successful!",
      description: "Funds are now held in escrow. Visit your dashboard to track this transaction.",
    });

    setLocation('/dashboard');
  };

  const handleInitiateSwap = () => {
    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to initiate a swap.",
        variant: "destructive",
      });
      setLocation('/login');
      return;
    }

    // Navigate to swap request flow
    setLocation(`/swaps/new?listingId=${book.id}`);
  };

  return (
    <div className="container px-4 py-8 max-w-5xl">
      <Button variant="ghost" className="mb-6 pl-0 hover:pl-2 transition-all" onClick={() => window.history.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
      </Button>

      <div className="grid md:grid-cols-[2fr,1.2fr] gap-8 lg:gap-12">
        {/* Left Column: Image & Info */}
        <div className="space-y-8">
          <div className="rounded-xl overflow-hidden border bg-muted aspect-[4/3] relative">
            <img
              src={book.primaryPhotoUrl || book.photos?.[0]?.photoUrl || "/placeholder-book.png"}
              alt={book.title}
              className="w-full h-full object-cover"
            />
            {isSwap && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 flex items-center gap-1">
                  <ArrowLeftRight className="w-4 h-4" />
                  SWAP
                </Badge>
              </div>
            )}
            {book.listingStatus !== 'active' && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                <Badge className="text-lg px-6 py-2">{book.listingStatus.toUpperCase()}</Badge>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                <BookOpen className="w-4 h-4" />
                <span>{book.subject}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                {book.title}
              </h1>
              <p className="text-xl text-muted-foreground">{book.author}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">ISBN</h3>
                <p className="font-mono text-foreground">{book.isbn || "N/A"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Condition</h3>
                <Badge variant="outline">{book.condition}</Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Publisher</h3>
                <p className="text-foreground">{book.publisher || "N/A"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Edition</h3>
                <p className="text-foreground">{book.edition || "N/A"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Class/Grade</h3>
                <p className="text-foreground">{book.classGrade}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Language</h3>
                <p className="text-foreground">{book.language}</p>
              </div>
            </div>

            {book.description && (
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <h3 className="text-foreground font-medium mb-2">Description</h3>
                <p>{book.description}</p>
              </div>
            )}

            {book.conditionNotes && (
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-2">Condition Notes</h3>
                <p className="text-sm text-muted-foreground">{book.conditionNotes}</p>
              </div>
            )}

            {isSwap && book.willingToSwapFor && (
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Looking to swap for:</h3>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">{book.willingToSwapFor}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Action Card */}
        <div className="md:sticky md:top-24 h-fit space-y-6">
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardContent className="p-6 space-y-6">
              {isSwap ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ArrowLeftRight className="w-6 h-6 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">Swap Only</span>
                  </div>
                  <p className="text-sm text-muted-foreground">No payment required - book exchange</p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className="text-3xl font-bold text-primary">KSh {bookPrice.toLocaleString()}</span>
                  </div>

                  {originalPrice && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Original Price</span>
                      <span className="line-through text-muted-foreground">
                        KSh {originalPrice.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {book.negotiable && (
                    <Badge variant="secondary" className="w-full justify-center">
                      Price Negotiable
                    </Badge>
                  )}
                </>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>S</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">Seller ID: {book.sellerId}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">Available quantity: {book.quantityAvailable}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg flex gap-3 text-sm text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-semibold block">Escrow Protection</span>
                    Funds are held until you receive the book.
                  </div>
                </div>
              </div>

              {isSwap ? (
                <Button
                  className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                  disabled={book.listingStatus !== 'active'}
                  onClick={handleInitiateSwap}
                >
                  <ArrowLeftRight className="w-5 h-5 mr-2" />
                  {book.listingStatus === 'active' ? 'Initiate Swap' : 'Not Available'}
                </Button>
              ) : (
                <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-12 text-lg font-semibold" disabled={book.listingStatus !== 'active'}>
                      {book.listingStatus === 'active' ? 'Buy Now' : 'Not Available'}
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Purchase</DialogTitle>
                    <DialogDescription>
                      You are about to purchase <strong>{book.title}</strong>.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Book Price</span>
                      <span>KSh {bookPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Convenience Fee (5%)
                      </span>
                      <span>KSh {convenienceFee.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>KSh {totalPrice.toLocaleString()}</span>
                    </div>

                    <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p>
                        Clicking "Pay Securely" will initialize a Paystack transaction.
                        Your funds will be locked in escrow until you confirm receipt.
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                    <Button onClick={handleBuy} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
                      {isProcessing ? "Processing..." : `Pay KSh ${totalPrice.toLocaleString()}`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Additional Book Info */}
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Curriculum</span>
                <span className="font-medium">{book.curriculum || "N/A"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Term</span>
                <span className="font-medium">{book.term || "All Terms"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Region</span>
                <span className="font-medium">{book.region}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Views</span>
                <span className="font-medium">{book.viewsCount || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
