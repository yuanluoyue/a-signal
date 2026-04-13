import React from 'react';
import { RuntimeConfig } from 'umi';
import { isAuthenticated } from '@/utils/auth';
import { UserProvider } from '@/contexts/UserContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import '@/global.scss';

export const onRouteChange: RuntimeConfig['onRouteChange'] = ({ location }) => {
  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.includes(location.pathname);
  const authenticated = isAuthenticated();

  if (!authenticated && !isPublicPath) {
    window.location.href = '/login';
    return;
  }

  if (authenticated && isPublicPath) {
    window.location.href = '/dashboard';
    return;
  }
};

export const rootContainer: RuntimeConfig['rootContainer'] = (container) => {
  return (
    <ErrorBoundary>
      <UserProvider>{container}</UserProvider>
    </ErrorBoundary>
  );
};
