import { useState, useEffect, useCallback } from "react";
import * as React from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWishlist, useCreateWishlistItem, useUpdateWishlistItem, useDeleteWishlistItem, type WishlistItem } from "@/hooks/useWishlist";
import { useActiveChild } from "@/contexts/ActiveChildContext";
import { usePublishers } from "@/hooks/usePublishers";
import { useSubjects } from "@/hooks/useSubjects";
import { Plus, Edit, Trash2, BookOpen, CheckCircle2, XCircle, Bell, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9",
  "Form 1", "Form 2", "Form 3", "Form 4"
];

export default function WishlistPage() {
  const [location, setLocation] = useLocation();
  const { children } = useActiveChild();
  const { toast } = useToast();
  const { publishers, isLoading: isLoadingPublishers } = usePublishers();
  const { subjects, isLoading: isLoadingSubjects } = useSubjects();
  const [activeTab, setActiveTab] = useState<"all" | "active" | "fulfilled">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [isSearchingISBN, setIsSearchingISBN] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    childId: "",
    title: "",
    publisher: "",
    author: "",
    isbn: "",
    edition: "",
    subject: "",
    grade: "",
    curriculum: "",
    notes: "",
  });

  // Fetch wishlist items based on active tab
  const status = activeTab === "all" ? undefined : activeTab;
  const { wishlistItems, isLoading } = useWishlist(status);

  const createMutation = useCreateWishlistItem();
  const updateMutation = useUpdateWishlistItem();
  const deleteMutation = useDeleteWishlistItem();

  // Filter wishlist items by selected child if a child is selected
  const filteredItems = selectedChildId
    ? wishlistItems.filter((item) => item.childId === selectedChildId)
    : wishlistItems;

  const handleAddClick = () => {
    if (children.length === 0) {
      toast({
        title: "No Children",
        description: "Please add a child to your profile first",
        variant: "destructive",
      });
      setLocation("/profile");
      return;
    }
    setFormData({
      childId: children[0].id.toString(),
      title: "",
      publisher: "",
      author: "",
      isbn: "",
      edition: "",
      subject: "",
      grade: "",
      curriculum: "",
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (item: WishlistItem) => {
    setEditingItem(item);
    setFormData({
      childId: item.childId.toString(),
      title: item.title,
      publisher: item.publisher || "",
      author: item.author || "",
      isbn: item.isbn || "",
      edition: item.edition || "",
      subject: item.subject || "",
      grade: item.grade || "",
      curriculum: item.curriculum || "",
      notes: item.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (id: number) => {
    if (confirm("Are you sure you want to delete this wishlist item?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // Debounced ISBN for auto-lookup
  const debouncedISBN = useDebounce(formData.isbn, 1000);

  // Auto-lookup ISBN when it's entered and valid
  const handleISBNLookup = useCallback(async (isbn: string) => {
    if (!isbn || isbn.length < 10) return; // Skip if ISBN is too short

    setIsSearchingISBN(true);
    try {
      const response = await fetch(`/api/isbn/${isbn}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        // Prefill form with book data
        setFormData((prev) => ({
          ...prev,
          title: data.bookData.title || prev.title,
          author: data.bookData.author || prev.author,
          publisher: data.bookData.publisher || prev.publisher,
          edition: data.bookData.edition || prev.edition,
          subject: data.bookData.subject || prev.subject,
          grade: data.bookData.classGrade || prev.grade,
          curriculum: data.bookData.curriculum || prev.curriculum,
        }));

        toast({
          title: data.source === "local" ? "Book Found Locally!" : "Book Found Online!",
          description: `Details auto-filled for "${data.bookData.title || "the book"}". Review and adjust as needed.`,
        });
      } else if (response.status === 404) {
        // ISBN not found - that's okay, user can continue manually
        console.log("ISBN not found, continuing with manual entry");
      } else {
        throw new Error("ISBN lookup failed");
      }
    } catch (error) {
      console.error("ISBN lookup error:", error);
      // Don't show error toast - user can continue manually
    } finally {
      setIsSearchingISBN(false);
    }
  }, [toast]);

  // Trigger ISBN lookup when debounced ISBN changes
  useEffect(() => {
    if (debouncedISBN && debouncedISBN.length >= 10 && (isAddDialogOpen || isEditDialogOpen)) {
      handleISBNLookup(debouncedISBN);
    }
  }, [debouncedISBN, isAddDialogOpen, isEditDialogOpen, handleISBNLookup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    const data = {
      childId: parseInt(formData.childId),
      title: formData.title.trim(),
      publisher: formData.publisher.trim() || null,
      author: formData.author.trim() || null,
      isbn: formData.isbn.trim() || null,
      edition: formData.edition.trim() || null,
      subject: formData.subject || null,
      grade: formData.grade || null,
      curriculum: formData.curriculum.trim() || null,
      notes: formData.notes.trim() || null,
    };

    if (editingItem) {
      await updateMutation.mutateAsync({
        id: editingItem.id,
        data,
      });
      setIsEditDialogOpen(false);
      setEditingItem(null);
    } else {
      await createMutation.mutateAsync(data);
      setIsAddDialogOpen(false);
    }

    // Reset form
    setFormData({
      childId: children[0]?.id.toString() || "",
      title: "",
      publisher: "",
      author: "",
      isbn: "",
      edition: "",
      subject: "",
      grade: "",
      curriculum: "",
      notes: "",
    });
  };

  const getStatusBadge = (status: string, matchedListingId: number | null | undefined) => {
    if (status === "fulfilled") {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Fulfilled
        </Badge>
      );
    }
    if (status === "cancelled") {
      return (
        <Badge variant="secondary">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelled
        </Badge>
      );
    }
    if (matchedListingId) {
      return (
        <Badge variant="default" className="bg-blue-500">
          <Bell className="w-3 h-3 mr-1" />
          Match Found
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        Active
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground mt-1">
            Create wishlists for your children's textbook needs. We'll notify you when matching books are listed.
          </p>
        </div>
        <Button onClick={handleAddClick} className="gap-2">
          <Plus className="w-4 h-4" />
          Add to Wishlist
        </Button>
      </div>

      {/* Child Filter */}
      {children.length > 1 && (
        <div className="mb-6">
          <Label className="mb-2 block">Filter by Child</Label>
          <Select
            value={selectedChildId?.toString() || "all"}
            onValueChange={(value) => setSelectedChildId(value === "all" ? null : parseInt(value))}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All Children" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Children</SelectItem>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id.toString()}>
                  {child.displayName} ({child.grade})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Wishlist Items */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading wishlist items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No wishlist items yet</h3>
            <p className="text-muted-foreground mb-4">
              Start adding books to your wishlist and we'll notify you when they become available.
            </p>
            <Button onClick={handleAddClick} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                    {item.child && (
                      <CardDescription className="mb-2">
                        For: {item.child.name || `Child ${item.child.id}`} ({item.child.grade})
                      </CardDescription>
                    )}
                  </div>
                  {getStatusBadge(item.status, item.matchedListingId)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {item.author && (
                    <div>
                      <span className="font-medium">Author:</span> {item.author}
                    </div>
                  )}
                  {item.publisher && (
                    <div>
                      <span className="font-medium">Publisher:</span> {item.publisher}
                    </div>
                  )}
                  {item.subject && (
                    <div>
                      <span className="font-medium">Subject:</span> {item.subject}
                    </div>
                  )}
                  {item.grade && (
                    <div>
                      <span className="font-medium">Grade:</span> {item.grade}
                    </div>
                  )}
                  {item.notes && (
                    <div className="pt-2 border-t">
                      <span className="font-medium">Notes:</span>
                      <p className="text-muted-foreground mt-1">{item.notes}</p>
                    </div>
                  )}
                </div>
                {item.matchedListingId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => setLocation(`/book/${item.matchedListingId}`)}
                  >
                    View Matched Book
                  </Button>
                )}
              </CardContent>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditClick(item)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive"
                    onClick={() => handleDeleteClick(item.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add to Wishlist</DialogTitle>
            <DialogDescription>
              Add a book to your wishlist. We'll notify you when a matching book is listed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="childId">For Child *</Label>
                <Select
                  value={formData.childId}
                  onValueChange={(value) => setFormData({ ...formData, childId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id.toString()}>
                        {child.displayName} ({child.grade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Learning English"
                  required
                />
              </div>

              <div>
                <Label htmlFor="isbn">ISBN (Auto-fill details)</Label>
                <div className="relative">
                  <Input
                    id="isbn"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="Enter ISBN to auto-fill book details"
                    className="pr-10"
                  />
                  {isSearchingISBN && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter ISBN and we'll automatically fill in the book details
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Author name"
                  />
                </div>
                <div>
                  <Label htmlFor="publisher">Publisher</Label>
                  <Select
                    value={formData.publisher && publishers.some(p => p.name === formData.publisher) ? formData.publisher : ""}
                    onValueChange={(value) => setFormData({ ...formData, publisher: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingPublishers ? "Loading..." : "Select publisher"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {publishers.map((publisher) => (
                        <SelectItem key={publisher.id} value={publisher.name}>
                          {publisher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-2"
                    placeholder="Or type custom publisher name"
                    value={formData.publisher && !publishers.some(p => p.name === formData.publisher) ? formData.publisher : ""}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                    disabled={isLoadingSubjects}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingSubjects ? "Loading..." : "Select subject"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData({ ...formData, grade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edition">Edition</Label>
                <Input
                  id="edition"
                  value={formData.edition}
                  onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                  placeholder="e.g., 1st Edition"
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information..."
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add to Wishlist"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Wishlist Item</DialogTitle>
            <DialogDescription>
              Update the details of this wishlist item.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-childId">For Child *</Label>
                <Select
                  value={formData.childId}
                  onValueChange={(value) => setFormData({ ...formData, childId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id.toString()}>
                        {child.displayName} ({child.grade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-isbn">ISBN (Auto-fill details)</Label>
                <div className="relative">
                  <Input
                    id="edit-isbn"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="Enter ISBN to auto-fill book details"
                    className="pr-10"
                  />
                  {isSearchingISBN && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter ISBN and we'll automatically fill in the book details
                </p>
              </div>

              <div>
                <Label htmlFor="edit-title">Book Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Learning English"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-author">Author</Label>
                  <Input
                    id="edit-author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Author name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-publisher">Publisher</Label>
                  <Select
                    value={formData.publisher && publishers.some(p => p.name === formData.publisher) ? formData.publisher : ""}
                    onValueChange={(value) => setFormData({ ...formData, publisher: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingPublishers ? "Loading..." : "Select publisher"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {publishers.map((publisher) => (
                        <SelectItem key={publisher.id} value={publisher.name}>
                          {publisher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-2"
                    placeholder="Or type custom publisher name"
                    value={formData.publisher && !publishers.some(p => p.name === formData.publisher) ? formData.publisher : ""}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-subject">Subject</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                    disabled={isLoadingSubjects}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingSubjects ? "Loading..." : "Select subject"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-grade">Grade</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData({ ...formData, grade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-edition">Edition</Label>
                <Input
                  id="edit-edition"
                  value={formData.edition}
                  onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                  placeholder="e.g., 1st Edition"
                />
              </div>

              <div>
                <Label htmlFor="edit-notes">Additional Notes</Label>
                <Input
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information..."
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

