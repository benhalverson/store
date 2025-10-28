import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ColorProvider } from "./context/ColorContext";

// Lazy load pages for code-splitting
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const ProductPage = lazy(() => import("./pages/Product"));
const ProductList = lazy(() => import("./pages/ProductList"));
const Profile = lazy(() => import("./pages/Profile"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Signin = lazy(() => import("./pages/Signin"));
const Signup = lazy(() => import("./pages/Signup"));

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ColorProvider>
          <Toaster position="top-right" />
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                Loading...
              </div>
            }>
            <Routes>
              {/* Set ProductList as the default page */}
              <Route path="/" element={<Layout />}>
                <Route index element={<ProductList />} />
                <Route path="search" element={<SearchResults />} />
                <Route path="signup" element={<Signup />} />
                <Route path="signin" element={<Signin />} />
                <Route path="profile" element={<Profile />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />

                {/* Route to ProductPage with a dynamic product ID */}
                <Route path="product/:id" element={<ProductPage />} />
              </Route>
            </Routes>
          </Suspense>
        </ColorProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
