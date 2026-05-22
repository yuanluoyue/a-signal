const TOKEN_KEY = 'a_signal_token';
const USER_KEY = 'a_signal_user';
const REMEMBER_KEY = 'a_signal_remember';

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarSeed?: string;
  role?: string;
}

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string, remember: boolean = false): void => {
  if (remember) {
    // 记住登录时，存储到 localStorage
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, 'true');
  } else {
    // 不记住登录时，只存储到 sessionStorage
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(REMEMBER_KEY);
  }
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
};

export const getUser = (): User | null => {
  // 优先从 localStorage 获取，如果没有则从 sessionStorage 获取
  const userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const setUser = (user: User, remember: boolean = false): void => {
  const userStr = JSON.stringify(user);
  // 同时存储到 localStorage 和 sessionStorage，确保刷新页面后数据不丢失
  localStorage.setItem(USER_KEY, userStr);
  if (!remember) {
    // 如果不记住登录，标记为 session 模式
    sessionStorage.setItem(USER_KEY, userStr);
  }
};

export const removeUser = (): void => {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem('a_signal_remember_email');
  localStorage.removeItem('a_signal_remember_password');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const logout = (): void => {
  removeToken();
  removeUser();
};

export const getRememberedEmail = (): string | null => {
  return localStorage.getItem('a_signal_remember_email');
};

export const setRememberedEmail = (email: string): void => {
  localStorage.setItem('a_signal_remember_email', email);
};

export const removeRememberedEmail = (): void => {
  localStorage.removeItem('a_signal_remember_email');
};
