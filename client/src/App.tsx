import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Marketplace from "@/pages/marketplace";
import BookDetails from "@/pages/book-details";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import SellBook from "@/pages/sell";
import { Navbar } from "@/components/layout/Navbar";

function Router() {
  const [location] = useLocation();
  // Hide navbar on onboarding and sell pages
  const shouldHideNavbar = location === "/onboarding" || location === "/sell";

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {!shouldHideNavbar && <Navbar />}
      <Switch>
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/sell" component={SellBook} />
        <Route path="/" component={Home} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/book/:id" component={BookDetails} />
        <Route path="/dashboard" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
