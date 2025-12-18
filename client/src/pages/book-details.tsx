import { useParams, useLocation } from "wouter";
import { MOCK_BOOKS, SCHOOLS, CURRENT_USER } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  MapPin, 
  ShieldCheck, 
  User, 
  BookOpen, 
  AlertCircle,
  Truck
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function BookDetails() {
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const book = MOCK_BOOKS.find(b => b.id === id);
  
  if (!book) {
    return <div className="container py-20 text-center">Book not found</div>;
  }

  const school = SCHOOLS.find(s => s.id === book.schoolId);

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
              src={book.image} 
              alt={book.title}
              className="w-full h-full object-cover"
            />
            {book.status !== 'available' && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                <Badge className="text-lg px-6 py-2">{book.status.toUpperCase()}</Badge>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                <BookOpen className="w-4 h-4" />
                <span>{book.category}</span>
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
                <p className="font-mono text-foreground">{book.isbn}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Condition</h3>
                <Badge variant="outline">{book.condition}</Badge>
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-muted-foreground">
              <h3 className="text-foreground font-medium mb-2">Description</h3>
              <p>{book.description}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Action Card */}
        <div className="md:sticky md:top-24 h-fit space-y-6">
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-3xl font-bold text-primary">KSh {book.price.toLocaleString()}</span>
              </div>

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
                      <span className="truncate">{school?.name}</span>
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

              <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogTrigger asChild>
                  <Button className="w-full h-12 text-lg font-semibold" disabled={book.status !== 'available'}>
                    {book.status === 'available' ? 'Buy Now' : 'Not Available'}
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
                      <span>KSh {book.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Logistics Fee
                      </span>
                      <span>KSh 1,500</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>KSh {(book.price + 1500).toLocaleString()}</span>
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
                      {isProcessing ? "Processing..." : `Pay KSh ${(book.price + 1500).toLocaleString()}`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
