import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handshakeId: string;
  transactionId: string;
}

export function QRCodeModal({ open, onOpenChange, handshakeId, transactionId }: QRCodeModalProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(handshakeId);
    toast({
      title: "Copied!",
      description: "Handshake ID copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Confirm Handshake</DialogTitle>
          <DialogDescription className="text-center">
            Show this code to the agent at the drop-off point to release funds.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <QRCodeSVG value={handshakeId} size={200} level="H" />
          </div>
          
          <div className="w-full space-y-2">
            <div className="text-xs text-center text-muted-foreground uppercase tracking-wider">Handshake ID</div>
            <div className="flex items-center justify-center gap-2 bg-muted/50 p-3 rounded-lg border border-dashed">
              <code className="text-lg font-mono font-bold text-primary">{handshakeId}</code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <p>Funds are currently held in escrow. They will be released to the seller automatically once this code is scanned.</p>
          </div>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
