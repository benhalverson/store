import { Link, Outlet, useNavigate } from "react-router-dom";
import { BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { SearchBar } from "./SearchBar";

export function Layout() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const handleSignOut = async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/signout`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        setUser(null);
        // loading(false);
        navigate("/signin");
      }
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-900 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <Link to="/" className="hover:underline font-semibold">
              Home
            </Link>
            {user && (
              <Link to="/profile" className="hover:underline">
                Profile
              </Link>
            )}
            <Link to="/cart" className="hover:underline">
              Cart
            </Link>
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">
                Sign Out
              </button>
            )}
          </div>

          <div className="flex-1 max-w-md mx-8">
            <SearchBar className="w-full" />
          </div>

          {!user && (
            <div className="flex gap-4">
              <Link to="/signup" className="hover:underline">
                Signup
              </Link>
              <Link to="/signin" className="hover:underline">
                Signin
              </Link>
            </div>
          )}
        </div>
      </nav>

      <main className="p-6 flex-grow">
        <Outlet />
      </main>
    </div>
  );
}
