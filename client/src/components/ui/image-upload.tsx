import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        onChange?.(result);
      };
      reader.readAsDataURL(file);
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
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden bg-muted/30 hover:bg-muted/50 hover:border-primary/50",
          preview ? "h-64 border-solid border-border" : "h-40"
        )}
      >
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        
        {preview ? (
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
            <p className="text-xs text-muted-foreground/70">SVG, PNG, JPG or GIF</p>
          </div>
        )}
      </div>
    </div>
  );
}
