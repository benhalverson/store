import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { BASE_URL } from "../config";

interface User {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface SessionResponse {
  session?: unknown;
}

type FetchUserResult = User | null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<FetchUserResult>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (): Promise<FetchUserResult> => {
    try {
      const sessionRes = await fetch(`${BASE_URL}/api/auth/get-session`, {
        credentials: "include",
      });

      if (!sessionRes.ok) {
        throw new Error("Failed to fetch session");
      }

      const sessionData: SessionResponse = await sessionRes.json();

      if (!sessionData?.session) {
        setUser(null);
        return null;
      }

      const profileRes = await fetch(`${BASE_URL}/profile`, {
        credentials: "include",
      });

      if (!profileRes.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data: User = await profileRes.json();
      setUser(data);
      return data;
    } catch (error) {
      setUser(null);
      throw error instanceof Error ? error : new Error("Failed to fetch user");
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: TODO: useEventEffect in 19
  useEffect(() => {
    fetchUser().catch(() => undefined);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
