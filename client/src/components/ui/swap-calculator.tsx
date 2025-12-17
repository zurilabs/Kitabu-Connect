import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

export function SwapCalculator() {
  const [yourBookValue, setYourBookValue] = useState<string>("");
  const [targetBookValue, setTargetBookValue] = useState<string>("");
  const [difference, setDifference] = useState<number | null>(null);

  useEffect(() => {
    const v1 = parseFloat(yourBookValue) || 0;
    const v2 = parseFloat(targetBookValue) || 0;
    if (v1 && v2) {
      setDifference(v2 - v1);
    } else {
      setDifference(null);
    }
  }, [yourBookValue, targetBookValue]);

  return (
    <Card className="w-full bg-gradient-to-br from-background to-muted/50 border-border/60">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-secondary/20 text-secondary-foreground">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Swap Calculator</CardTitle>
            <CardDescription>Estimate top-up needed for a trade</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
          <div className="space-y-2">
            <Label htmlFor="your-val" className="text-xs">Your Books</Label>
            <div className="relative">
              <span className="absolute left-2 top-2.5 text-muted-foreground text-sm">₦</span>
              <Input 
                id="your-val" 
                placeholder="0" 
                className="pl-6"
                value={yourBookValue}
                onChange={(e) => setYourBookValue(e.target.value)}
                type="number"
              />
            </div>
          </div>
          
          <div className="pb-3 text-muted-foreground">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-val" className="text-xs">Their Books</Label>
            <div className="relative">
              <span className="absolute left-2 top-2.5 text-muted-foreground text-sm">₦</span>
              <Input 
                id="target-val" 
                placeholder="0" 
                className="pl-6"
                value={targetBookValue}
                onChange={(e) => setTargetBookValue(e.target.value)}
                type="number"
              />
            </div>
          </div>
        </div>

        {difference !== null && (
          <div className={`p-3 rounded-md text-sm font-medium flex justify-between items-center animate-in fade-in slide-in-from-top-2 ${difference > 0 ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>
            <span>{difference > 0 ? "You pay difference:" : "You receive difference:"}</span>
            <span className="text-lg font-bold">₦{Math.abs(difference).toLocaleString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
