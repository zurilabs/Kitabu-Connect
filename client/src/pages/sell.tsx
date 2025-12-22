import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { useToast } from "@/hooks/use-toast";
import { useBookListing } from "@/hooks/useBookListing";
import { usePublishers } from "@/hooks/usePublishers";
import {
  ArrowLeft,
  Search,
  Barcode,
  Info,
  DollarSign,
  Camera,
  Sparkles,
  BookOpen,
  Tag,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import photoHero from "@assets/generated_images/person_photographing_a_textbook.png";

type Step = 'isbn' | 'basic' | 'classification' | 'pricing' | 'description' | 'review';

interface FormData {
  // ISBN
  isbn?: string;

  // Basic Information
  title: string;
  author: string;
  publisher?: string;
  edition?: string;
  publicationYear?: number;

  // Classification
  subject: string;
  classGrade: string;
  curriculum?: string;
  term?: string;
  language: string;
  bindingType?: string;

  // Pricing & Condition
  condition: "New" | "Like New" | "Good" | "Fair" | "";
  conditionNotes?: string;
  listingType: "sell" | "swap";
  price: string;
  originalRetailPrice?: string;
  negotiable: boolean;
  willingToSwapFor?: string;
  quantityAvailable: number;

  // Description & Photos
  description?: string;
  primaryPhotoUrl?: string;
  additionalPhotos: string[];
}

const initialFormData: FormData = {
  title: "",
  author: "",
  subject: "",
  classGrade: "",
  condition: "",
  listingType: "sell",
  price: "",
  language: "English",
  negotiable: true,
  quantityAvailable: 1,
  additionalPhotos: [],
};

const SUBJECTS = [
  "Mathematics", "English", "Kiswahili", "Science", "Social Studies",
  "Physics", "Chemistry", "Biology", "History", "Geography",
  "Computer Science", "Business Studies", "Agriculture", "Home Science",
  "Religious Education", "Music", "Art & Design"
];

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Form 1", "Form 2", "Form 3", "Form 4"
];

const CURRICULA = ["CBC (Competency Based)", "8-4-4 System", "IGCSE", "IB"];
const TERMS = ["Term 1", "Term 2", "Term 3", "All Terms"];

