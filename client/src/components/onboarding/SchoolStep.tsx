import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OnboardingData } from "@/lib/onboarding-state-machine";
import type { School } from "@shared/schema";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchoolStepProps {
  data: OnboardingData;
  onNext: (updates: Partial<OnboardingData>) => void;
  onBack: () => void;
}

export function SchoolStep({ data, onNext, onBack }: SchoolStepProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(
    data.schoolId ? { id: data.schoolId, name: data.schoolName, location: null, createdAt: new Date() } : null
  );
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSchools();
  }, []);

  async function fetchSchools() {
    try {
      const response = await fetch("/api/schools", {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        setSchools(result.schools || []);
      }
    } catch (error) {
      console.error("Failed to fetch schools:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSchool) {
      onNext({
        schoolId: selectedSchool.id,
        schoolName: selectedSchool.name,
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Select Your School</CardTitle>
        <CardDescription>Choose your child's school from the list</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school">School</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedSchool ? selectedSchool.name : "Select school..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search school..." />
                  <CommandList>
                    <CommandEmpty>
                      {isLoading ? "Loading schools..." : "No school found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {schools.map((school) => (
                        <CommandItem
                          key={school.id}
                          value={school.name}
                          onSelect={() => {
                            setSelectedSchool(school);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSchool?.id === school.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {school.name}
                          {school.location && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {school.location}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={!selectedSchool}>
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
