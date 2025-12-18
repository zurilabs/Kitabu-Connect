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
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={book.image}
          alt={book.title}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-1.5 right-1.5">
          <Badge variant={book.status === 'available' ? 'default' : 'secondary'} className="bg-background/80 backdrop-blur text-foreground font-medium text-xs px-2 py-0.5">
            {book.condition}
          </Badge>
        </div>
      </div>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground mb-0.5">{book.category}</div>
        <h3 className="font-display font-semibold text-base leading-tight mb-0.5 truncate" title={book.title}>
          {book.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-2 truncate">{book.author}</p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="text-xs">Seller ID: {book.sellerId}</span>
          </div>
        </div>

        <div className="font-bold text-lg text-primary">
          KSh {book.price.toLocaleString()}
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button className="w-full group-hover:bg-primary/90 h-8 text-sm" asChild>
          <Link href={`/book/${book.id}`}>
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
