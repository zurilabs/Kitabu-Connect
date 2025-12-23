import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Package,
  CheckCircle2,
  Upload,
  QrCode,
  Camera,
  MapPin,
  Loader2,
} from "lucide-react";

interface DropOffTrackingProps {
  cycleId: string;
  participantId: string;
  bookDroppedOff: boolean;
  bookCollected: boolean;
  dropOffPhotoUrl: string | null;
  collectionPhotoUrl: string | null;
  collectionQrCode: string | null;
  dropPointName: string | null;
  dropPointAddress: string | null;
  onSuccess?: () => void;
}

export default function DropOffTracking({
  cycleId,
  participantId,
  bookDroppedOff,
  bookCollected,
  dropOffPhotoUrl,
  collectionPhotoUrl,
  collectionQrCode,
  dropPointName,
  dropPointAddress,
  onSuccess,
}: DropOffTrackingProps) {
  const [uploading, setUploading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDropOff = async () => {
    if (!photoFile) {
      toast.error("Please upload a photo of the book");
      return;
    }

    setUploading(true);
    try {
      // Upload photo to Cloudinary
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("upload_preset", "book_photos");

      const uploadResponse = await fetch(
        "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload photo");
      }

      const uploadData = await uploadResponse.json();
      const photoUrl = uploadData.secure_url;

      // Mark book as dropped off
      const response = await fetch(`/api/cycles/${cycleId}/drop-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ photoUrl }),
      });

      if (response.ok) {
        toast.success("Book drop-off confirmed!");
        setPhotoFile(null);
        setPhotoPreview(null);
        onSuccess?.();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to confirm drop-off");
      }
    } catch (error) {
      toast.error("Failed to confirm drop-off");
    } finally {
      setUploading(false);
    }
  };

  const handleCollect = async () => {
    if (!photoFile) {
      toast.error("Please upload a photo of the book you received");
      return;
    }

    setCollecting(true);
    try {
      // Upload photo to Cloudinary
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("upload_preset", "book_photos");

      const uploadResponse = await fetch(
        "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload photo");
      }

      const uploadData = await uploadResponse.json();
      const photoUrl = uploadData.secure_url;

      // Mark book as collected
      const response = await fetch(`/api/cycles/${cycleId}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ photoUrl }),
      });

      if (response.ok) {
        toast.success("Book collection confirmed!");
        setPhotoFile(null);
        setPhotoPreview(null);
        onSuccess?.();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to confirm collection");
      }
    } catch (error) {
      toast.error("Failed to confirm collection");
    } finally {
      setCollecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Book Exchange Tracking
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Drop Point Information */}
        {dropPointName && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {dropPointName}
                </p>
                {dropPointAddress && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {dropPointAddress}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Drop Off Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">1. Drop Off Your Book</h4>
            {bookDroppedOff && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Dropped Off
              </Badge>
            )}
          </div>

          {bookDroppedOff ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
              {dropOffPhotoUrl && (
                <div className="mb-2">
                  <img
                    src={dropOffPhotoUrl}
                    alt="Drop off proof"
                    className="w-full h-40 object-cover rounded"
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                You have successfully dropped off your book at the exchange point.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="dropOffPhoto" className="text-sm">
                  Upload Photo of Book
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Take a photo showing the book's condition before drop-off
                </p>
                <div className="flex gap-2">
                  <Input
                    id="dropOffPhoto"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="flex-1"
                  />
                  <Button size="icon" variant="outline" asChild>
                    <label htmlFor="dropOffPhoto" className="cursor-pointer">
                      <Camera className="h-4 w-4" />
                    </label>
                  </Button>
                </div>
              </div>

              {photoPreview && (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded border"
                  />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleDropOff}
                disabled={uploading || !photoFile}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Confirm Drop Off
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Collection QR Code */}
        {collectionQrCode && !bookCollected && (
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
            <div className="flex items-start gap-3">
              <QrCode className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Your Collection Code
                </p>
                <div className="bg-white dark:bg-gray-900 p-3 rounded border text-center">
                  <p className="text-2xl font-mono font-bold tracking-wider">
                    {collectionQrCode}
                  </p>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
                  Show this code when collecting your book
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collection Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">2. Collect Your Book</h4>
            {bookCollected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Collected
              </Badge>
            )}
          </div>

          {bookCollected ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
              {collectionPhotoUrl && (
                <div className="mb-2">
                  <img
                    src={collectionPhotoUrl}
                    alt="Collection proof"
                    className="w-full h-40 object-cover rounded"
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                You have successfully collected your book. Swap completed!
              </p>
            </div>
          ) : !bookDroppedOff ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                Complete the drop-off first before collecting your book
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="collectionPhoto" className="text-sm">
                  Upload Photo of Received Book
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Take a photo showing the book you received
                </p>
                <div className="flex gap-2">
                  <Input
                    id="collectionPhoto"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="flex-1"
                  />
                  <Button size="icon" variant="outline" asChild>
                    <label htmlFor="collectionPhoto" className="cursor-pointer">
                      <Camera className="h-4 w-4" />
                    </label>
                  </Button>
                </div>
              </div>

              {photoPreview && (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded border"
                  />
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!photoFile}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Confirm Collection
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Book Collection</AlertDialogTitle>
                    <AlertDialogDescription>
                      By confirming, you're indicating that you have received the
                      book and are satisfied with its condition. This will complete
                      your part of the swap.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCollect}
                      disabled={collecting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {collecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        "Confirm Collection"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
