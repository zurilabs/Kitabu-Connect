import { useState } from "react";
import { MOCK_BOOKS, SCHOOLS } from "@/lib/mockData";
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
import { Search, Filter, School } from "lucide-react";

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get unique categories
  const categories = Array.from(new Set(MOCK_BOOKS.map(b => b.category)));

  // Filter books
  const filteredBooks = MOCK_BOOKS.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          book.isbn.includes(searchTerm);
    const matchesSchool = selectedSchool === "all" || book.schoolId === selectedSchool;
    const matchesCategory = selectedCategory === "all" || book.category === selectedCategory;
    
    return matchesSearch && matchesSchool && matchesCategory;
  });

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
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="w-[180px] h-10">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Select School" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {SCHOOLS.map(school => (
                    <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] h-10">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold font-display">
            {selectedSchool !== "all" 
              ? `Listings at ${SCHOOLS.find(s => s.id === selectedSchool)?.name}` 
              : "All Listings"}
          </h1>
          <span className="text-muted-foreground text-sm">{filteredBooks.length} results</span>
        </div>

        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
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
              setSelectedCategory("all");
            }}>Clear Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}
