import { lazy, Suspense } from 'react';
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "./contexts/LanguageContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { NotificationProvider } from "./contexts/NotificationContext";

// Critical path — eagerly loaded (above-the-fold, first route)
import Home from "@/pages/Home";

// Route-level code splitting — everything else is lazy
const NotFound          = lazy(() => import("@/pages/not-found"));
const Login             = lazy(() => import("@/pages/auth/Login"));
const Register          = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword    = lazy(() => import("@/pages/auth/ForgotPassword"));
const Dashboard         = lazy(() => import("@/pages/dashboard/Dashboard"));
const ProfileSettings   = lazy(() => import("@/pages/ProfileSettings"));
const ProductsList      = lazy(() => import("@/pages/dashboard/vendor/ProductsList"));
const ProductForm       = lazy(() => import("@/pages/dashboard/vendor/ProductForm"));
const EditProduct       = lazy(() => import("@/pages/dashboard/vendor/EditProduct"));
const ProductModeration = lazy(() => import("@/pages/dashboard/admin/ProductModeration"));
const ProductCatalog    = lazy(() => import("@/pages/products/ProductCatalog"));
const ProductDetail     = lazy(() => import("@/pages/products/ProductDetail"));
const Cart              = lazy(() => import("@/pages/cart/Cart"));
const Checkout          = lazy(() => import("@/pages/checkout/Checkout"));
const OrderHistory      = lazy(() => import("@/pages/orders/OrderHistory"));
const OrderDetail       = lazy(() => import("@/pages/orders/OrderDetail"));
const TrackShipment     = lazy(() => import("@/pages/track/TrackShipment"));
const VendorShipping    = lazy(() => import("@/pages/dashboard/vendor/VendorShipping"));
const ShippingZones     = lazy(() => import("@/pages/dashboard/admin/ShippingZones"));
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage"));
const MyReviews         = lazy(() => import("@/pages/dashboard/customer/MyReviews"));
const ReviewModeration  = lazy(() => import("@/pages/dashboard/admin/ReviewModeration"));
const VendorOnboarding  = lazy(() => import("@/pages/vendor/VendorOnboarding"));
const LegalDashboard    = lazy(() => import("@/pages/dashboard/legal/LegalDashboard"));
const LegalVendorDetail = lazy(() => import("@/pages/dashboard/legal/LegalVendorDetail"));

// Stable component wrapper — avoids inline arrow function re-mount bug
const NewProductForm = () => <ProductForm />;

// Branded full-page loader shown while lazy chunks download
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center" aria-live="polite" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#D4AF37] animate-spin" />
          <div className="absolute inset-2 rounded-full border border-[#D4AF37]/20" />
        </div>
        <p className="text-white/30 text-sm font-medium tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
}

// Singleton — must live outside component to prevent recreation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60_000,   // data stays fresh for 1 min
      gcTime:          5 * 60_000,   // cache kept for 5 min after unmount
      retry:                1,
      refetchOnWindowFocus: false,    // don't surprise users with loading states
    },
  },
});

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />

        {/* Public storefront */}
        <Route path="/products" component={ProductCatalog} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/orders" component={OrderHistory} />
        <Route path="/orders/:id" component={OrderDetail} />

        {/* Vendor product routes */}
        <Route path="/dashboard/products/new" component={NewProductForm} />
        <Route path="/dashboard/products/:id/edit" component={EditProduct} />
        <Route path="/dashboard/products" component={ProductsList} />

        {/* Admin routes */}
        <Route path="/dashboard/moderation" component={ProductModeration} />
        <Route path="/dashboard/shipping/zones" component={ShippingZones} />

        {/* Vendor routes */}
        <Route path="/dashboard/shipping" component={VendorShipping} />

        {/* Public shipment tracking */}
        <Route path="/track/:number" component={TrackShipment} />
        <Route path="/track" component={TrackShipment} />

        {/* Notifications */}
        <Route path="/notifications" component={NotificationsPage} />

        {/* Reviews */}
        <Route path="/dashboard/reviews/moderation" component={ReviewModeration} />
        <Route path="/dashboard/reviews" component={MyReviews} />

        {/* Vendor onboarding */}
        <Route path="/vendor/onboarding" component={VendorOnboarding} />

        {/* Legal / verification (admin) */}
        <Route path="/dashboard/legal/:vendorId" component={LegalVendorDetail} />
        <Route path="/dashboard/legal" component={LegalDashboard} />

        {/* Generic dashboard (role-based) */}
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dashboard/:rest*" component={Dashboard} />

        <Route path="/profile/settings" component={ProfileSettings} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                  <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
                    {/* Accessibility: keyboard skip link */}
                    <a
                      href="#main-content"
                      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#D4AF37] focus:text-[#0A1628] focus:font-bold focus:rounded-lg focus:shadow-lg focus:outline-none"
                    >
                      Skip to main content
                    </a>
                    <Router />
                  </WouterRouter>
                  <Toaster />
                </TooltipProvider>
              </QueryClientProvider>
            </CartProvider>
          </NotificationProvider>
        </AuthProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
