import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  BookOpen, 
  User as UserIcon, 
  Menu,
  ShoppingCart
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
import { CURRENT_USER } from "@/lib/mockData";
import { useState } from "react";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path: string) => location === path;

  const NavLinks = () => (
    <>
      <Link href="/marketplace">
        <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/marketplace') ? 'text-primary' : 'text-muted-foreground'}`}>
          Marketplace
        </span>
      </Link>
      <Link href="/dashboard">
        <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>
          Dashboard
        </span>
      </Link>
      <Link href="/sell">
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
          <Link href="/">
            <a className="mr-6 flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="hidden font-display font-bold text-xl sm:inline-block">
                Kitabu
              </span>
            </a>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <NavLinks />
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by title, ISBN..."
                className="h-9 w-full rounded-md border border-input bg-background pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] focus-visible:ring-1"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserIcon className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{CURRENT_USER.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {CURRENT_USER.email}
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
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                <Link href="/">
                  <a className="flex items-center space-x-2" onClick={() => setIsMobileOpen(false)}>
                    <BookOpen className="h-6 w-6 text-primary" />
                    <span className="font-bold text-xl">Kitabu</span>
                  </a>
                </Link>
                <div className="my-4 flex flex-col space-y-3 pb-10 pl-6">
                  <Link href="/marketplace">
                    <a className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>Marketplace</a>
                  </Link>
                  <Link href="/dashboard">
                    <a className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>Dashboard</a>
                  </Link>
                  <Link href="/sell">
                    <a className="py-2 hover:text-primary" onClick={() => setIsMobileOpen(false)}>Sell Books</a>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
