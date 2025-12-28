import { useState, useMemo, useEffect } from "react";
import { BookCard } from "@/components/ui/book-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  BookOpen,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal
} from "lucide-react";
import { useBookListing } from "@/hooks/useBookListing";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";

export default function Marketplace() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [listingType, setListingType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Use pagination - fetch filtered results from backend (searches entire database)
  const { listings, pagination, isLoadingListings } = useBookListing({
    page,
    limit: 24,
    subject: selectedSubject !== "all" ? selectedSubject : undefined,
    classGrade: selectedGrade !== "all" ? selectedGrade : undefined,
    condition: selectedCondition !== "all" ? selectedCondition : undefined,
    listingType: listingType !== "all" ? listingType : undefined,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
    sortBy: sortBy !== "newest" ? sortBy : undefined,
  });

  // Grade options (Kenyan education system)
  const grades = useMemo(() => [
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
    "Grade 7", "Grade 8", "Grade 9",
    "Form 1", "Form 2", "Form 3", "Form 4"
  ], []);

  // Subject options
  const subjects = useMemo(() => [
    "Mathematics", "English", "Kiswahili", "Science",
    "Social Studies", "History", "Geography",
    "Physics", "Chemistry", "Biology",
    "Business Studies", "Computer Studies", "Agriculture"
  ], []);

  // Condition options
  const conditions = ["Like New", "Good", "Fair", "Acceptable"];

  // Sort options
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
    { value: "popular", label: "Most Popular" },
  ];

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedGrade, selectedSubject, selectedCondition, listingType, priceRange, sortBy]);

  // Client-side search filter (only for current page)
  const filteredBooks = useMemo(() => {
    if (!debouncedSearchTerm) return listings;

    return listings.filter(book => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        book.title.toLowerCase().includes(searchLower) ||
        book.author?.toLowerCase().includes(searchLower) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchLower))
      );
    });
  }, [listings, debouncedSearchTerm]);

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
      schoolId: "",
      status: book.listingStatus === "active" ? "available" : book.listingStatus,
      image: book.primaryPhotoUrl || book.photos?.[0]?.photoUrl || "/placeholder-book.png",
      description: book.description || "",
      category: book.subject,
      listingType: book.listingType,
      willingToSwapFor: book.willingToSwapFor,
      schoolName: book.seller?.schoolName,
    }));
  }, [filteredBooks]);

  // Quick filter chips
  const quickFilters = [
    {
      label: "My Grade",
      value: user?.childGrade ? `Grade ${user.childGrade}` : null,
      onClick: () => user?.childGrade && setSelectedGrade(`Grade ${user.childGrade}`),
      active: user?.childGrade && selectedGrade === `Grade ${user.childGrade}`,
    },
    {
      label: "Under KSh 500",
      value: "under_500",
      onClick: () => setPriceRange([0, 500]),
      active: priceRange[1] === 500,
    },
    {
      label: "Swap Only",
      value: "swap",
      onClick: () => setListingType("swap"),
      active: listingType === "swap",
    },
    {
      label: "Like New",
      value: "like_new",
      onClick: () => setSelectedCondition("Like New"),
      active: selectedCondition === "Like New",
    },
  ];

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedGrade("all");
    setSelectedSubject("all");
    setSelectedCondition("all");
    setListingType("all");
    setSortBy("newest");
    setPriceRange([0, 10000]);
  };

  const activeFilterCount = [
    selectedGrade !== "all",
    selectedSubject !== "all",
    selectedCondition !== "all",
    listingType !== "all",
    priceRange[0] > 0 || priceRange[1] < 10000,
  ].filter(Boolean).length;

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (pagination?.hasMore) setPage(page + 1);
  };

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      {/* Sticky Filter Bar */}
      <div className="bg-background border-b sticky top-16 z-30 shadow-sm">
        <div className="container px-4 py-4 space-y-4">
          {/* Search Bar */}
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
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-10">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) =>
              filter.value ? (
                <Badge
                  key={filter.value}
                  variant={filter.active ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors px-3 py-1.5"
                  onClick={filter.onClick}
                >
                  {filter.label}
                </Badge>
              ) : null
            )}
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors px-3 py-1.5"
                onClick={clearAllFilters}
              >
                <X className="w-3 h-3 mr-1" />
                Clear All ({activeFilterCount})
              </Badge>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
              {/* Grade Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Grade/Class</label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {grades.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="All Subjects" />
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

              {/* Condition Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Condition</label>
                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    {conditions.map(condition => (
                      <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Listing Type Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Listing Type</label>
                <Select value={listingType} onValueChange={setListingType}>
                  <SelectTrigger className="h-10">
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
              </div>

              {/* Price Range Filter */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">
                  Price Range: KSh {priceRange[0].toLocaleString()} - KSh {priceRange[1].toLocaleString()}
                </label>
                <Slider
                  min={0}
                  max={10000}
                  step={100}
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
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
              <>
                {pagination && (
                  <span>
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </span>
                )}
              </>
            )}
          </span>
        </div>

        {isLoadingListings ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : transformedBooks.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {transformedBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!pagination.hasMore}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
            <h3 className="text-lg font-medium">No books found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or search terms.</p>
            <Button variant="outline" onClick={clearAllFilters}>Clear Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}
