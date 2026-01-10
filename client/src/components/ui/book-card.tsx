import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookPlaceholder } from "@/components/ui/book-placeholder";
import { Book } from "@/lib/mockData";
import { Link } from "wouter";
import { ArrowLeftRight, BookUser } from "lucide-react";
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

  // Check if book has a valid image
  const hasValidImage = book.image &&
    book.image !== "/placeholder-book.png" &&
    !book.image.includes("placeholder");

  // Calculate savings (estimate retail as 2.5x selling price for used books)
  const estimatedRetailPrice = book.listingType !== 'swap' ? book.price * 2.5 : 0;
  const savings = book.listingType !== 'swap' ? estimatedRetailPrice - book.price : 0;
  const savingsPercentage = book.listingType !== 'swap' ? Math.round((savings / estimatedRetailPrice) * 100) : 0;

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-all duration-200 border-border/50">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {hasValidImage ? (
          <img
            src={book.image}
            alt={book.title}
            width="300"
            height="300"
            loading="lazy"
            decoding="async"
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <BookPlaceholder
              title={book.title}
              className="w-2/3 h-5/6 transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        {/* Condition Badge - Top Right */}
        {book.listingType === 'swap' ? (
          <div className="absolute top-1 right-1">
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
              <ArrowLeftRight className="w-2.5 h-2.5" />
              SWAP
            </Badge>
          </div>
        ) : (
          <div className="absolute top-1 right-1">
            <Badge className="bg-background/90 backdrop-blur text-foreground font-medium text-[10px] px-1.5 py-0.5">
              {book.condition}
            </Badge>
          </div>
        )}
        {/* Favorite Button - Top Left */}
        <div className="absolute top-1 left-1">
          <FavoriteButton
            listingId={listingId}
            initialIsFavorited={isFavorited}
            size="icon"
            className="h-7 w-7 bg-background/80 backdrop-blur hover:bg-background/90"
          />
        </div>
      </div>
      <CardContent className="p-2">
        {/* Title */}
        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2 min-h-[2.5rem]" title={book.title}>
          {book.title}
        </h3>

        {/* Author */}
        {book.author && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
            <BookUser className="w-2.5 h-2.5" />
            <span className="truncate">{book.author}</span>
          </div>
        )}

        {/* Price or Swap Info */}
        {book.listingType === 'swap' ? (
          <div className="text-xs font-semibold text-blue-600 mt-2">
            Looking to swap
          </div>
        ) : (
          <div className="mt-1">
            <div className="font-bold text-base text-primary">
              KSh {book.price.toLocaleString()}
            </div>
            {savingsPercentage > 0 && (
              <div className="flex items-center gap-1 text-[10px] mt-0.5">
                <span className="text-green-600 font-medium">Save {savingsPercentage}%</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 pt-0">
        <Button className="w-full h-7 text-xs" variant="outline" asChild>
          <Link href={`/book/${bookSlug}`}>
            View
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
