import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type AppRoute = 'home' | 'mods' | 'backups' | 'admin' | 'settings';

interface RouteContextValue {
  route: AppRoute;
  navigate: (route: AppRoute) => void;
}

const RouteContext = createContext<RouteContextValue | null>(null);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<AppRoute>('home');

  const navigate = useCallback((newRoute: AppRoute) => {
    setRoute(newRoute);
  }, []);

  return (
    <RouteContext.Provider value={{ route, navigate }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute(): RouteContextValue {
  const ctx = useContext(RouteContext);
  if (!ctx) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return ctx;
}
