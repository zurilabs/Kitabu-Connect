import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Search, 
  Barcode, 
  Info, 
  DollarSign, 
  Camera, 
  Sparkles 
} from "lucide-react";
import photoHero from "@assets/generated_images/person_photographing_a_textbook.png";

export default function SellBook() {
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [isbn, setIsbn] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isbn) return;
    
    setIsSearching(true);
    // Simulate ISBN lookup
    setTimeout(() => {
      setIsSearching(false);
      setStep('details');
      toast({
        title: "Book Found!",
        description: "We found details for 'Introduction to Algorithms'. Please verify condition.",
      });
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Listing Created!",
      description: "Your book has been listed on the marketplace.",
    });
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      <div className="bg-primary pb-24 pt-12 text-primary-foreground">
        <div className="container px-4">
          <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10 pl-0 mb-6" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 w-4 h-4" /> Back Home
            </Link>
          </Button>
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">Sell Your Textbooks</h1>
            <p className="text-primary-foreground/80 text-lg">
              Turn your old books into cash. List in seconds, get paid securely via escrow.
            </p>
          </div>
        </div>
      </div>

      <div className="container px-4 -mt-16">
        <div className="grid lg:grid-cols-[2fr,1fr] gap-8">
          {/* Main Form Area */}
          <Card className="shadow-xl border-none">
            <CardContent className="p-6 md:p-8">
              {step === 'search' ? (
                <div className="space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                      <Barcode className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold">Start with the ISBN</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Enter the 10 or 13 digit ISBN found on the back of your book to auto-fill details.
                    </p>
                  </div>

                  <form onSubmit={handleSearch} className="max-w-md mx-auto space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <Input 
                        placeholder="e.g. 978-0-262-03384-8" 
                        className="pl-10 h-14 text-lg"
                        value={isbn}
                        onChange={(e) => setIsbn(e.target.value)}
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={isSearching}>
                      {isSearching ? "Searching Database..." : "Find Book"}
                    </Button>
                    <div className="text-center">
                      <Button variant="link" type="button" onClick={() => setStep('details')}>
                        Skip and enter manually
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-8">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      Book Details
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => setStep('search')}>
                      Change ISBN
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">Book Title</Label>
                        <Input id="title" defaultValue={isbn ? "Introduction to Algorithms" : ""} placeholder="Full title of the book" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="author">Author</Label>
                          <Input id="author" defaultValue={isbn ? "Thomas H. Cormen" : ""} placeholder="Author name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edition">Edition (Optional)</Label>
                          <Input id="edition" placeholder="e.g. 3rd Edition" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Subject/Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cs">Computer Science</SelectItem>
                            <SelectItem value="eng">Engineering</SelectItem>
                            <SelectItem value="med">Medicine</SelectItem>
                            <SelectItem value="sci">Science</SelectItem>
                            <SelectItem value="arts">Arts & Humanities</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description & Notes</Label>
                        <Textarea 
                          id="description" 
                          placeholder="Mention any highlights, missing pages, or specific wear..."
                          className="h-32"
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Book Cover Photo</Label>
                        <ImageUpload />
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Clear photos sell 50% faster.
                        </p>
                      </div>

                      <div className="bg-muted/30 p-4 rounded-lg space-y-4 border">
                        <div className="space-y-2">
                          <Label htmlFor="condition">Condition</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New (Unused)</SelectItem>
                              <SelectItem value="like-new">Like New (No markings)</SelectItem>
                              <SelectItem value="good">Good (Minimal wear)</SelectItem>
                              <SelectItem value="fair">Fair (Highlighted/Worn)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="price">Selling Price (KSh)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">KSh</span>
                            <Input id="price" type="number" placeholder="0.00" className="pl-12" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setLocation('/')}>Cancel</Button>
                    <Button type="submit" size="lg" className="px-8">Publish Listing</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Sidebar Tips */}
          <div className="space-y-6">
            <div className="rounded-xl overflow-hidden shadow-md">
              <img src={photoHero} alt="Taking photo" className="w-full h-48 object-cover" />
              <div className="bg-card p-5 border-t">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <Camera className="w-4 h-4 text-primary" />
                  Photo Tips
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                  <li>Use natural lighting</li>
                  <li>Show the spine and back cover</li>
                  <li>Photograph any damage clearly</li>
                  <li>Avoid blurry or dark shots</li>
                </ul>
              </div>
            </div>

            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Pricing Guide
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Books in "Good" condition typically sell for 40-60% of the original retail price.
                </p>
                <div className="text-xs bg-muted p-2 rounded">
                  <span className="font-medium">Platform Fee:</span> 12% is deducted only when the book sells.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
