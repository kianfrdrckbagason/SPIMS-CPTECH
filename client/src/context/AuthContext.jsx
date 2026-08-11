import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginApi, register as registerApi, logout as logoutApi, getMe } from '../services/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // User profile only — the JWT lives in the httpOnly cookie, not in state or localStorage.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always attempt to restore the session via the cookie.
    // If no valid cookie exists the server returns 401 and user stays null.
    const checkAuth = async () => {
      try {
        const userData = await getMe();
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    const data = await loginApi(credentials);
    // Server sets the httpOnly cookie; we only store the public user profile in state.
    setUser(data.user);
    return data;
  };

  // Kept because RegisterPage imports and calls this.
  // The server endpoint returns 403 — this is intentionally a no-op at the API level.
  const register = async (userData) => {
    const data = await registerApi(userData);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore network errors on logout — proceed to clear local state regardless.
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
