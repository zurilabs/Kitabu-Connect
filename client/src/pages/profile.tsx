import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSchools } from "@/hooks/useSchools";
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
  Wallet,
  Building2
} from "lucide-react";

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
  const { user, logout, isLoading: isLoadingAuth } = useAuth();
  const { schools, isLoadingSchools } = useSchools();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

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

  // Payment form state
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

  // Fetch user preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch("/api/preferences", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);

          if (data.preferences) {
            setPaymentData({
              preferredPaymentMethod: data.preferences.preferredPaymentMethod || "mpesa",
              mpesaPhoneNumber: data.preferences.mpesaPhoneNumber || "",
              bankName: data.preferences.bankName || "",
              bankAccountNumber: data.preferences.bankAccountNumber || "",
              bankAccountName: data.preferences.bankAccountName || "",
              bankBranch: data.preferences.bankBranch || "",
              paypalEmail: data.preferences.paypalEmail || "",
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch preferences:", error);
      }
    };

    if (user) {
      fetchPreferences();
    }
  }, [user]);

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

  const handleSaveNotifications = async () => {
    if (!preferences) return;

    setIsSavingNotifications(true);
    try {
      const response = await fetch("/api/preferences/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          emailNotifications: preferences.emailNotifications,
          pushNotifications: preferences.pushNotifications,
          smsNotifications: preferences.smsNotifications,
          notifyOnNewMessages: preferences.notifyOnNewMessages,
          notifyOnBookSold: preferences.notifyOnBookSold,
          notifyOnPriceDrops: preferences.notifyOnPriceDrops,
          notifyOnNewListings: preferences.notifyOnNewListings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update notifications");
      }

      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update notifications",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleSavePayment = async () => {
    setIsSavingPayment(true);
    try {
      const response = await fetch("/api/preferences/payment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update payment method");
      }

      toast({
        title: "Payment Method Updated",
        description: "Your payment preferences have been saved.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update payment method",
        variant: "destructive",
      });
    } finally {
      setIsSavingPayment(false);
    }
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
        <p className="text-muted-foreground">Manage your profile, preferences, and payment methods.</p>
      </div>

      <div className="grid md:grid-cols-[280px,1fr] gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  id="profile-picture-upload"
                  disabled={isUploadingPicture}
                />
                <label htmlFor="profile-picture-upload" className="cursor-pointer">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="object-cover w-full h-full" />
                    ) : (
                      <AvatarFallback className="text-2xl">{user?.fullName?.charAt(0) || "?"}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    {isUploadingPicture ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </div>
                </label>
              </div>

              <div>
                <h3 className="font-bold text-lg">{user?.fullName || "User"}</h3>
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                  <span>Verified Parent</span>
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
          {/* Personal Information */}
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
                  <Label htmlFor="school">School</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                    <Select
                      value={formData.schoolId}
                      onValueChange={(value) => {
                        const school = schools.find(s => s.id === value);
                        setFormData({
                          ...formData,
                          schoolId: value,
                          schoolName: school?.name || ""
                        });
                      }}
                    >
                      <SelectTrigger className="pl-9">
                        <SelectValue placeholder={isLoadingSchools ? "Loading schools..." : "Select school"} />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

          {/* Notifications */}
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
                  checked={preferences?.emailNotifications ?? true}
                  onCheckedChange={(c) => setPreferences(prev => prev ? {...prev, emailNotifications: c} : {
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
                  checked={preferences?.pushNotifications ?? true}
                  onCheckedChange={(c) => setPreferences(prev => prev ? {...prev, pushNotifications: c} : {
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
                  checked={preferences?.smsNotifications ?? false}
                  onCheckedChange={(c) => setPreferences(prev => prev ? {...prev, smsNotifications: c} : {
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
                      checked={preferences?.notifyOnNewMessages ?? true}
                      onCheckedChange={(c) => setPreferences(prev => prev ? {...prev, notifyOnNewMessages: c} : {
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
                      checked={preferences?.notifyOnBookSold ?? true}
                      onCheckedChange={(c) => setPreferences(prev => prev ? {...prev, notifyOnBookSold: c} : {
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
                      checked={preferences?.notifyOnPriceDrops ?? true}
                      onCheckedChange={(c) => setPreferences(prev => prev ? {...prev, notifyOnPriceDrops: c} : {
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
                      checked={preferences?.notifyOnNewListings ?? false}
                      onCheckedChange={(c) => setPreferences(prev => prev ? {...prev, notifyOnNewListings: c} : {
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
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4">
              <Button onClick={handleSaveNotifications} disabled={isSavingNotifications}>
                {isSavingNotifications ? "Saving..." : "Save Notification Preferences"}
              </Button>
            </CardFooter>
          </Card>

          {/* Payment Methods */}
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
              <Button onClick={handleSavePayment} disabled={isSavingPayment}>
                {isSavingPayment ? "Saving..." : "Save Payment Method"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
