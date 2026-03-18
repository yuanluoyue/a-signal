import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, getUser, setUser as setAuthUser, removeUser, getToken } from '@/utils/auth';
import { authApi } from '@/services/auth';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化时从本地存储获取用户信息
  useEffect(() => {
    const initUser = async () => {
      const token = getToken();
      console.log('[UserContext] Init, token exists:', !!token);
      if (token) {
        // 尝试从本地获取缓存的用户信息
        const cachedUser = getUser();
        console.log('[UserContext] Cached user:', cachedUser);
        if (cachedUser) {
          setUserState(cachedUser);
        }
        
        // 异步获取最新的用户信息
        try {
          console.log('[UserContext] Fetching fresh user data...');
          const freshUser = await authApi.getMe();
          console.log('[UserContext] Fresh user data:', freshUser);
          setUserState(freshUser);
          setAuthUser(freshUser, !!localStorage.getItem('a_signal_remember'));
        } catch (error) {
          console.error('[UserContext] Failed to refresh user:', error);
        }
      }
      setLoading(false);
    };

    initUser();
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      setAuthUser(newUser, !!localStorage.getItem('a_signal_remember'));
    } else {
      removeUser();
    }
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authApi.getMe();
      setUserState(freshUser);
      setAuthUser(freshUser, !!localStorage.getItem('a_signal_remember'));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  const logout = () => {
    setUserState(null);
    removeUser();
    localStorage.removeItem('a_signal_token');
    sessionStorage.removeItem('a_signal_token');
    localStorage.removeItem('a_signal_remember');
    // 注意：不清空 rememberedCredentials，以便下次自动填充
  };

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
