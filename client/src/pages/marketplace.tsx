import { useState, useMemo } from "react";
import { BookCard } from "@/components/ui/book-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, BookOpen, Loader2 } from "lucide-react";
import { useBookListing } from "@/hooks/useBookListing";
import { useSchools } from "@/hooks/useSchools";

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [listingType, setListingType] = useState<string>("all");
  const [sameSchoolOnly, setSameSchoolOnly] = useState(false);

  const { listings, isLoadingListings } = useBookListing();
  const { schools, isLoading: isLoadingSchools } = useSchools();

  // Get unique subjects from listings
  const subjects = useMemo(() => {
    return Array.from(new Set(listings.map(b => b.subject).filter(Boolean)));
  }, [listings]);

  // Filter books
  const filteredBooks = useMemo(() => {
    return listings.filter(book => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSchool = selectedSchool === "all" || book.sellerId === selectedSchool;
      const matchesSubject = selectedSubject === "all" || book.subject === selectedSubject;
      const matchesListingType = listingType === "all" || book.listingType === listingType;

      return matchesSearch && matchesSchool && matchesSubject && matchesListingType;
    });
  }, [listings, searchTerm, selectedSchool, selectedSubject, listingType]);

  // Transform book listings to match BookCard expected format
  const transformedBooks = useMemo(() => {
    return filteredBooks.map(book => ({
      id: book.id.toString(),
      title: book.title,
      author: book.author,
      isbn: book.isbn || "",
      condition: book.condition,
      price: parseFloat(book.price),
      sellerId: book.sellerId,
      schoolId: "", // Books don't have direct schoolId in new schema
      status: book.listingStatus === "active" ? "available" : book.listingStatus,
      image: book.primaryPhotoUrl || book.photos?.[0]?.photoUrl || "/placeholder-book.png",
      description: book.description || "",
      category: book.subject,
      listingType: book.listingType,
      willingToSwapFor: book.willingToSwapFor,
      schoolName: book.seller?.schoolName,
    }));
  }, [filteredBooks]);

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      <div className="bg-background border-b sticky top-16 z-30 shadow-sm">
        <div className="container px-4 py-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                className="pl-9 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <Select value={listingType} onValueChange={setListingType}>
                <SelectTrigger className="w-[140px] h-10">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Listings</SelectItem>
                  <SelectItem value="sell">For Sale</SelectItem>
                  <SelectItem value="swap">For Swap</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-[160px] h-10">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Subject" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold font-display">All Listings</h1>
          <span className="text-muted-foreground text-sm">
            {isLoadingListings ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              `${transformedBooks.length} results`
            )}
          </span>
        </div>

        {isLoadingListings ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : transformedBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {transformedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
            <h3 className="text-lg font-medium">No books found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or search terms.</p>
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedSchool("all");
              setSelectedSubject("all");
            }}>Clear Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}
