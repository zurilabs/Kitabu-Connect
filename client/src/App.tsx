import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActiveChildProvider } from "@/contexts/ActiveChildContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Marketplace from "@/pages/marketplace";
import BookDetails from "@/pages/book-details";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import SellBook from "@/pages/sell";
import EditBook from "@/pages/edit-book";
import Favorites from "@/pages/favorites";
import SwapRequestForm from "@/pages/swap-request-form";
import SwapsPage from "@/pages/swaps";
import SwapOrderDetail from "@/pages/swap-order-detail";
import SwapCyclesPage from "@/pages/swap-cycles";
import SwapCycleDetail from "@/pages/swap-cycle-detail";
import SwapConversations from "@/pages/conversations";
import Messages from "@/pages/messages";
import Conversation from "@/pages/conversation";
import Notifications from "@/pages/notifications";
import DisputesPage from "@/pages/disputes";
import DisputeDetail from "@/pages/dispute-detail";
import WishlistPage from "@/pages/wishlist";
import { Navbar } from "@/components/layout/Navbar";
import { PWAInstallPrompt } from "@/components/ui/pwa-install-prompt";

import Profile from "@/pages/profile";

function Router() {
  const [location] = useLocation();
  // Hide navbar on auth pages, onboarding, sell, edit, and swap form pages
  const shouldHideNavbar = location === "/login" || location === "/signup" || location === "/forgot-password" || location === "/onboarding" || location === "/sell" || location.startsWith("/edit-book") || location.startsWith("/swaps/new");

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {!shouldHideNavbar && <Navbar />}
      <main className={!shouldHideNavbar ? "pt-16" : ""}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/sell" component={SellBook} />
          <Route path="/edit-book/:id" component={EditBook} />
          <Route path="/swaps/new" component={SwapRequestForm} />
          <Route path="/swaps" component={SwapsPage} />
          <Route path="/swap-cycles/:id" component={SwapCycleDetail} />
          <Route path="/swap-cycles" component={SwapCyclesPage} />
          <Route path="/orders/:id/messages" component={SwapOrderDetail} />
          <Route path="/conversations/:id" component={Conversation} />
          <Route path="/conversations" component={Messages} />
          <Route path="/swap-conversations" component={SwapConversations} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/disputes/:id" component={DisputeDetail} />
          <Route path="/disputes" component={DisputesPage} />
          <Route path="/" component={Home} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/wishlist" component={WishlistPage} />
          <Route path="/book/:id" component={BookDetails} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ActiveChildProvider>
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </ActiveChildProvider>
    </QueryClientProvider>
  );
}

export default App;