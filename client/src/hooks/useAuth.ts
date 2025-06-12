import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0,
    cacheTime: 0,
  });

  const { data: dashboardAuth, isLoading: isDashboardAuthLoading } = useQuery({
    queryKey: ["/api/dashboard-keys/auth-status"],
    retry: false,
    staleTime: 0,
    cacheTime: 0,
  });

  const isAuthenticated = !!user;
  const hasDashboardKey = !!(dashboardAuth as any)?.authenticated;
  const loadingComplete = !isLoading && !isDashboardAuthLoading;

  // Temporary debug logging
  console.log('Auth Debug:', {
    user: !!user,
    dashboardAuth,
    isAuthenticated,
    hasDashboardKey,
    loadingComplete,
    isLoading,
    isDashboardAuthLoading
  });

  return {
    user,
    isLoading: isLoading || isDashboardAuthLoading,
    isAuthenticated,
    hasDashboardKey,
    dashboardKeyRequired: !isAuthenticated && !hasDashboardKey && loadingComplete,
  };
}