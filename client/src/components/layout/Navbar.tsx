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
  MessageSquare,
  Users
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
import { UnreadMessagesIndicator } from "./UnreadMessagesIndicator";
import { useState, useEffect } from "react";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string) => location === path;

  // Professional scroll behavior: hide on scroll down, show on scroll up
  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        // Always show navbar at the very top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past 100px - hide navbar
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show navbar
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    // Throttle scroll events for better performance
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          controlNavbar();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
          <Link href="/dashboard">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>
              Dashboard
            </span>
          </Link>
          <Link href="/swaps">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/swaps') ? 'text-primary' : 'text-muted-foreground'}`}>
              Swaps
            </span>
          </Link>
          <Link href="/swap-cycles">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/swap-cycles') ? 'text-primary' : 'text-muted-foreground'}`}>
              Multi-Way
            </span>
          </Link>
          <Link href="/favorites">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/favorites') ? 'text-primary' : 'text-muted-foreground'}`}>
              Favorites
            </span>
          </Link>
          <Link href="/conversations">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer relative ${isActive('/conversations') ? 'text-primary' : 'text-muted-foreground'}`}>
              Messages
              <UnreadMessagesIndicator />
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
    <header
      className={`fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
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
                      <Link href="/swap-cycles" className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>
                        Multi-Way Swaps
                      </Link>
                      <Link href="/conversations" className="py-2 hover:text-primary relative inline-block" onClick={() => setIsMobileOpen(false)}>
                        Messages
                        <UnreadMessagesIndicator />
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
