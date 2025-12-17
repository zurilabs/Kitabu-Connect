import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CURRENT_USER, MOCK_TRANSACTIONS, MOCK_BOOKS } from "@/lib/mockData";
import { QRCodeModal } from "@/components/ui/qr-code-modal";
import { useState } from "react";
import { Wallet, Package, Clock, CheckCircle2, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [showQR, setShowQR] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const { toast } = useToast();

  const handleConfirmCollection = (txId: string) => {
    // In a real app, this would verify the handshake ID or trigger the release API
    toast({
      title: "Collection Confirmed!",
      description: "Funds have been released to the seller.",
    });
  };

  const openQR = (tx: any) => {
    setSelectedTx(tx);
    setShowQR(true);
  };

  return (
    <div className="container px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        {/* Profile Summary */}
        <Card className="w-full md:w-1/3">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar className="h-16 w-16">
              <AvatarImage src={CURRENT_USER.avatar} />
              <AvatarFallback>AJ</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{CURRENT_USER.name}</CardTitle>
              <CardDescription>{CURRENT_USER.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">Wallet Balance</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                ₦{CURRENT_USER.walletBalance.toLocaleString()}
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="w-full text-xs">Top Up</Button>
                <Button size="sm" variant="outline" className="w-full text-xs">Withdraw</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 w-full md:w-2/3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦45,000</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Escrow Held</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₦18,000</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Trust Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">98%</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="listings">My Listings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your buying and selling history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_TRANSACTIONS.map((tx) => {
                  const book = MOCK_BOOKS.find(b => b.id === tx.bookId);
                  return (
                    <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-md bg-muted overflow-hidden shrink-0">
                          {book && <img src={book.image} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <div className="font-medium">{book?.title || "Unknown Book"}</div>
                          <div className="text-sm text-muted-foreground">ID: {tx.id} • {tx.date}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <div className="font-bold">₦{tx.amount.toLocaleString()}</div>
                          <Badge variant={tx.status === 'escrow' ? 'secondary' : 'outline'} className={tx.status === 'escrow' ? 'bg-orange-100 text-orange-800' : ''}>
                            {tx.status}
                          </Badge>
                        </div>
                        
                        {tx.status === 'escrow' && tx.buyerId === CURRENT_USER.id && (
                          <Button size="sm" onClick={() => openQR(tx)}>
                            <QrCode className="w-4 h-4 mr-2" />
                            Verify Code
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>My Listings</CardTitle>
              <CardDescription>Manage books you are selling.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No active listings found.
                <div className="mt-4">
                  <Button>List a Book</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedTx && (
        <QRCodeModal 
          open={showQR} 
          onOpenChange={setShowQR} 
          handshakeId={selectedTx.handshakeId}
          transactionId={selectedTx.id}
        />
      )}
    </div>
  );
}
