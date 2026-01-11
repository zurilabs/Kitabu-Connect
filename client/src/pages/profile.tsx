import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ChildrenManagement } from "@/components/profile/ChildrenManagement";
import {
  User,
  Users,
  Mail,
  Phone,
  ShieldCheck,
  CreditCard,
  Bell,
  LogOut,
  Camera,
  Wallet,
  Building2,
  Shield,
  AlertTriangle,
  ChevronRight,
  Star,
} from "lucide-react";
import { UserRatingsDisplay } from "@/components/ratings/UserRatingsDisplay";

interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notifyOnNewMessages: boolean;
  notifyOnBookSold: boolean;
  notifyOnPriceDrops: boolean;
  notifyOnNewListings: boolean;
  preferredPaymentMethod: string;
  mpesaPhoneNumber: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankBranch: string | null;
  paypalEmail: string | null;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout, isLoading: isLoadingAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"profile" | "children" | "disputes" | "notifications" | "payment" | "ratings">("profile");

  // Fetch user preferences with React Query
  const { data: preferencesData, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const response = await fetch("/api/preferences", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch preferences");
      return response.json();
    },
    enabled: !!user, // Only fetch when user is logged in
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch user disputes with React Query
  const { data: disputesData } = useQuery({
    queryKey: ["user-disputes"],
    queryFn: async () => {
      const response = await fetch("/api/disputes", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch disputes");
      return response.json();
    },
    enabled: !!user, // Only fetch when user is logged in
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Fetch user rating stats
  const { data: ratingStatsData } = useQuery({
    queryKey: ["user-rating-stats", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/ratings/user/${user?.id}/stats`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch rating stats");
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch user's completed orders count
  const { data: ordersCountData } = useQuery({
    queryKey: ["user-orders-count", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/orders/count", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch orders count");
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const preferences = preferencesData?.preferences || null;
  const disputes = disputesData?.disputes || [];
  const ratingStats = ratingStatsData?.stats;
  const ordersCount = ordersCountData?.count || 0;
  const openDisputesCount = disputes.filter((d: any) =>
    ["open", "awaiting_response", "investigating", "escalated"].includes(d.dispute.status)
  ).length;

  // Local preferences state for optimistic updates
  const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(null);

  // Sync local preferences with fetched data
  useEffect(() => {
    if (preferences && !localPreferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences, localPreferences]);

  // Use local preferences if available, otherwise use fetched preferences
  const currentPreferences = localPreferences || preferences;

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
  });

  // Payment form state - initialized from preferences
  const [paymentData, setPaymentData] = useState({
    preferredPaymentMethod: "mpesa",
    mpesaPhoneNumber: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankBranch: "",
    paypalEmail: "",
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
      });
      setProfilePicture(user.profilePictureUrl || null);
    }
  }, [user]);

  // Update payment data when preferences load
  useEffect(() => {
    if (currentPreferences) {
      setPaymentData({
        preferredPaymentMethod: currentPreferences.preferredPaymentMethod || "mpesa",
        mpesaPhoneNumber: currentPreferences.mpesaPhoneNumber || "",
        bankName: currentPreferences.bankName || "",
        bankAccountNumber: currentPreferences.bankAccountNumber || "",
        bankAccountName: currentPreferences.bankAccountName || "",
        bankBranch: currentPreferences.bankBranch || "",
        paypalEmail: currentPreferences.paypalEmail || "",
      });
    }
  }, [currentPreferences]);

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      setProfilePicture(data.url);

      // Update profile with new picture URL
      await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          profilePictureUrl: data.url,
        }),
      });

      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
      });

      // Refresh to update user context
      window.location.reload();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          schoolId: formData.schoolId,
          schoolName: formData.schoolName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresVerification) {
          toast({
            title: "Verification Required",
            description: data.message,
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.message || "Failed to update profile");
      }

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });

      // Refresh the page to update user context
      window.location.reload();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mutation for updating notifications
  const updateNotificationsMutation = useMutation({
    mutationFn: async (notificationData: any) => {
      const response = await fetch("/api/preferences/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(notificationData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update notifications");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveNotifications = async () => {
    if (!currentPreferences) return;

    updateNotificationsMutation.mutate({
      emailNotifications: currentPreferences.emailNotifications,
      pushNotifications: currentPreferences.pushNotifications,
      smsNotifications: currentPreferences.smsNotifications,
      notifyOnNewMessages: currentPreferences.notifyOnNewMessages,
      notifyOnBookSold: currentPreferences.notifyOnBookSold,
      notifyOnPriceDrops: currentPreferences.notifyOnPriceDrops,
      notifyOnNewListings: currentPreferences.notifyOnNewListings,
    });
  };

  // Mutation for updating payment preferences
  const updatePaymentMutation = useMutation({
    mutationFn: async (paymentInfo: any) => {
      const response = await fetch("/api/preferences/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(paymentInfo),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update payment method");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast({
        title: "Payment Method Updated",
        description: "Your payment preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSavePayment = async () => {
    updatePaymentMutation.mutate(paymentData);
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
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container px-4 py-6 lg:py-10 max-w-6xl mx-auto">
        {/* Profile Header Card */}
        <Card className="mb-6 lg:mb-8 border-0 shadow-lg overflow-hidden">
          {/* Background Pattern */}
          <div className="h-24 lg:h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/5"></div>
          </div>

          <CardContent className="relative -mt-16 lg:-mt-20 px-6 lg:px-10 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
              {/* Avatar */}
              <div className="relative group shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  id="profile-picture-upload"
                  disabled={isUploadingPicture}
                />
                <label htmlFor="profile-picture-upload" className="cursor-pointer block">
                  <Avatar className="h-28 w-28 lg:h-36 lg:w-36 border-4 border-background shadow-2xl ring-4 ring-primary/10">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="object-cover w-full h-full" />
                    ) : (
                      <AvatarFallback className="text-3xl lg:text-4xl bg-gradient-to-br from-primary/20 to-primary/10">
                        {user?.fullName?.charAt(0) || "?"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2.5 lg:p-3 rounded-full shadow-lg group-hover:scale-110 transition-all duration-200">
                    {isUploadingPicture ? (
                      <div className="animate-spin h-5 w-5 lg:h-6 lg:w-6 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Camera className="w-5 h-5 lg:w-6 lg:h-6" />
                    )}
                  </div>
                </label>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center sm:text-left min-w-0 pb-2">
                <h1 className="font-bold text-2xl lg:text-3xl tracking-tight truncate">{user?.fullName || "User"}</h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm lg:text-base text-muted-foreground mt-2">
                  <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                  <span>Verified Parent</span>
                </div>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  {user?.email}
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-4 lg:gap-6 pb-2">
                <div className="text-center">
                  <div className="font-bold text-3xl lg:text-4xl text-primary">
                    {ratingStats?.averageRating ? ratingStats.averageRating.toFixed(1) : "—"}
                  </div>
                  <div className="text-muted-foreground text-xs lg:text-sm font-medium mt-1">Rating</div>
                </div>
                <Separator orientation="vertical" className="h-16" />
                <div className="text-center">
                  <div className="font-bold text-3xl lg:text-4xl text-primary">{ordersCount}</div>
                  <div className="text-muted-foreground text-xs lg:text-sm font-medium mt-1">Deals</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Navigation - Grid Layout */}
        <div className="lg:hidden mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={activeSection === "profile" ? "default" : "outline"}
                  size="sm"
                  className="justify-start font-medium"
                  onClick={() => setActiveSection("profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span className="text-xs sm:text-sm">Profile</span>
                </Button>
                <Button
                  variant={activeSection === "children" ? "default" : "outline"}
                  size="sm"
                  className="justify-start font-medium"
                  onClick={() => setActiveSection("children")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span className="text-xs sm:text-sm">Children</span>
                </Button>
                <Button
                  variant={activeSection === "disputes" ? "default" : "outline"}
                  size="sm"
                  className="justify-start font-medium relative"
                  onClick={() => setActiveSection("disputes")}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  <span className="text-xs sm:text-sm">Disputes</span>
                  {openDisputesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {openDisputesCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant={activeSection === "notifications" ? "default" : "outline"}
                  size="sm"
                  className="justify-start font-medium"
                  onClick={() => setActiveSection("notifications")}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  <span className="text-xs sm:text-sm">Alerts</span>
                </Button>
                <Button
                  variant={activeSection === "payment" ? "default" : "outline"}
                  size="sm"
                  className="justify-start font-medium"
                  onClick={() => setActiveSection("payment")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span className="text-xs sm:text-sm">Payment</span>
                </Button>
                <Button
                  variant={activeSection === "ratings" ? "default" : "outline"}
                  size="sm"
                  className="justify-start font-medium"
                  onClick={() => setActiveSection("ratings")}
                >
                  <Star className="mr-2 h-4 w-4" />
                  <span className="text-xs sm:text-sm">Ratings</span>
                </Button>
              </div>
              <Separator className="my-3" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="text-sm">Log out</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Tabs Navigation */}
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as typeof activeSection)} className="hidden lg:block">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <User className="mr-2 h-4 w-4" />
              Profile Details
            </TabsTrigger>
            <TabsTrigger value="children" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Users className="mr-2 h-4 w-4" />
              My Children
            </TabsTrigger>
            <TabsTrigger value="disputes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none relative">
              <Shield className="mr-2 h-4 w-4" />
              Disputes
              {openDisputesCount > 0 && (
                <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {openDisputesCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <CreditCard className="mr-2 h-4 w-4" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="ratings" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Star className="mr-2 h-4 w-4" />
              Ratings & Reviews
            </TabsTrigger>
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </TabsList>

          {/* Main Content Area */}
          <div className="mt-6">
          {/* Profile Details Section */}
          {activeSection === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and school information.</CardDescription>
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
                      className="pl-9 bg-muted"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Phone number cannot be changed. It's used for verification.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4">
              <Button onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
          )}

          {/* Children Management Section */}
          {activeSection === "children" && (
            <ChildrenManagement />
          )}

          {/* Disputes Section */}
          {activeSection === "disputes" && (
          <Card>
            <CardHeader>
              <CardTitle>My Disputes</CardTitle>
              <CardDescription>Manage and track your dispute cases.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {disputes.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No Disputes</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You haven't filed any disputes yet
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-primary">{disputes.length}</div>
                          <div className="text-sm text-muted-foreground mt-1">Total Disputes</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-amber-600">{openDisputesCount}</div>
                          <div className="text-sm text-muted-foreground mt-1">Open Cases</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">
                            {disputes.filter((d: any) => ["resolved", "closed"].includes(d.dispute.status)).length}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">Resolved</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    {disputes.slice(0, 5).map((item: any) => {
                      const { dispute } = item;
                      const isOpen = ["open", "awaiting_response", "investigating", "escalated"].includes(dispute.status);

                      return (
                        <div
                          key={dispute.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setLocation(`/disputes/${dispute.id}`)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-2 rounded-full ${isOpen ? 'bg-amber-100' : 'bg-green-100'}`}>
                              {isOpen ? (
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                              ) : (
                                <ShieldCheck className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{dispute.title}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {dispute.disputeType.replace(/_/g, " ")} • {dispute.status.replace(/_/g, " ")}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        </div>
                      );
                    })}
                  </div>

                  {disputes.length > 5 && (
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation("/disputes")}
                      >
                        View All Disputes ({disputes.length})
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4">
              <Button onClick={() => setLocation("/disputes")}>
                <Shield className="h-4 w-4 mr-2" />
                View All Disputes
              </Button>
            </CardFooter>
          </Card>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage how we communicate with you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingPreferences ? (
                <div className="space-y-4">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted animate-pulse rounded w-1/3"></div>
                        <div className="h-3 bg-muted animate-pulse rounded w-2/3"></div>
                      </div>
                      <div className="h-6 w-11 bg-muted animate-pulse rounded-full"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive updates about your listings and orders.</p>
                </div>
                <Switch
                  checked={currentPreferences?.emailNotifications ?? true}
                  onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, emailNotifications: c} : {
                    emailNotifications: c,
                    pushNotifications: true,
                    smsNotifications: false,
                    notifyOnNewMessages: true,
                    notifyOnBookSold: true,
                    notifyOnPriceDrops: true,
                    notifyOnNewListings: false,
                    preferredPaymentMethod: "mpesa",
                    mpesaPhoneNumber: null,
                    bankName: null,
                    bankAccountNumber: null,
                    bankAccountName: null,
                    bankBranch: null,
                    paypalEmail: null,
                  })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Get instant alerts on your device.</p>
                </div>
                <Switch
                  checked={currentPreferences?.pushNotifications ?? true}
                  onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, pushNotifications: c} : {
                    emailNotifications: true,
                    pushNotifications: c,
                    smsNotifications: false,
                    notifyOnNewMessages: true,
                    notifyOnBookSold: true,
                    notifyOnPriceDrops: true,
                    notifyOnNewListings: false,
                    preferredPaymentMethod: "mpesa",
                    mpesaPhoneNumber: null,
                    bankName: null,
                    bankAccountNumber: null,
                    bankAccountName: null,
                    bankBranch: null,
                    paypalEmail: null,
                  })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">SMS Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive text messages for important updates.</p>
                </div>
                <Switch
                  checked={currentPreferences?.smsNotifications ?? false}
                  onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, smsNotifications: c} : {
                    emailNotifications: true,
                    pushNotifications: true,
                    smsNotifications: c,
                    notifyOnNewMessages: true,
                    notifyOnBookSold: true,
                    notifyOnPriceDrops: true,
                    notifyOnNewListings: false,
                    preferredPaymentMethod: "mpesa",
                    mpesaPhoneNumber: null,
                    bankName: null,
                    bankAccountNumber: null,
                    bankAccountName: null,
                    bankBranch: null,
                    paypalEmail: null,
                  })}
                />
              </div>
              <Separator />
              <div className="pt-2">
                <Label className="text-base mb-3 block">Notify me about:</Label>
                <div className="space-y-3 ml-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">New messages</Label>
                    <Switch
                      checked={currentPreferences?.notifyOnNewMessages ?? true}
                      onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, notifyOnNewMessages: c} : {
                        emailNotifications: true,
                        pushNotifications: true,
                        smsNotifications: false,
                        notifyOnNewMessages: c,
                        notifyOnBookSold: true,
                        notifyOnPriceDrops: true,
                        notifyOnNewListings: false,
                        preferredPaymentMethod: "mpesa",
                        mpesaPhoneNumber: null,
                        bankName: null,
                        bankAccountNumber: null,
                        bankAccountName: null,
                        bankBranch: null,
                        paypalEmail: null,
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">When my book is sold</Label>
                    <Switch
                      checked={currentPreferences?.notifyOnBookSold ?? true}
                      onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, notifyOnBookSold: c} : {
                        emailNotifications: true,
                        pushNotifications: true,
                        smsNotifications: false,
                        notifyOnNewMessages: true,
                        notifyOnBookSold: c,
                        notifyOnPriceDrops: true,
                        notifyOnNewListings: false,
                        preferredPaymentMethod: "mpesa",
                        mpesaPhoneNumber: null,
                        bankName: null,
                        bankAccountNumber: null,
                        bankAccountName: null,
                        bankBranch: null,
                        paypalEmail: null,
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">Price drops on favorites</Label>
                    <Switch
                      checked={currentPreferences?.notifyOnPriceDrops ?? true}
                      onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, notifyOnPriceDrops: c} : {
                        emailNotifications: true,
                        pushNotifications: true,
                        smsNotifications: false,
                        notifyOnNewMessages: true,
                        notifyOnBookSold: true,
                        notifyOnPriceDrops: c,
                        notifyOnNewListings: false,
                        preferredPaymentMethod: "mpesa",
                        mpesaPhoneNumber: null,
                        bankName: null,
                        bankAccountNumber: null,
                        bankAccountName: null,
                        bankBranch: null,
                        paypalEmail: null,
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">New listings in my area</Label>
                    <Switch
                      checked={currentPreferences?.notifyOnNewListings ?? false}
                      onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, notifyOnNewListings: c} : {
                        emailNotifications: true,
                        pushNotifications: true,
                        smsNotifications: false,
                        notifyOnNewMessages: true,
                        notifyOnBookSold: true,
                        notifyOnPriceDrops: true,
                        notifyOnNewListings: c,
                        preferredPaymentMethod: "mpesa",
                        mpesaPhoneNumber: null,
                        bankName: null,
                        bankAccountNumber: null,
                        bankAccountName: null,
                        bankBranch: null,
                        paypalEmail: null,
                      })}
                    />
                  </div>
                </div>
              </div>
              </>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4">
              <Button onClick={handleSaveNotifications} disabled={updateNotificationsMutation.isPending || isLoadingPreferences}>
                {updateNotificationsMutation.isPending ? "Saving..." : "Save Notification Preferences"}
              </Button>
            </CardFooter>
          </Card>
          )}

          {/* Ratings & Reviews Section */}
          {activeSection === "ratings" && user && (
            <UserRatingsDisplay userId={user.id} limit={20} />
          )}

          {/* Payment Methods Section */}
          {activeSection === "payment" && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Choose how you want to receive payments when you sell books.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Preferred Payment Method</Label>
                <RadioGroup
                  value={paymentData.preferredPaymentMethod}
                  onValueChange={(value) => setPaymentData({...paymentData, preferredPaymentMethod: value})}
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="mpesa" id="mpesa" />
                    <Label htmlFor="mpesa" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium">M-Pesa</div>
                          <div className="text-xs text-muted-foreground">Instant mobile money transfer</div>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="bank" id="bank" />
                    <Label htmlFor="bank" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Bank Transfer</div>
                          <div className="text-xs text-muted-foreground">Direct deposit to your bank account</div>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Wallet className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-medium">PayPal</div>
                          <div className="text-xs text-muted-foreground">International payments via PayPal</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* M-Pesa Details */}
              {paymentData.preferredPaymentMethod === "mpesa" && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">M-Pesa Details</h4>
                  <div className="space-y-2">
                    <Label htmlFor="mpesaPhone">M-Pesa Phone Number</Label>
                    <Input
                      id="mpesaPhone"
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={paymentData.mpesaPhoneNumber}
                      onChange={(e) => setPaymentData({...paymentData, mpesaPhoneNumber: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {/* Bank Details */}
              {paymentData.preferredPaymentMethod === "bank" && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Bank Account Details</h4>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        placeholder="e.g. Equity Bank"
                        value={paymentData.bankName}
                        onChange={(e) => setPaymentData({...paymentData, bankName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input
                        id="accountName"
                        placeholder="Account holder name"
                        value={paymentData.bankAccountName}
                        onChange={(e) => setPaymentData({...paymentData, bankAccountName: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          placeholder="Account number"
                          value={paymentData.bankAccountNumber}
                          onChange={(e) => setPaymentData({...paymentData, bankAccountNumber: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branch">Branch</Label>
                        <Input
                          id="branch"
                          placeholder="e.g. Westlands"
                          value={paymentData.bankBranch}
                          onChange={(e) => setPaymentData({...paymentData, bankBranch: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PayPal Details */}
              {paymentData.preferredPaymentMethod === "paypal" && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">PayPal Details</h4>
                  <div className="space-y-2">
                    <Label htmlFor="paypalEmail">PayPal Email</Label>
                    <Input
                      id="paypalEmail"
                      type="email"
                      placeholder="your.email@example.com"
                      value={paymentData.paypalEmail}
                      onChange={(e) => setPaymentData({...paymentData, paypalEmail: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4">
              <Button onClick={handleSavePayment} disabled={updatePaymentMutation.isPending}>
                {updatePaymentMutation.isPending ? "Saving..." : "Save Payment Method"}
              </Button>
            </CardFooter>
          </Card>
          )}
          </div>
        </Tabs>

        {/* Mobile Content - Conditional Rendering */}
        <div className="lg:hidden">
          {activeSection === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and school information.</CardDescription>
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
                      className="pl-9 bg-muted"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Phone number cannot be changed. It's used for verification.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4">
              <Button onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
          )}

          {activeSection === "children" && (
            <ChildrenManagement />
          )}

          {activeSection === "disputes" && (
            <Card>
              <CardHeader>
                <CardTitle>My Disputes</CardTitle>
                <CardDescription>Manage and track your dispute cases.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {disputes.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Disputes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You haven't filed any disputes yet
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{disputes.length}</div>
                        <div className="text-xs text-muted-foreground mt-1">Total</div>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-lg">
                        <div className="text-2xl font-bold text-amber-600">{openDisputesCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">Open</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {disputes.filter((d: any) => ["resolved", "closed"].includes(d.dispute.status)).length}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Resolved</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      {disputes.slice(0, 5).map((item: any) => {
                        const { dispute } = item;
                        const isOpen = ["open", "awaiting_response", "investigating", "escalated"].includes(dispute.status);

                        return (
                          <div
                            key={dispute.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors active:bg-muted"
                            onClick={() => setLocation(`/disputes/${dispute.id}`)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`p-1.5 rounded-full ${isOpen ? 'bg-amber-100' : 'bg-green-100'}`}>
                                {isOpen ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{dispute.title}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {dispute.status.replace(/_/g, " ")}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        );
                      })}
                    </div>

                    {disputes.length > 5 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={() => setLocation("/disputes")}
                      >
                        View All ({disputes.length})
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t px-6 py-4">
                <Button onClick={() => setLocation("/disputes")} size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeSection === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage how we communicate with you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingPreferences ? (
                  <div className="space-y-4">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted animate-pulse rounded w-1/3"></div>
                          <div className="h-3 bg-muted animate-pulse rounded w-2/3"></div>
                        </div>
                        <div className="h-6 w-11 bg-muted animate-pulse rounded-full"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive updates about your listings and orders.</p>
                      </div>
                      <Switch
                        checked={currentPreferences?.emailNotifications ?? true}
                        onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, emailNotifications: c} : {
                          emailNotifications: c,
                          pushNotifications: true,
                          smsNotifications: false,
                          notifyOnNewMessages: true,
                          notifyOnBookSold: true,
                          notifyOnPriceDrops: true,
                          notifyOnNewListings: false,
                          preferredPaymentMethod: "mpesa",
                          mpesaPhoneNumber: null,
                          bankName: null,
                          bankAccountNumber: null,
                          bankAccountName: null,
                          bankBranch: null,
                          paypalEmail: null,
                        })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Push Notifications</Label>
                        <p className="text-xs text-muted-foreground">Get instant alerts on your device.</p>
                      </div>
                      <Switch
                        checked={currentPreferences?.pushNotifications ?? true}
                        onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, pushNotifications: c} : {
                          emailNotifications: true,
                          pushNotifications: c,
                          smsNotifications: false,
                          notifyOnNewMessages: true,
                          notifyOnBookSold: true,
                          notifyOnPriceDrops: true,
                          notifyOnNewListings: false,
                          preferredPaymentMethod: "mpesa",
                          mpesaPhoneNumber: null,
                          bankName: null,
                          bankAccountNumber: null,
                          bankAccountName: null,
                          bankBranch: null,
                          paypalEmail: null,
                        })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">SMS Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive text messages for important updates.</p>
                      </div>
                      <Switch
                        checked={currentPreferences?.smsNotifications ?? false}
                        onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, smsNotifications: c} : {
                          emailNotifications: true,
                          pushNotifications: true,
                          smsNotifications: c,
                          notifyOnNewMessages: true,
                          notifyOnBookSold: true,
                          notifyOnPriceDrops: true,
                          notifyOnNewListings: false,
                          preferredPaymentMethod: "mpesa",
                          mpesaPhoneNumber: null,
                          bankName: null,
                          bankAccountNumber: null,
                          bankAccountName: null,
                          bankBranch: null,
                          paypalEmail: null,
                        })}
                      />
                    </div>
                    <Separator />
                    <div className="pt-2">
                      <Label className="text-base mb-3 block">Notify me about:</Label>
                      <div className="space-y-3 ml-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">New messages</Label>
                          <Switch
                            checked={currentPreferences?.notifyOnNewMessages ?? true}
                            onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, notifyOnNewMessages: c} : {
                              emailNotifications: true,
                              pushNotifications: true,
                              smsNotifications: false,
                              notifyOnNewMessages: c,
                              notifyOnBookSold: true,
                              notifyOnPriceDrops: true,
                              notifyOnNewListings: false,
                              preferredPaymentMethod: "mpesa",
                              mpesaPhoneNumber: null,
                              bankName: null,
                              bankAccountNumber: null,
                              bankAccountName: null,
                              bankBranch: null,
                              paypalEmail: null,
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">When my book is sold</Label>
                          <Switch
                            checked={currentPreferences?.notifyOnBookSold ?? true}
                            onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, notifyOnBookSold: c} : {
                              emailNotifications: true,
                              pushNotifications: true,
                              smsNotifications: false,
                              notifyOnNewMessages: true,
                              notifyOnBookSold: c,
                              notifyOnPriceDrops: true,
                              notifyOnNewListings: false,
                              preferredPaymentMethod: "mpesa",
                              mpesaPhoneNumber: null,
                              bankName: null,
                              bankAccountNumber: null,
                              bankAccountName: null,
                              bankBranch: null,
                              paypalEmail: null,
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Price drops on favorites</Label>
                          <Switch
                            checked={currentPreferences?.notifyOnPriceDrops ?? true}
                            onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, notifyOnPriceDrops: c} : {
                              emailNotifications: true,
                              pushNotifications: true,
                              smsNotifications: false,
                              notifyOnNewMessages: true,
                              notifyOnBookSold: true,
                              notifyOnPriceDrops: c,
                              notifyOnNewListings: false,
                              preferredPaymentMethod: "mpesa",
                              mpesaPhoneNumber: null,
                              bankName: null,
                              bankAccountNumber: null,
                              bankAccountName: null,
                              bankBranch: null,
                              paypalEmail: null,
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">New listings in my area</Label>
                          <Switch
                            checked={currentPreferences?.notifyOnNewListings ?? false}
                            onCheckedChange={(c) => setLocalPreferences(prev => prev ? {...prev, notifyOnNewListings: c} : {
                              emailNotifications: true,
                              pushNotifications: true,
                              smsNotifications: false,
                              notifyOnNewMessages: true,
                              notifyOnBookSold: true,
                              notifyOnPriceDrops: true,
                              notifyOnNewListings: c,
                              preferredPaymentMethod: "mpesa",
                              mpesaPhoneNumber: null,
                              bankName: null,
                              bankAccountNumber: null,
                              bankAccountName: null,
                              bankBranch: null,
                              paypalEmail: null,
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t px-6 py-4">
                <Button onClick={handleSaveNotifications} disabled={updateNotificationsMutation.isPending || isLoadingPreferences}>
                  {updateNotificationsMutation.isPending ? "Saving..." : "Save Notification Preferences"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeSection === "payment" && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Choose how you want to receive payments when you sell books.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Preferred Payment Method</Label>
                  <RadioGroup
                    value={paymentData.preferredPaymentMethod}
                    onValueChange={(value) => setPaymentData({...paymentData, preferredPaymentMethod: value})}
                  >
                    <div className="flex items-center space-x-2 border rounded-lg p-4">
                      <RadioGroupItem value="mpesa" id="mpesa-mobile" />
                      <Label htmlFor="mpesa-mobile" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-green-600" />
                          <div>
                            <div className="font-medium">M-Pesa</div>
                            <div className="text-xs text-muted-foreground">Instant mobile money transfer</div>
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 border rounded-lg p-4">
                      <RadioGroupItem value="bank" id="bank-mobile" />
                      <Label htmlFor="bank-mobile" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="font-medium">Bank Transfer</div>
                            <div className="text-xs text-muted-foreground">Direct deposit to your bank account</div>
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 border rounded-lg p-4">
                      <RadioGroupItem value="paypal" id="paypal-mobile" />
                      <Label htmlFor="paypal-mobile" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Wallet className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="font-medium">PayPal</div>
                            <div className="text-xs text-muted-foreground">International payments via PayPal</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* M-Pesa Details */}
                {paymentData.preferredPaymentMethod === "mpesa" && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">M-Pesa Details</h4>
                    <div className="space-y-2">
                      <Label htmlFor="mpesaPhone-mobile">M-Pesa Phone Number</Label>
                      <Input
                        id="mpesaPhone-mobile"
                        type="tel"
                        placeholder="e.g. 0712345678"
                        value={paymentData.mpesaPhoneNumber}
                        onChange={(e) => setPaymentData({...paymentData, mpesaPhoneNumber: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {/* Bank Details */}
                {paymentData.preferredPaymentMethod === "bank" && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Bank Account Details</h4>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName-mobile">Bank Name</Label>
                        <Input
                          id="bankName-mobile"
                          placeholder="e.g. Equity Bank"
                          value={paymentData.bankName}
                          onChange={(e) => setPaymentData({...paymentData, bankName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountName-mobile">Account Name</Label>
                        <Input
                          id="accountName-mobile"
                          placeholder="Account holder name"
                          value={paymentData.bankAccountName}
                          onChange={(e) => setPaymentData({...paymentData, bankAccountName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber-mobile">Account Number</Label>
                        <Input
                          id="accountNumber-mobile"
                          placeholder="Account number"
                          value={paymentData.bankAccountNumber}
                          onChange={(e) => setPaymentData({...paymentData, bankAccountNumber: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branch-mobile">Branch</Label>
                        <Input
                          id="branch-mobile"
                          placeholder="e.g. Westlands"
                          value={paymentData.bankBranch}
                          onChange={(e) => setPaymentData({...paymentData, bankBranch: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PayPal Details */}
                {paymentData.preferredPaymentMethod === "paypal" && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">PayPal Details</h4>
                    <div className="space-y-2">
                      <Label htmlFor="paypalEmail-mobile">PayPal Email</Label>
                      <Input
                        id="paypalEmail-mobile"
                        type="email"
                        placeholder="your.email@example.com"
                        value={paymentData.paypalEmail}
                        onChange={(e) => setPaymentData({...paymentData, paypalEmail: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t px-6 py-4">
                <Button onClick={handleSavePayment} disabled={updatePaymentMutation.isPending}>
                  {updatePaymentMutation.isPending ? "Saving..." : "Save Payment Method"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Ratings & Reviews Section */}
          {activeSection === "ratings" && user && (
            <UserRatingsDisplay userId={user.id} limit={20} />
          )}
        </div>
      </div>
    </div>
  );
}
