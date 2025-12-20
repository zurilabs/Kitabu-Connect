import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/book-image', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        // Try to parse JSON error, but handle HTML responses gracefully
        let errorMessage = 'Upload failed';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || 'Upload failed';
        } catch {
          // If response is HTML (not JSON), show a generic error
          errorMessage = `Upload failed (${response.status} ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Update with Cloudinary URL
      setPreview(data.url);
      onChange?.(data.url);

      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image.",
        variant: "destructive",
      });
      // Clear preview on error
      setPreview(null);
      onChange?.("");
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onChange?.("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 overflow-hidden bg-muted/30",
          preview ? "h-64 border-solid border-border" : "h-40",
          !isUploading && "cursor-pointer hover:bg-muted/50 hover:border-primary/50",
          isUploading && "cursor-not-allowed opacity-60"
        )}
      >
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium">Uploading...</p>
            <p className="text-xs text-muted-foreground/70">Please wait</p>
          </div>
        ) : preview ? (
          <>
            <img
              src={preview}
              alt="Upload preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <div className="p-3 bg-background rounded-full shadow-sm mb-2">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium">Click to upload cover</p>
            <p className="text-xs text-muted-foreground/70">PNG, JPG or GIF (max 5MB)</p>
          </div>
        )}
      </div>
    </div>
  );
}
