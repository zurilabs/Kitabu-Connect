import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { BookCard } from "@/components/ui/book-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Link } from "wouter";
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
  X,
  SlidersHorizontal,
  ArrowUp,
  MapPin,
  School as SchoolIcon,
  TrendingDown,
  ChevronDown,
  RefreshCw
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { useActiveChild } from "@/contexts/ActiveChildContext";

export default function Marketplace() {
  const { user } = useAuth();
  const { activeChild, children, setActiveChild } = useActiveChild();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [listingType, setListingType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sameSchoolOnly, setSameSchoolOnly] = useState(false);
  const [showChildSelector, setShowChildSelector] = useState(false);
  const [curriculum, setCurriculum] = useState<string>("all");
  const [negotiableOnly, setNegotiableOnly] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);

  // Infinite scroll state
  const [page, setPage] = useState(1);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Smart sticky filter bar state
  const [filterBarSticky, setFilterBarSticky] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Build filter params
  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedSubject !== "all") params.append("subject", selectedSubject);
    if (selectedGrade !== "all") params.append("classGrade", selectedGrade);
    if (selectedCondition !== "all") params.append("condition", selectedCondition);
    if (listingType !== "all") params.append("listingType", listingType);
    if (priceRange[0] > 0) params.append("minPrice", priceRange[0].toString());
    if (priceRange[1] < 10000) params.append("maxPrice", priceRange[1].toString());
    if (sortBy !== "newest") params.append("sortBy", sortBy);
    if (sameSchoolOnly && activeChild?.schoolId) params.append("schoolId", activeChild.schoolId);
    if (curriculum !== "all") params.append("curriculum", curriculum);
    if (negotiableOnly) params.append("negotiable", "true");
    if (maxDistance) {
      params.append("maxDistance", maxDistance.toString());
      // Prefer school-based distance (privacy-friendly)
      if (activeChild?.schoolId) {
        params.append("userSchoolId", activeChild.schoolId);
      }
      // Fallback to user coordinates if available
      if (user?.latitude && user?.longitude) {
        params.append("userLatitude", user.latitude.toString());
        params.append("userLongitude", user.longitude.toString());
      }
    }
    params.append("page", page.toString());
    params.append("limit", "24");
    return params.toString();
  }, [selectedGrade, selectedSubject, selectedCondition, listingType, priceRange, sortBy, sameSchoolOnly, activeChild, curriculum, negotiableOnly, maxDistance, user, page]);

  // Fetch books with React Query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["marketplace-books", filterParams],
    queryFn: async () => {
      const response = await fetch(`/api/books?${filterParams}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch books");
      return response.json();
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Update accumulated books when new data arrives
  useEffect(() => {
    if (data?.listings) {
      console.log('[Marketplace] Data received:', {
        page,
        newBooks: data.listings.length,
        pagination: data.pagination,
        hasMore: data.pagination?.hasMore
      });

      if (page === 1) {
        // Reset books on filter change
        setAllBooks(data.listings);
      } else {
        // Append new books for pagination
        setAllBooks(prev => {
          const combined = [...prev, ...data.listings];
          console.log('[Marketplace] Combined books:', combined.length);
          return combined;
        });
      }
      setHasMore(data.pagination?.hasMore || false);
    }
  }, [data, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setAllBooks([]);
  }, [selectedGrade, selectedSubject, selectedCondition, listingType, priceRange, sortBy, sameSchoolOnly, curriculum, negotiableOnly, maxDistance]);

  // Infinite scroll observer
  useEffect(() => {
    // Use a small timeout to ensure the ref is attached after render
    const timeoutId = setTimeout(() => {
      console.log('[Marketplace] Observer check:', {
        hasRef: !!loadMoreRef.current,
        hasMore,
        isLoading,
        isFetching,
        page
      });

      if (!loadMoreRef.current || !hasMore || isLoading) return;

      const observer = new IntersectionObserver(
        (entries) => {
          console.log('[Marketplace] Observer triggered:', {
            isIntersecting: entries[0].isIntersecting,
            hasMore,
            isFetching,
            page
          });

          if (entries[0].isIntersecting && hasMore && !isFetching) {
            console.log('[Marketplace] Loading more books...', { currentPage: page, nextPage: page + 1 });
            setPage(prev => prev + 1);
          }
        },
        {
          threshold: 0.1,
          rootMargin: '100px' // Trigger 100px before the element is visible
        }
      );

      console.log('[Marketplace] Observer attached to element');
      observer.observe(loadMoreRef.current);

      // Cleanup function to disconnect observer when dependencies change
      return () => {
        console.log('[Marketplace] Observer disconnected');
        observer.disconnect();
      };
    }, 100); // Small delay to ensure DOM is ready

    // Cleanup timeout if effect re-runs
    return () => clearTimeout(timeoutId);
  }, [hasMore, isLoading, isFetching, page]);

  // Smart sticky filter bar + scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingUp = currentScrollY < lastScrollY;
      const scrollingDown = currentScrollY > lastScrollY;

      // Make filter bar sticky when scrolling up and past threshold
      // Remove sticky when scrolling down or at top
      if (scrollingUp && currentScrollY > 150) {
        setFilterBarSticky(true);
      } else if (scrollingDown || currentScrollY < 100) {
        setFilterBarSticky(false);
      }

      setLastScrollY(currentScrollY);
      setShowScrollTop(currentScrollY > 400);
    };

    // Throttle for performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });
    return () => window.removeEventListener("scroll", throttledScroll);
  }, [lastScrollY]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Grade options
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
    { value: "distance", label: "Nearest to Me", icon: <MapPin className="w-3 h-3" /> },
    { value: "popular", label: "Most Popular" },
  ];

  // Client-side search filter
  const filteredBooks = useMemo(() => {
    if (!debouncedSearchTerm) return allBooks;

    return allBooks.filter(book => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        book.title.toLowerCase().includes(searchLower) ||
        book.author?.toLowerCase().includes(searchLower) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchLower))
      );
    });
  }, [allBooks, debouncedSearchTerm]);

  // Transform books
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

  // Quick filter chips - use active child's grade if available
  const quickFilters = [
    {
      id: "my_grade",
      label: activeChild ? `${activeChild.grade}` : "My Grade",
      icon: <BookOpen className="w-3 h-3" />,
      value: activeChild?.grade || null,
      onClick: () => activeChild?.grade && setSelectedGrade(activeChild.grade),
      active: activeChild && selectedGrade === activeChild.grade,
      disabled: !activeChild,
    },
    {
      id: "same_school",
      label: activeChild?.schoolName ? activeChild.schoolName : "Same School",
      icon: <SchoolIcon className="w-3 h-3" />,
      value: "same_school",
      onClick: () => setSameSchoolOnly(!sameSchoolOnly),
      active: sameSchoolOnly,
      disabled: !activeChild?.schoolId,
    },
    {
      id: "within_5km",
      label: "Within 5km",
      icon: <MapPin className="w-3 h-3" />,
      value: "5km",
      onClick: () => setMaxDistance(maxDistance === 5 ? null : 5),
      active: maxDistance === 5,
      disabled: !(activeChild?.schoolId || (user?.latitude && user?.longitude)),
    },
    {
      id: "under_500",
      label: "Under KSh 500",
      icon: <TrendingDown className="w-3 h-3" />,
      value: "under_500",
      onClick: () => setPriceRange([0, 500]),
      active: priceRange[1] === 500 && priceRange[0] === 0,
      disabled: false,
    },
    {
      id: "swap",
      label: "Swap Only",
      icon: <RefreshCw className="w-3 h-3" />,
      value: "swap",
      onClick: () => setListingType(listingType === "swap" ? "all" : "swap"),
      active: listingType === "swap",
      disabled: false,
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
    setSameSchoolOnly(false);
    setCurriculum("all");
    setNegotiableOnly(false);
    setMaxDistance(null);
  };

  const activeFilterCount = [
    selectedGrade !== "all",
    selectedSubject !== "all",
    selectedCondition !== "all",
    listingType !== "all",
    priceRange[0] > 0 || priceRange[1] < 10000,
    sameSchoolOnly,
    curriculum !== "all",
    negotiableOnly,
    maxDistance !== null,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      {/* Child Selector Banner */}
      {children.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-b sticky top-0 z-40">
          <div className="container px-4 lg:px-8 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <SchoolIcon className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Shopping for:</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-primary/20 hover:border-primary/40 bg-background/80"
                  onClick={() => setShowChildSelector(!showChildSelector)}
                >
                  {activeChild ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{activeChild.displayName}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm">{activeChild.grade}</span>
                      {activeChild.schoolName && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground max-w-[150px] truncate">{activeChild.schoolName}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span>Select a child</span>
                  )}
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showChildSelector ? "rotate-180" : ""}`} />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {data?.pagination?.total && (
                  <>
                    <MapPin className="w-3 h-3" />
                    <span>{data.pagination.total} books available</span>
                  </>
                )}
              </div>
            </div>

            {/* Child Selector Dropdown */}
            {showChildSelector && (
              <div className="mt-3 p-3 bg-background rounded-lg border shadow-lg animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {children.map((child) => (
                    <Button
                      key={child.id}
                      variant={activeChild?.id === child.id ? "default" : "outline"}
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => {
                        setActiveChild(child);
                        setShowChildSelector(false);
                        // Auto-apply child's grade filter
                        setSelectedGrade(child.grade);
                      }}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-semibold">{child.displayName}</span>
                        <span className="text-xs text-muted-foreground">{child.grade} · {child.schoolName || "No school"}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Smart Sticky Filter Bar */}
      <>
        {/* Placeholder to prevent content jump when filter bar becomes fixed */}
        {filterBarSticky && <div className="h-[140px]" />}

        <div
          ref={filterBarRef}
          className={`bg-background border-b transition-all duration-300 ${
            filterBarSticky
              ? 'fixed top-0 left-0 right-0 z-40 shadow-lg animate-in slide-in-from-top-2'
              : 'relative'
          }`}
        >
          <div className="container px-4 lg:px-8 py-4 space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                className={`pl-9 h-10 ${searchTerm ? 'pr-20' : 'pr-4'} ${debouncedSearchTerm ? 'ring-2 ring-primary/20' : ''}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchTerm('');
                  }
                }}
              />
              {/* Search State Indicators */}
              {searchTerm && (
                <div className="absolute right-3 top-2.5 flex items-center gap-2">
                  {searchTerm !== debouncedSearchTerm && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-muted"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {/* Search Results Count */}
              {debouncedSearchTerm && (
                <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">
                  Found {transformedBooks.length} {transformedBooks.length === 1 ? 'book' : 'books'} matching "{debouncedSearchTerm}"
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[200px] h-10">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 relative"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <Badge
                key={filter.id}
                variant={filter.active ? "default" : "outline"}
                className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                  filter.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:bg-primary/90 hover:text-primary-foreground"
                }`}
                onClick={filter.disabled ? undefined : filter.onClick}
              >
                {filter.icon}
                <span>{filter.label}</span>
              </Badge>
            ))}
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

              {/* Curriculum Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Curriculum</label>
                <Select value={curriculum} onValueChange={setCurriculum}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Curriculums" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Curriculums</SelectItem>
                    <SelectItem value="CBC">CBC</SelectItem>
                    <SelectItem value="8-4-4">8-4-4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Distance Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Distance {activeChild?.schoolId && "(from school)"}
                </label>
                <Select
                  value={maxDistance?.toString() || "all"}
                  onValueChange={(value) => setMaxDistance(value === "all" ? null : Number(value))}
                  disabled={!(activeChild?.schoolId || (user?.latitude && user?.longitude))}
                >
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Any Distance" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Distance</SelectItem>
                    <SelectItem value="5">Within 5 km</SelectItem>
                    <SelectItem value="10">Within 10 km</SelectItem>
                    <SelectItem value="25">Within 25 km</SelectItem>
                    <SelectItem value="50">Within 50 km</SelectItem>
                  </SelectContent>
                </Select>
                {!activeChild?.schoolId && !user?.latitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a child or enable location to use distance filter
                  </p>
                )}
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

              {/* Negotiable Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="negotiable"
                  checked={negotiableOnly}
                  onChange={(e) => setNegotiableOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="negotiable" className="text-sm font-medium cursor-pointer">
                  Negotiable prices only
                </label>
              </div>
            </div>
          )}
          </div>
        </div>
      </>

      {/* Results Section */}
      <div className="container px-4 lg:px-8 py-8">
        {/* Active Filters Summary */}
        {(activeFilterCount > 0 || debouncedSearchTerm) && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Active filters:</span>
                {debouncedSearchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{debouncedSearchTerm}"
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-muted"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {selectedGrade !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedGrade}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-muted"
                      onClick={() => setSelectedGrade("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {selectedSubject !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedSubject}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-muted"
                      onClick={() => setSelectedSubject("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {listingType !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {listingType === "swap" ? "Swap only" : "For sale"}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-muted"
                      onClick={() => setListingType("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {maxDistance && (
                  <Badge variant="secondary" className="gap-1">
                    Within {maxDistance}km
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-muted"
                      onClick={() => setMaxDistance(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={clearAllFilters}
              >
                Clear all
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold font-display">
            {debouncedSearchTerm ? 'Search Results' : 'All Listings'}
          </h1>
          <span className="text-muted-foreground text-sm">
            {transformedBooks.length > 0 && (
              <span>
                Showing {transformedBooks.length} of {data?.pagination?.total || 0} books
              </span>
            )}
          </span>
        </div>

        {isLoading && allBooks.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : transformedBooks.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {transformedBooks.map((book) => (
                <BookCard key={`${book.id}-${book.sellerId}`} book={book} />
              ))}
            </div>

            {/* Infinite Scroll Trigger - Always render but conditionally show */}
            <div ref={loadMoreRef} className="mt-8 flex items-center justify-center py-8">
              {hasMore && isFetching && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading more books...</span>
                </div>
              )}
              {!hasMore && allBooks.length > 0 && (
                <div className="text-center text-muted-foreground text-sm">
                  You've reached the end. No more books to show.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed max-w-2xl mx-auto">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">
              {debouncedSearchTerm ? `No books found for "${debouncedSearchTerm}"` : 'No books found'}
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              {debouncedSearchTerm
                ? "Try searching with different keywords or check your spelling"
                : "Try adjusting your filters to see more results"}
            </p>

            {/* Helpful suggestions */}
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-muted-foreground">Suggestions:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                {debouncedSearchTerm && <li>• Check your spelling or try different keywords</li>}
                {selectedSubject !== "all" && <li>• Try browsing other subjects</li>}
                {selectedGrade !== "all" && <li>• Expand your search to other grade levels</li>}
                {maxDistance && <li>• Increase your distance range</li>}
                {activeFilterCount > 0 && <li>• Remove some filters to see more books</li>}
                {!debouncedSearchTerm && activeFilterCount === 0 && (
                  <li>• Be the first to list books in this category</li>
                )}
              </ul>
            </div>

            <div className="flex items-center justify-center gap-3">
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
              )}
              <Button asChild>
                <Link href="/sell">List Your Books</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-8 right-8 rounded-full shadow-lg z-40 h-12 w-12"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
