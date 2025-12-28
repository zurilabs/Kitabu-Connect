import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface School {
  id: string;
  name: string;
}

interface SchoolComboboxProps {
  value: string;
  onChange: (schoolId: string, schoolName: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SchoolCombobox({
  value,
  onChange,
  placeholder = "Select school",
  className,
  disabled = false,
}: SchoolComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchoolName, setSelectedSchoolName] = useState("");

  // Debounce search query
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch schools based on search query
  const { data, isLoading } = useQuery<{ schools: School[] }>({
    queryKey: ["schools-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { schools: [] };
      }

      const response = await fetch(
        `/api/schools/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to fetch schools");
      return response.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const schools = data?.schools || [];

  // Get current school name if we have a value
  useEffect(() => {
    if (value && !selectedSchoolName) {
      // Fetch the specific school to get its name
      fetch(`/api/schools/search?q=${encodeURIComponent(value)}&limit=1`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          const school = data.schools?.[0];
          if (school && school.id === value) {
            setSelectedSchoolName(school.name);
          }
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, [value, selectedSchoolName]);

  const handleSelect = (school: School) => {
    onChange(school.id, school.name);
    setSelectedSchoolName(school.name);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">
              {selectedSchoolName || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search schools..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching...
                </span>
              </div>
            ) : searchQuery.length < 2 ? (
              <CommandEmpty>
                Type at least 2 characters to search schools...
              </CommandEmpty>
            ) : schools.length === 0 ? (
              <CommandEmpty>No schools found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {schools.map((school) => (
                  <CommandItem
                    key={school.id}
                    value={school.id}
                    onSelect={() => handleSelect(school)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === school.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{school.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
