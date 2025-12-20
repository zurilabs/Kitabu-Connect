import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadedImage {
  url: string;
  publicId?: string;
  preview: string;
}

interface MultiImageUploadProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  maxImages?: number;
  className?: string;
}

export function MultiImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  className
}: MultiImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>(() =>
    value.map(url => ({ url, preview: url }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if adding these files would exceed max
    if (images.length + files.length > maxImages) {
      toast({
        title: "Too many images",
        description: `You can only upload up to ${maxImages} images.`,
        variant: "destructive",
      });
      return;
    }

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Show previews immediately
    const newPreviews: UploadedImage[] = await Promise.all(
      files.map(file =>
        new Promise<UploadedImage>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              url: '', // Will be filled after upload
              preview: reader.result as string,
            });
          };
          reader.readAsDataURL(file);
        })
      )
    );

    setImages(prev => [...prev, ...newPreviews]);

    // Upload to Cloudinary
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));

      const response = await fetch('/api/upload/book-images', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || 'Upload failed';
        } catch {
          errorMessage = `Upload failed (${response.status} ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Update images with Cloudinary URLs
      const uploadedImages: UploadedImage[] = data.images.map((img: any, index: number) => ({
        url: img.url,
        publicId: img.publicId,
        preview: newPreviews[index].preview,
      }));

      setImages(prev => {
        // Replace the preview-only images with uploaded ones
        const filtered = prev.filter(img => img.url !== '');
        return [...filtered, ...uploadedImages];
      });

      // Update parent component
      const allUrls = [...images.filter(img => img.url).map(img => img.url), ...uploadedImages.map(img => img.url)];
      onChange?.(allUrls);

      toast({
        title: "Images uploaded",
        description: `${files.length} image(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images.",
        variant: "destructive",
      });
      // Remove failed uploads
      setImages(prev => prev.filter(img => img.url !== ''));
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      onChange?.(newImages.map(img => img.url).filter(Boolean));
      return newImages;
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg border-2 border-border overflow-hidden group"
            >
              <img
                src={image.preview}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!image.url && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {images.length < maxImages && (
        <div
          onClick={() => !isUploading && inputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 bg-muted/30 h-32",
            !isUploading && "cursor-pointer hover:bg-muted/50 hover:border-primary/50",
            isUploading && "cursor-not-allowed opacity-60"
          )}
        >
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className="p-2 bg-background rounded-full shadow-sm mb-2">
                <ImagePlus className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Add images ({images.length}/{maxImages})</p>
              <p className="text-xs text-muted-foreground/70">PNG, JPG or GIF (max 5MB each)</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
