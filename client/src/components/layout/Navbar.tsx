import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  BookOpen,
  User as UserIcon,
  Menu,
  ShoppingCart,
  LogOut,
  Heart,
  ArrowLeftRight,
  MessageSquare
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "./NotificationBell";
import { useState } from "react";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string) => location === path;

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

  const handleSellClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setLocation('/signup');
    }
  };

  const NavLinks = () => (
    <>
      <Link href="/marketplace">
        <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/marketplace') ? 'text-primary' : 'text-muted-foreground'}`}>
          Marketplace
        </span>
      </Link>
      {user && (
        <>
          <Link href="/swaps">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/swaps') ? 'text-primary' : 'text-muted-foreground'}`}>
              Swaps
            </span>
          </Link>
          <Link href="/conversations">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/conversations') ? 'text-primary' : 'text-muted-foreground'}`}>
              Messages
            </span>
          </Link>
          <Link href="/favorites">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/favorites') ? 'text-primary' : 'text-muted-foreground'}`}>
              Favorites
            </span>
          </Link>
          <Link href="/dashboard">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>
              Dashboard
            </span>
          </Link>
        </>
      )}
      <Link href="/sell" onClick={handleSellClick}>
        <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/sell') ? 'text-primary' : 'text-muted-foreground'}`}>
          Sell Books
        </span>
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 md:px-6">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="hidden font-display font-bold text-xl sm:inline-block">
              Kitabu
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <NavLinks />
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      {user.profilePictureUrl && (
                        <AvatarImage src={user.profilePictureUrl} alt={user.fullName || 'User'} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.fullName
                          ? user.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)
                          : <UserIcon className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.fullName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || user?.phoneNumber}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/dashboard')}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/profile')}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {isLoggingOut ? 'Logging out...' : 'Log out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            )}

            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileOpen(false)}>
                  <BookOpen className="h-6 w-6 text-primary" />
                  <span className="font-bold text-xl">Kitabu</span>
                </Link>
                <div className="my-4 flex flex-col space-y-3 pb-10 pl-6">
                  <Link href="/marketplace" className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>
                    Marketplace
                  </Link>
                  {user && (
                    <>
                      <Link href="/swaps" className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>
                        Swaps
                      </Link>
                      <Link href="/conversations" className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>
                        Messages
                      </Link>
                      <Link href="/favorites" className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>
                        Favorites
                      </Link>
                      <Link href="/dashboard" className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>
                        Dashboard
                      </Link>
                    </>
                  )}
                  <Link href="/sell" className="py-2 hover:text-primary" onClick={(e) => {
                    handleSellClick(e);
                    setIsMobileOpen(false);
                  }}>
                    Sell Books
                  </Link>
                  {!user && (
                    <Link href="/signup" className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>
                      Get Started
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
