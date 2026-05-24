import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Dashboard from "@/pages/dashboard/Dashboard";
import ProfileSettings from "@/pages/ProfileSettings";
import ProductsList from "@/pages/dashboard/vendor/ProductsList";
import ProductForm from "@/pages/dashboard/vendor/ProductForm";
import EditProduct from "@/pages/dashboard/vendor/EditProduct";
import ProductModeration from "@/pages/dashboard/admin/ProductModeration";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />

      {/* Vendor product routes */}
      <Route path="/dashboard/products/new" component={() => <ProductForm />} />
      <Route path="/dashboard/products/:id/edit" component={EditProduct} />
      <Route path="/dashboard/products" component={ProductsList} />

      {/* Admin routes */}
      <Route path="/dashboard/moderation" component={ProductModeration} />

      {/* Generic dashboard (role-based) */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/:rest*" component={Dashboard} />

      <Route path="/profile/settings" component={ProfileSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
