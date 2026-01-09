import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, MessageCircle, Mail, Facebook, Twitter, Linkedin } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ReferralShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string;
  referralLink: string;
}

export function ReferralShareModal({ open, onOpenChange, referralCode, referralLink }: ReferralShareModalProps) {
  const { toast } = useToast();
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareMessage = `Hey! I'm using Kitabu Connect to buy, sell, and swap textbooks. Join me using my referral code ${referralCode} and we both get rewards! ${referralLink}`;

  const copyToClipboard = async (text: string, type: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);

      if (type === "code") {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }

      toast({
        title: "Copied!",
        description: `Referral ${type} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const shareViaWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };

  const shareViaEmail = () => {
    const subject = "Join me on Kitabu Connect!";
    const body = shareMessage;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const shareViaFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareViaTwitter = () => {
    const text = `Join me on Kitabu Connect for textbook swaps! Use code ${referralCode}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const shareViaLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
    window.open(url, "_blank", "width=600,height=600");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Referral Link</DialogTitle>
          <DialogDescription>
            Invite friends to Kitabu Connect and earn rewards together
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Referral Code */}
          <div className="space-y-2">
            <Label htmlFor="referral-code">Referral Code</Label>
            <div className="flex gap-2">
              <Input
                id="referral-code"
                value={referralCode}
                readOnly
                className="font-mono font-bold text-lg"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralCode, "code")}
              >
                {codeCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Referral Link */}
          <div className="space-y-2">
            <Label htmlFor="referral-link">Referral Link</Label>
            <div className="flex gap-2">
              <Input
                id="referral-link"
                value={referralLink}
                readOnly
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralLink, "link")}
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Share via Social Media */}
          <div className="space-y-3">
            <Label>Share via</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={shareViaWhatsApp}
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={shareViaEmail}
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={shareViaFacebook}
              >
                <Facebook className="h-4 w-4 text-blue-600" />
                Facebook
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={shareViaTwitter}
              >
                <Twitter className="h-4 w-4 text-sky-500" />
                Twitter
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={shareViaLinkedIn}
            >
              <Linkedin className="h-4 w-4 text-blue-700" />
              LinkedIn
            </Button>
          </div>

          {/* Share Message Preview */}
          <div className="space-y-2">
            <Label>Share Message</Label>
            <div className="p-3 bg-muted rounded-lg text-sm">
              {shareMessage}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
