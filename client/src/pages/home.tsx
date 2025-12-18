import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/ui/book-card";
import { SwapCalculator } from "@/components/ui/swap-calculator";
import { MOCK_BOOKS } from "@/lib/mockData";
import { ArrowRight, BookOpen, ShieldCheck, Users } from "lucide-react";
import heroImage from "@assets/generated_images/students_exchanging_books_on_campus.png";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const featuredBooks = MOCK_BOOKS.slice(0, 3);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-in slide-in-from-left duration-700">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                New: Escrow Protection Added
              </div>
              <h1 className="text-4xl font-display font-bold tracking-tight sm:text-6xl text-foreground">
                The Trust-Based <br />
                <span className="text-primary">Textbook Marketplace</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-[600px]">
                Buy, sell, and swap textbooks with parents close to 
                your location. 
                Secure payments, verified handshakes, and zero stress.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-12 px-8 text-base" asChild>
                  <Link href="/marketplace">
                    Find Books
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                  <Link href="/sell" onClick={handleSellClick}>
                    Sell a Book
                  </Link>
                </Button>
              </div>
              
              <div className="pt-4 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Escrow Protected</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Campus Verified</span>
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
        <div className="container px-4 md:px-6">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-display font-bold tracking-tight mb-2">Fresh on the Shelf</h2>
              <p className="text-muted-foreground">Recently listed textbooks from your campus.</p>
            </div>
            <Button variant="ghost" className="hidden sm:flex" asChild>
              <Link href="/marketplace">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          
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
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-display font-bold tracking-tight mb-4">Safe & Simple P2P Trading</h2>
            <p className="text-muted-foreground text-lg">
              We've removed the risk from peer-to-peer trading. Your money is held safe until you have the book in hand.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                title: "1. Find or List",
                desc: "Search for the books you need by ISBN or course code, or list your own in seconds."
              },
              {
                icon: ShieldCheck,
                title: "2. Secure Payment",
                desc: "Pay through the app. We hold the funds in escrow. The seller doesn't get paid until you confirm."
              },
              {
                icon: Users,
                title: "3. Meet & Exchange",
                desc: "Meet on campus. Check the book. Scan the QR code to release funds instantly."
              }
            ].map((step, i) => (
              <div key={i} className="relative p-6 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
