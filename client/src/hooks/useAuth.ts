import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: dashboardAuth, isLoading: isDashboardAuthLoading } = useQuery({
    queryKey: ["/api/dashboard-keys/auth-status"],
    retry: false,
  });

  const isAuthenticated = !!user;
  const hasDashboardKey = !!(dashboardAuth as any)?.authenticated;
  const loadingComplete = !isLoading && !isDashboardAuthLoading;

  return {
    user,
    isLoading: isLoading || isDashboardAuthLoading,
    isAuthenticated,
    hasDashboardKey,
    dashboardKeyRequired: !isAuthenticated && !hasDashboardKey && loadingComplete,
  };
}