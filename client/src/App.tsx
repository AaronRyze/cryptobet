import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Deposit from "@/pages/Deposit";
import Play from "@/pages/Play";
import Roulette from "@/pages/Roulette";
import Tower from "@/pages/Tower";
import Crash from "@/pages/Crash";
import Dice from "@/pages/Dice";
import Mines from "@/pages/Mines";
import Transactions from "@/pages/Transactions";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/">
          <Redirect to="/login" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b border-border bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/">
                <Redirect to="/deposit" />
              </Route>
              <Route path="/deposit">
                <ProtectedRoute>
                  <Deposit />
                </ProtectedRoute>
              </Route>
              <Route path="/play/coinflip">
                <ProtectedRoute>
                  <Play />
                </ProtectedRoute>
              </Route>
              <Route path="/play/roulette">
                <ProtectedRoute>
                  <Roulette />
                </ProtectedRoute>
              </Route>
              <Route path="/play/tower">
                <ProtectedRoute>
                  <Tower />
                </ProtectedRoute>
              </Route>
              <Route path="/play/crash">
                <ProtectedRoute>
                  <Crash />
                </ProtectedRoute>
              </Route>
              <Route path="/play/dice">
                <ProtectedRoute>
                  <Dice />
                </ProtectedRoute>
              </Route>
              <Route path="/play/mines">
                <ProtectedRoute>
                  <Mines />
                </ProtectedRoute>
              </Route>
              <Route path="/transactions">
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              </Route>
              <Route path="/settings">
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
