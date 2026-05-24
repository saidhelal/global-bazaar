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
import ProductCatalog from "@/pages/products/ProductCatalog";
import ProductDetail from "@/pages/products/ProductDetail";
import Cart from "@/pages/cart/Cart";
import Checkout from "@/pages/checkout/Checkout";
import OrderHistory from "@/pages/orders/OrderHistory";
import OrderDetail from "@/pages/orders/OrderDetail";
import TrackShipment from "@/pages/track/TrackShipment";
import VendorShipping from "@/pages/dashboard/vendor/VendorShipping";
import ShippingZones from "@/pages/dashboard/admin/ShippingZones";
import NotificationsPage from "@/pages/notifications/NotificationsPage";
import { LanguageProvider } from "./contexts/LanguageContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { NotificationProvider } from "./contexts/NotificationContext";

const queryClient = new QueryClient();

function Router() {
  return (
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
      <Route path="/dashboard/products/new" component={() => <ProductForm />} />
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
      <CurrencyProvider>
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                  <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
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

export default App;
