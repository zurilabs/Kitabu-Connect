import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Book } from "@/lib/mockData";
import { Link } from "wouter";
import { MapPin, User, ArrowRight, ArrowLeftRight, School } from "lucide-react";
import { generateBookSlug } from "@/lib/utils";
import { FavoriteButton } from "@/components/books/FavoriteButton";
import { useIsFavorited } from "@/hooks/use-favorites";

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const bookSlug = generateBookSlug(book.title, book.id);
  const listingId = parseInt(book.id);
  const isFavorited = useIsFavorited(listingId);

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={book.image}
          alt={book.title}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
        />
        {book.listingType === 'swap' && (
          <div className="absolute top-1.5 right-1.5">
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs px-2.5 py-0.5 flex items-center gap-1">
              <ArrowLeftRight className="w-3 h-3" />
              SWAP
            </Badge>
          </div>
        )}
        {book.listingType !== 'swap' && (
          <div className="absolute top-1.5 right-1.5">
            <Badge variant={book.status === 'available' ? 'default' : 'secondary'} className="bg-background/80 backdrop-blur text-foreground font-medium text-xs px-2 py-0.5">
              {book.condition}
            </Badge>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <FavoriteButton
            listingId={listingId}
            initialIsFavorited={isFavorited}
            size="icon"
            className="bg-background/80 backdrop-blur hover:bg-background/90"
          />
        </div>
      </div>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground mb-0.5">{book.category}</div>
        <h3 className="font-display font-semibold text-base leading-tight mb-0.5 truncate" title={book.title}>
          {book.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-2 truncate">{book.author}</p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {book.schoolName && (
            <div className="flex items-center gap-1">
              <School className="w-3 h-3" />
              <span className="text-xs truncate">{book.schoolName}</span>
            </div>
          )}
        </div>

        {book.listingType === 'swap' ? (
          <div className="text-sm font-semibold text-blue-600">
            Looking to swap
          </div>
        ) : (
          <div className="font-bold text-lg text-primary">
            KSh {book.price.toLocaleString()}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button className="w-full group-hover:bg-primary/90 h-8 text-sm" asChild>
          <Link href={`/book/${bookSlug}`}>
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
