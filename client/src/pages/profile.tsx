import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  CreditCard,
  Bell,
  LogOut,
  Camera,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logout, isLoggingOut, isLoading: isLoadingAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      setLocation("/login");
    }
  }, [user, isLoadingAuth, setLocation]);

  // Form state
  const [formData, setFormData] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phoneNumber || "",
    schoolId: user?.schoolId || "",
    schoolName: user?.schoolName || "",
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  });

  // Update form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.fullName || "",
        email: user.email || "",
        phone: user.phoneNumber || "",
        schoolId: user.schoolId || "",
        schoolName: user.schoolName || "",
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      });
    }
  }, [user]);

  const handleSave = () => {
    setIsLoading(true);
    // TODO: Implement API call to update profile
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
    }, 1000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Failed to logout",
        variant: "destructive",
      });
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile, preferences, and verification.</p>
      </div>

      <div className="grid md:grid-cols-[280px,1fr] gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="relative group cursor-pointer">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarImage src={CURRENT_USER.avatar} />
                  <AvatarFallback className="text-2xl">{CURRENT_USER.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-lg">{CURRENT_USER.name}</h3>
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                  <span>Verified Student</span>
                </div>
              </div>

              <div className="w-full pt-2">
                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <div className="font-bold text-lg">4.9</div>
                    <div className="text-muted-foreground text-xs">Rating</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <div className="font-bold text-lg">12</div>
                    <div className="text-muted-foreground text-xs">Deals</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <nav className="flex flex-col space-y-1">
            <Button variant="ghost" className="justify-start font-medium bg-secondary/50 text-secondary-foreground">
              <User className="mr-2 h-4 w-4" /> Profile Details
            </Button>
            <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:bg-muted/50">
              <ShieldCheck className="mr-2 h-4 w-4" /> Verification
            </Button>
            <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:bg-muted/50">
              <Bell className="mr-2 h-4 w-4" /> Notifications
            </Button>
            <Button variant="ghost" className="justify-start font-medium text-muted-foreground hover:bg-muted/50">
              <CreditCard className="mr-2 h-4 w-4" /> Payment Methods
            </Button>
            <Separator className="my-2" />
            <Button 
              variant="ghost" 
              className="justify-start font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </Button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and public profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="fullName" 
                      value={formData.name} 
                      className="pl-9" 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="school">University</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="school" value={schoolName} disabled className="pl-9 bg-muted" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      className="pl-9" 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      type="tel" 
                      value={formData.phone} 
                      className="pl-9" 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4">
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identity Verification</CardTitle>
              <CardDescription>Verified badges build trust in the marketplace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900/50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">School ID Verified</h4>
                    <p className="text-xs text-muted-foreground">Your student identity is confirmed.</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Verified</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Phone Verification</h4>
                    <p className="text-xs text-muted-foreground">Link your phone number for secure alerts.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Verify Now</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage how we communicate with you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive updates about your listings and orders.</p>
                </div>
                <Switch 
                  checked={formData.notifications.email} 
                  onCheckedChange={(c) => setFormData({...formData, notifications: {...formData.notifications, email: c}})}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Get instant alerts on your device.</p>
                </div>
                <Switch 
                  checked={formData.notifications.push} 
                  onCheckedChange={(c) => setFormData({...formData, notifications: {...formData.notifications, push: c}})}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