export default function SellBook() {
  const [step, setStep] = useState<Step>('isbn');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { createListing } = useBookListing();
  const { publishers, isLoading: isLoadingPublishers } = usePublishers();

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleISBNSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isbn) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/isbn/${formData.isbn}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        // Prefill form with book data
        setFormData(prev => ({
          ...prev,
          title: data.bookData.title || prev.title,
          author: data.bookData.author || prev.author,
          publisher: data.bookData.publisher || prev.publisher,
          edition: data.bookData.edition || prev.edition,
          publicationYear: data.bookData.publicationYear || prev.publicationYear,
          language: data.bookData.language || prev.language,
          bindingType: data.bookData.bindingType || prev.bindingType,
          subject: data.bookData.subject || prev.subject,
          classGrade: data.bookData.classGrade || prev.classGrade,
          curriculum: data.bookData.curriculum || prev.curriculum,
        }));

        toast({
          title: data.source === 'local' ? "Book Found Locally!" : "Book Found Online!",
          description: `Details auto-filled for "${data.bookData.title}". Review and adjust as needed.`,
        });
      } else if (response.status === 404) {
        toast({
          title: "ISBN Not Found",
          description: "No book found with this ISBN. Please enter details manually.",
          variant: "destructive",
        });
      } else {
        throw new Error("Search failed");
      }
    } catch (error) {
      console.error("ISBN search error:", error);
      toast({
        title: "Search Error",
        description: "Could not search for ISBN. Please enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setStep('basic');
    }
  };

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 'basic':
        if (!formData.title || !formData.author) {
          toast({
            title: "Missing Information",
            description: "Please fill in the book title and author.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 'classification':
        if (!formData.subject || !formData.classGrade) {
          toast({
            title: "Missing Information",
            description: "Please select a subject and grade/class.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 'pricing':
        if (!formData.condition) {
          toast({
            title: "Missing Information",
            description: "Please select the book condition.",
            variant: "destructive",
          });
          return false;
        }
        // For sell listings, price is required
        if (formData.listingType === 'sell' && (!formData.price || Number(formData.price) <= 0)) {
          toast({
            title: "Missing Information",
            description: "Please enter a valid price for your book.",
            variant: "destructive",
          });
          return false;
        }
        // For swap listings, swap description is required
        if (formData.listingType === 'swap' && !formData.willingToSwapFor) {
          toast({
            title: "Missing Information",
            description: "Please describe what books you want to swap for.",
            variant: "destructive",
          });
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;

    const steps: Step[] = ['isbn', 'basic', 'classification', 'pricing', 'description', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['isbn', 'basic', 'classification', 'pricing', 'description', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    const bookData = {
      ...formData,
      listingType: formData.listingType,
      price: formData.listingType === 'sell' ? Number(formData.price) : 0,
      originalRetailPrice: formData.originalRetailPrice ? Number(formData.originalRetailPrice) : undefined,
      publicationYear: formData.publicationYear,
      condition: formData.condition as "New" | "Like New" | "Good" | "Fair",
      willingToSwapFor: formData.listingType === 'swap' ? formData.willingToSwapFor : undefined,
    };

    createListing.mutate(bookData, {
      onSuccess: () => {
        setLocation('/dashboard');
      },
    });
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'isbn', label: 'ISBN', icon: Barcode },
      { key: 'basic', label: 'Basic Info', icon: BookOpen },
      { key: 'classification', label: 'Details', icon: Tag },
      { key: 'pricing', label: 'Pricing', icon: DollarSign },
      { key: 'description', label: 'Description', icon: FileText },
      { key: 'review', label: 'Review', icon: CheckCircle2 },
    ];

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isCompleted = index < currentIndex;

            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs hidden sm:block ${isActive ? 'font-semibold' : ''}`}>
                    {s.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      <div className="bg-primary pb-24 pt-12 text-primary-foreground">
        <div className="container px-4">
          <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10 pl-0 mb-6" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 w-4 h-4" /> Back Home
            </Link>
          </Button>
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">Sell Your Textbooks</h1>
            <p className="text-primary-foreground/80 text-lg">
              Turn your old books into cash. List in seconds, get paid securely via escrow.
            </p>
          </div>
        </div>
      </div>

      <div className="container px-4 -mt-16">
        <div className="grid lg:grid-cols-[2fr,1fr] gap-8">
          {/* Main Form Area */}
          <Card className="shadow-xl border-none">
            <CardContent className="p-6 md:p-8">
              {renderStepIndicator()}

              {/* Step 1: ISBN Search */}
              {step === 'isbn' && (
                <div className="space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                      <Barcode className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold">Start with the ISBN (Optional)</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Enter the 10 or 13 digit ISBN to auto-fill details, or skip to enter manually.
                    </p>
                  </div>

                  <form onSubmit={handleISBNSearch} className="max-w-md mx-auto space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="e.g. 978-0-262-03384-8"
                        className="pl-10 h-14 text-lg"
                        value={formData.isbn || ""}
                        onChange={(e) => updateFormData('isbn', e.target.value)}
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={isSearching}>
                      {isSearching ? "Searching Database..." : "Search ISBN"}
                    </Button>
                    <div className="text-center">
                      <Button variant="link" type="button" onClick={() => setStep('basic')}>
                        Skip and enter manually
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step 2: Basic Information */}
              {step === 'basic' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="pb-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Basic Information
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Book Title *</Label>
                      <Input
                        id="title"
                        placeholder="Full title of the book"
                        value={formData.title}
                        onChange={(e) => updateFormData('title', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="author">Author *</Label>
                        <Input
                          id="author"
                          placeholder="Author name"
                          value={formData.author}
                          onChange={(e) => updateFormData('author', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edition">Edition</Label>
                        <Input
                          id="edition"
                          placeholder="e.g. 3rd Edition"
                          value={formData.edition || ""}
                          onChange={(e) => updateFormData('edition', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="publisher">Publisher</Label>
                        <Select
                          value={formData.publisher || ""}
                          onValueChange={(value) => updateFormData('publisher', value)}
                          disabled={isLoadingPublishers}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingPublishers ? "Loading publishers..." : "Select publisher"} />
                          </SelectTrigger>
                          <SelectContent>
                            {publishers.map((publisher) => (
                              <SelectItem key={publisher.id} value={publisher.name}>
                                {publisher.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="year">Publication Year</Label>
                        <Input
                          id="year"
                          type="number"
                          placeholder="e.g. 2023"
                          value={formData.publicationYear || ""}
                          onChange={(e) => updateFormData('publicationYear', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Classification */}
              {step === 'classification' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="pb-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Tag className="w-5 h-5 text-primary" />
                      Classification & Details
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Select value={formData.subject} onValueChange={(value) => updateFormData('subject', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map(subject => (
                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="grade">Grade/Class *</Label>
                        <Select value={formData.classGrade} onValueChange={(value) => updateFormData('classGrade', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADES.map(grade => (
                              <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="curriculum">Curriculum</Label>
                        <Select value={formData.curriculum || ""} onValueChange={(value) => updateFormData('curriculum', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select curriculum" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRICULA.map(curr => (
                              <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="term">Term</Label>
                        <Select value={formData.term || ""} onValueChange={(value) => updateFormData('term', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            {TERMS.map(term => (
                              <SelectItem key={term} value={term}>{term}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select value={formData.language} onValueChange={(value) => updateFormData('language', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Kiswahili">Kiswahili</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bindingType">Binding Type</Label>
                      <Select value={formData.bindingType || ""} onValueChange={(value) => updateFormData('bindingType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select binding type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paperback">Paperback</SelectItem>
                          <SelectItem value="Hardcover">Hardcover</SelectItem>
                          <SelectItem value="Spiral Bound">Spiral Bound</SelectItem>
                          <SelectItem value="Stapled">Stapled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Pricing & Condition */}
              {step === 'pricing' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="pb-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      Pricing & Condition
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Listing Type Toggle */}
                    <div className="space-y-2">
                      <Label>Listing Type *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={formData.listingType === 'sell' ? 'default' : 'outline'}
                          onClick={() => updateFormData('listingType', 'sell')}
                          className="h-auto py-4 flex flex-col items-center gap-2"
                        >
                          <DollarSign className="w-5 h-5" />
                          <div>
                            <div className="font-semibold">Sell</div>
                            <div className="text-xs opacity-80">List for sale</div>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          variant={formData.listingType === 'swap' ? 'default' : 'outline'}
                          onClick={() => updateFormData('listingType', 'swap')}
                          className="h-auto py-4 flex flex-col items-center gap-2"
                        >
                          <ArrowLeft className="w-5 h-5 rotate-180" />
                          <div>
                            <div className="font-semibold">Swap</div>
                            <div className="text-xs opacity-80">Exchange books</div>
                          </div>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formData.listingType === 'sell'
                          ? "Sell your book for money"
                          : "Swap with students from your school or nearby"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="condition">Condition *</Label>
                      <Select value={formData.condition} onValueChange={(value) => updateFormData('condition', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New (Unused, perfect condition)</SelectItem>
                          <SelectItem value="Like New">Like New (No markings, minimal wear)</SelectItem>
                          <SelectItem value="Good">Good (Some wear, readable)</SelectItem>
                          <SelectItem value="Fair">Fair (Highlighted, noticeable wear)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conditionNotes">Condition Notes</Label>
                      <Textarea
                        id="conditionNotes"
                        placeholder="Describe any specific wear, highlights, or damage..."
                        value={formData.conditionNotes || ""}
                        onChange={(e) => updateFormData('conditionNotes', e.target.value)}
                        className="h-24"
                      />
                    </div>

                    {/* Conditional fields based on listing type */}
                    {formData.listingType === 'sell' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="price">Selling Price (KSh) *</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">KSh</span>
                              <Input
                                id="price"
                                type="number"
                                placeholder="0.00"
                                className="pl-12"
                                value={formData.price}
                                onChange={(e) => updateFormData('price', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="originalPrice">Original Price (KSh)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">KSh</span>
                              <Input
                                id="originalPrice"
                                type="number"
                                placeholder="0.00"
                                className="pl-12"
                                value={formData.originalRetailPrice || ""}
                                onChange={(e) => updateFormData('originalRetailPrice', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="negotiable"
                            checked={formData.negotiable}
                            onChange={(e) => updateFormData('negotiable', e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="negotiable" className="cursor-pointer">Price is negotiable</Label>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="willingToSwapFor">What books do you want to swap for? *</Label>
                        <Textarea
                          id="willingToSwapFor"
                          placeholder="E.g., Form 2 Biology textbook, Mathematics Grade 8, or any Science books for Form 3..."
                          value={formData.willingToSwapFor || ""}
                          onChange={(e) => updateFormData('willingToSwapFor', e.target.value)}
                          className="h-32"
                        />
                        <p className="text-sm text-muted-foreground">
                          Be specific about the books you're looking for to get better swap matches
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity Available</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={formData.quantityAvailable}
                        onChange={(e) => updateFormData('quantityAvailable', parseInt(e.target.value) || 1)}
                      />
                      <p className="text-xs text-muted-foreground">
                        How many copies of this book do you have available?
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Description & Photos */}
              {step === 'description' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="pb-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Description & Photos
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Tell buyers more about this book..."
                        value={formData.description || ""}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        className="h-32"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Book Cover Photo (Main)</Label>
                      <ImageUpload
                        value={formData.primaryPhotoUrl}
                        onChange={(value) => updateFormData('primaryPhotoUrl', value)}
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        This will be the main image buyers see.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Additional Photos (Optional)</Label>
                      <MultiImageUpload
                        value={formData.additionalPhotos}
                        onChange={(value) => updateFormData('additionalPhotos', value)}
                        maxImages={4}
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        Add photos of the spine, back cover, or any damage. Clear photos sell 50% faster.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Review */}
              {step === 'review' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="pb-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      Review Your Listing
                    </h2>
                  </div>

                  <div className="bg-muted/30 p-6 rounded-lg space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground">BOOK DETAILS</h3>
                        <div><span className="font-medium">Title:</span> {formData.title}</div>
                        <div><span className="font-medium">Author:</span> {formData.author}</div>
                        {formData.edition && <div><span className="font-medium">Edition:</span> {formData.edition}</div>}
                        {formData.publisher && <div><span className="font-medium">Publisher:</span> {formData.publisher}</div>}
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground">CLASSIFICATION</h3>
                        <div><span className="font-medium">Subject:</span> {formData.subject}</div>
                        <div><span className="font-medium">Grade:</span> {formData.classGrade}</div>
                        {formData.curriculum && <div><span className="font-medium">Curriculum:</span> {formData.curriculum}</div>}
                        <div><span className="font-medium">Language:</span> {formData.language}</div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground">PRICING</h3>
                        <div className="text-2xl font-bold text-primary">KSh {formData.price}</div>
                        <div><span className="font-medium">Condition:</span> {formData.condition}</div>
                        <div><span className="font-medium">Negotiable:</span> {formData.negotiable ? 'Yes' : 'No'}</div>
                      </div>

                      {formData.primaryPhotoUrl && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm text-muted-foreground">PHOTO</h3>
                          <img src={formData.primaryPhotoUrl} alt="Book cover" className="w-32 h-32 object-cover rounded border" />
                        </div>
                      )}
                    </div>

                    {formData.description && (
                      <div className="pt-4 border-t">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">DESCRIPTION</h3>
                        <p className="text-sm">{formData.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="pt-6 flex justify-between gap-4 border-t mt-8">
                {step !== 'isbn' && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}

                <div className="ml-auto flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setLocation('/')}>
                    Cancel
                  </Button>

                  {step !== 'review' ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={createListing.isPending}
                      className="px-8"
                    >
                      {createListing.isPending ? "Publishing..." : "Publish Listing"}
                      <Sparkles className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Tips */}
          <div className="space-y-6">
            <div className="rounded-xl overflow-hidden shadow-md">
              <img src={photoHero} alt="Taking photo" className="w-full h-48 object-cover" />
              <div className="bg-card p-5 border-t">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <Camera className="w-4 h-4 text-primary" />
                  Photo Tips
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                  <li>Use natural lighting</li>
                  <li>Show the spine and back cover</li>
                  <li>Photograph any damage clearly</li>
                  <li>Avoid blurry or dark shots</li>
                </ul>
              </div>
            </div>

            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Pricing Guide
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Books in "Good" condition typically sell for 40-60% of the original retail price.
                </p>
                <div className="text-xs bg-muted p-2 rounded">
                  <span className="font-medium">Platform Fee:</span> 12% is deducted only when the book sells.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
