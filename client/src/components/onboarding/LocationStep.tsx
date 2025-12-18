import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingData } from "@/lib/onboarding-state-machine";
import { MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationStepProps {
  data: OnboardingData;
  onNext: (updates: Partial<OnboardingData>) => void;
  onBack: () => void;
}

export function LocationStep({ data, onNext, onBack }: LocationStepProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : null
  );
  const { toast } = useToast();

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(coords);
        setIsGettingLocation(false);
        toast({
          title: "Location captured",
          description: "Your home radius has been set",
        });
      },
      (error) => {
        setIsGettingLocation(false);
        let message = "Failed to get your location";

        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission denied. Please enable location access.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out.";
        }

        toast({
          title: "Location error",
          description: message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location) {
      onNext({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }
  };

  const handleSkip = () => {
    onNext({
      latitude: null,
      longitude: null,
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Set Your Home Radius (Optional)</CardTitle>
        <CardDescription>
          We'll use your location to show you books available nearby. You can skip this step if you prefer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-primary" />
            </div>

            {location ? (
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-green-600">Location captured!</p>
                <p className="text-xs text-muted-foreground">
                  Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click the button below to allow access to your location
                </p>
              </div>
            )}

            <Button
              type="button"
              onClick={getLocation}
              disabled={isGettingLocation}
              variant={location ? "outline" : "default"}
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting location...
                </>
              ) : location ? (
                "Update location"
              ) : (
                "Get my location"
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                Back
              </Button>
              {location ? (
                <Button type="submit" className="flex-1">
                  Continue
                </Button>
              ) : (
                <Button type="button" onClick={handleSkip} className="flex-1">
                  Skip for now
                </Button>
              )}
            </div>
            {!location && (
              <p className="text-xs text-center text-muted-foreground">
                You can add your location later in settings
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
