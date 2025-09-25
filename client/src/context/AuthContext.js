import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('loggedInUser');
      if (!storedUser) return null;
      try {
        return JSON.parse(storedUser);
      } catch {
        return storedUser ? { username: storedUser } : null;
      }
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    // Expecting an object like { _id, username, ... }
    const normalized = typeof userData === 'string' ? { username: userData } : userData;
    setUser(normalized);
    try {
      localStorage.setItem('loggedInUser', JSON.stringify(normalized));
    } catch {
      // Fallback to plain string if JSON fails
      localStorage.setItem('loggedInUser', normalized?.username || '');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
