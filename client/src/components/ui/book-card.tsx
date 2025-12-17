import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Book } from "@/lib/mockData";
import { Link } from "wouter";
import { MapPin, User, ArrowRight } from "lucide-react";

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <img 
          src={book.image} 
          alt={book.title}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-2 right-2">
          <Badge variant={book.status === 'available' ? 'default' : 'secondary'} className="bg-background/80 backdrop-blur text-foreground font-medium">
            {book.condition}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground mb-1">{book.category}</div>
        <h3 className="font-display font-semibold text-lg leading-tight mb-1 truncate" title={book.title}>
          {book.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3 truncate">{book.author}</p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>Seller ID: {book.sellerId}</span>
          </div>
        </div>
        
        <div className="font-bold text-xl text-primary">
          ₦{book.price.toLocaleString()}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full group-hover:bg-primary/90" asChild>
          <Link href={`/book/${book.id}`}>
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
