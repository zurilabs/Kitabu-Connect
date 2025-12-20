import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { Wallet, Package, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBookListing } from "@/hooks/useBookListing";
import { Link } from "wouter";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("listings");
  const { toast } = useToast();
  const { user } = useAuth();
  const { myListings, isLoadingMyListings, deleteListing } = useBookListing();

  const handleDeleteListing = (id: number, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteListing.mutate(id);
    }
  };

  // Calculate stats from listings
  const activeListingsCount = myListings.filter(l => l.listingStatus === "active").length;
  const totalSalesAmount = myListings
    .filter(l => l.listingStatus === "sold")
    .reduce((sum, l) => sum + parseFloat(l.price.toString()), 0);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  return (
    <div className="container px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        {/* Profile Summary */}
        <Card className="w-full md:w-1/3">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(user?.fullName || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user?.fullName || "User"}</CardTitle>
              <CardDescription>{user?.email || user?.phoneNumber}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">Wallet Balance</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                KSh {parseFloat(user?.walletBalance || "0").toLocaleString()}
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="w-full text-xs">Top Up</Button>
                <Button size="sm" variant="outline" className="w-full text-xs">Withdraw</Button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">School:</span>
                <span className="font-medium">{user?.schoolName || "Not set"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Grade:</span>
                <span className="font-medium">Grade {user?.childGrade || "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 w-full md:w-2/3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeListingsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Books for sale</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {totalSalesAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">From sold books</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myListings.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All listings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {myListings.reduce((sum, l) => sum + (l.viewsCount || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total views</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="listings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Listings</CardTitle>
                <CardDescription>Manage books you are selling.</CardDescription>
              </div>
              <Button asChild>
                <Link href="/sell">
                  <Plus className="w-4 h-4 mr-2" />
                  List a Book
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingMyListings ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading your listings...
                </div>
              ) : myListings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active listings found.
                  <div className="mt-4">
                    <Button asChild>
                      <Link href="/sell">List Your First Book</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {myListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                          {listing.primaryPhotoUrl ? (
                            <img
                              src={listing.primaryPhotoUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{listing.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {listing.author} • {listing.subject} • {listing.classGrade}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant={listing.listingStatus === "active" ? "default" : "secondary"}>
                              {listing.listingStatus}
                            </Badge>
                            <Badge variant="outline">{listing.condition}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <div className="font-bold text-lg">KSh {parseFloat(listing.price.toString()).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {listing.viewsCount || 0} views
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/edit-book/${listing.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteListing(listing.id, listing.title)}
                            disabled={deleteListing.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Your buying and selling history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet. Start buying or selling books to see your transaction history here.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
