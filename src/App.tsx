import { Toaster } from "react-hot-toast";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ColorProvider } from "./context/ColorContext";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import ProductPage from "./pages/Product";
import ProductList from "./pages/ProductList";
import Profile from "./pages/Profile";
import SearchResults from "./pages/SearchResults";
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ColorProvider>
          <Toaster position="top-right" />
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
        </ColorProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
