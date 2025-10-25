import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

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

  const markStatus = useCallback(async (userId, isOnline) => {
    if (!userId) return;
    try {
      await fetch(`${API_BASE}/api/profiles/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline }),
        keepalive: !isOnline,
      });
    } catch (error) {
      // Silent fail; presence updates should not block auth flow
      console.error('Failed to update online status', error);
    }
  }, []);

  const sendOfflineBeacon = useCallback((userId) => {
    if (!userId) return;
    const url = `${API_BASE}/api/profiles/${userId}/status`;
    const payload = JSON.stringify({ isOnline: false });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      markStatus(userId, false);
    }
  }, [markStatus]);

  const login = (userData) => {
    // Expecting an object like { _id, username, ... }
    const normalized = typeof userData === 'string' ? { username: userData } : userData;
    const previousUserId = user?._id || user?.id;

    if (previousUserId && previousUserId !== (normalized?._id || normalized?.id)) {
      markStatus(previousUserId, false);
    }

    setUser(normalized);
    try {
      localStorage.setItem('loggedInUser', JSON.stringify(normalized));
    } catch {
      // Fallback to plain string if JSON fails
      localStorage.setItem('loggedInUser', normalized?.username || '');
    }

    const userId = normalized?._id || normalized?.id;
    if (userId) {
      markStatus(userId, true);
    }
  };

  const logout = useCallback(async () => {
    const userId = user?._id || user?.id;

    if (userId) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      } catch (error) {
        console.error('Failed to notify backend about logout', error);
      }

      await markStatus(userId, false);
    }

    setUser(null);
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('token');
  }, [markStatus, user]);

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) return;

    markStatus(userId, true);

    const handleBeforeUnload = () => {
      sendOfflineBeacon(userId);
    };

    const handlePageHide = (event) => {
      if (event.persisted) return;
      sendOfflineBeacon(userId);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendOfflineBeacon(userId);
      } else if (document.visibilityState === 'visible') {
        markStatus(userId, true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [markStatus, sendOfflineBeacon, user]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
