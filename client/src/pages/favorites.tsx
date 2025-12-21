import { Heart, BookOpen, Loader2, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useFavorites } from "@/hooks/use-favorites";
import { FavoriteButton } from "@/components/books/FavoriteButton";
import { generateBookSlug } from "@/lib/utils";

export default function Favorites() {
  const { data, isLoading, error } = useFavorites(50, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Failed to load favorites</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const favorites = data?.favorites || [];
  const isEmpty = favorites.length === 0;

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Heart className="w-6 h-6 text-primary fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">My Favorites</h1>
              <p className="text-sm text-muted-foreground">
                {favorites.length} {favorites.length === 1 ? "book" : "books"} saved
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container px-4 py-8">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Heart className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start exploring the marketplace and tap the heart icon on books you like to save
              them here.
            </p>
            <Button asChild>
              <Link href="/marketplace">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Marketplace
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite) => {
              const book = favorite.listing;
              const seller = favorite.seller;
              const bookSlug = generateBookSlug(book.title, book.id.toString());

              return (
                <Card
                  key={favorite.favoriteId}
                  className="overflow-hidden group hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={book.coverImageUrl || "/placeholder-book.png"}
                      alt={book.title}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={book.status === "available" ? "default" : "secondary"}
                        className="bg-background/80 backdrop-blur text-foreground font-medium text-xs px-2 py-0.5"
                      >
                        {book.condition}
                      </Badge>
                    </div>
                    <div className="absolute top-2 left-2">
                      <FavoriteButton
                        listingId={book.id}
                        initialIsFavorited={true}
                        size="icon"
                        className="bg-background/80 backdrop-blur hover:bg-background/90"
                      />
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">{book.subject}</div>
                    <h3
                      className="font-display font-semibold text-base leading-tight mb-1 line-clamp-2"
                      title={book.title}
                    >
                      {book.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                      {book.author}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-xl text-primary">
                        KSh {parseFloat(book.price).toLocaleString()}
                      </div>
                      {book.originalRetailPrice && (
                        <div className="text-xs text-muted-foreground line-through">
                          KSh {parseFloat(book.originalRetailPrice).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {seller && (
                      <div className="text-xs text-muted-foreground">
                        Sold by {seller.fullName || "Seller"}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground mt-1">
                      Added {new Date(favorite.addedAt).toLocaleDateString()}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex gap-2">
                    <Button className="flex-1 h-9" asChild>
                      <Link href={`/book/${bookSlug}`}>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {data?.hasMore && (
          <div className="mt-8 text-center">
            <Button variant="outline">Load More</Button>
          </div>
        )}
      </div>
    </div>
  );
}
