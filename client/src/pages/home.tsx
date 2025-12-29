import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/ui/book-card";
import { SwapCalculator } from "@/components/ui/swap-calculator";
import { ArrowRight, BookOpen, ShieldCheck, Users, Loader2 } from "lucide-react";
import heroImage from "@assets/generated_images/students_exchanging_books_on_campus.png";
import { useAuth } from "@/hooks/useAuth";
import { useRecentBooks } from "@/hooks/useBookListing";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { recentBooks, isLoading: isLoadingListings } = useRecentBooks(8);

  // Transform to match BookCard expected format
  const featuredBooks = useMemo(() => {
    return recentBooks.map(book => ({
      id: book.id.toString(),
      title: book.title,
      author: book.author,
      isbn: book.isbn || "",
      condition: book.condition,
      price: parseFloat(book.price),
      sellerId: book.sellerId,
      schoolId: "",
      status: book.listingStatus === "active" ? "available" : book.listingStatus,
      image: book.primaryPhotoUrl || book.photos?.[0]?.photoUrl || "/placeholder-book.png",
      description: book.description || "",
      category: book.subject,
      listingType: book.listingType,
      willingToSwapFor: book.willingToSwapFor,
      schoolName: book.seller?.schoolName,
    }));
  }, [recentBooks]);

  const handleSellClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setLocation('/signup');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-in slide-in-from-left duration-700">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
                Save Up to 70% on School Books
              </div>
              <h1 className="text-4xl font-display font-bold tracking-tight sm:text-6xl text-foreground">
                Kenya's School Book <br />
                <span className="text-primary">Sharing Community</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-[600px]">
                Buy used textbooks at half price, sell books your child outgrew, or swap grade-to-grade with verified parents from your school.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-12 px-8 text-base" asChild>
                  <Link href="/marketplace">
                    Browse Books
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                  <Link href="/sell" onClick={handleSellClick}>
                    List Your Books
                  </Link>
                </Button>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Safe Escrow</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>School Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>Smart Swaps</span>
                </div>
              </div>
            </div>
            
            <div className="relative animate-in fade-in zoom-in duration-1000 delay-200">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50 dark:border-white/10 aspect-video">
                <img 
                  src={heroImage} 
                  alt="Students swapping books" 
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              
              {/* Floating Element - Calculator Preview */}
              <div className="absolute -bottom-10 -left-10 w-72 hidden md:block shadow-xl rounded-xl">
                <SwapCalculator />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-display font-bold tracking-tight mb-2">Recently Listed Books</h2>
              <p className="text-muted-foreground">Quality textbooks from parents across Kenya. Save money, support families.</p>
            </div>
            <Button variant="ghost" className="hidden sm:flex" asChild>
              <Link href="/marketplace">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoadingListings ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : featuredBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {featuredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
              <h3 className="text-lg font-medium">No books listed yet</h3>
              <p className="text-muted-foreground mb-4">Be the first to list a book!</p>
              <Button asChild>
                <Link href="/sell">List a Book</Link>
              </Button>
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/marketplace">
                View All Listings
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-display font-bold tracking-tight mb-4">Save Up to 70% on School Books</h2>
            <p className="text-muted-foreground text-lg">
              Buy, sell, or swap textbooks with verified parents from your school community. Safe payments, smart matching.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                title: "Search or List Books",
                subtitle: "Find What Your Child Needs",
                desc: "Search by grade, subject, or ISBN. List books your child has outgrown. Our smart system matches you with parents who have what you need."
              },
              {
                icon: ShieldCheck,
                title: "Buy, Sell, or Swap",
                subtitle: "Choose Your Method",
                desc: "Buy used books at 50-70% off retail • Sell books and earn money back • Swap grade-to-grade—our system finds multi-way matches automatically"
              },
              {
                icon: Users,
                title: "Meet & Exchange Safely",
                subtitle: "School-Verified & Secure",
                desc: "Meet parents from your school or nearby. Funds held in escrow until you confirm the book. For swaps, coordinate pickup with matched parents."
              }
            ].map((step, i) => (
              <div key={i} className="relative p-6 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-sm font-medium text-primary mb-2">{step.subtitle}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
