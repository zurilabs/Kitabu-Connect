import { useActiveChild } from "@/contexts/ActiveChildContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";

export function ActiveChildSelector() {
  const { children, activeChild, setActiveChild, isLoading } = useActiveChild();

  // Don't show if no children
  if (isLoading || children.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-lg border border-secondary">
      <User className="w-4 h-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">Shopping for:</span>
        <Select
          value={activeChild?.id.toString() || ""}
          onValueChange={(value) => {
            const child = children.find((c) => c.id.toString() === value);
            if (child) setActiveChild(child);
          }}
        >
          <SelectTrigger className="h-8 min-w-[120px] border-0 bg-transparent px-2 focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Select child">
              {activeChild ? (
                <span className="font-medium">
                  {activeChild.displayName} <span className="text-muted-foreground text-xs">({activeChild.grade})</span>
                </span>
              ) : (
                "Select child"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {children.map((child) => (
              <SelectItem key={child.id} value={child.id.toString()}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{child.displayName}</span>
                  <span className="text-muted-foreground text-xs">{child.grade}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
