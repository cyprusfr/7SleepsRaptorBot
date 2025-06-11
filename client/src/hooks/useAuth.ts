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

  return {
    user,
    isLoading: isLoading || isDashboardAuthLoading,
    isAuthenticated: !!user,
    hasDashboardKey: !!(dashboardAuth as any)?.authenticated,
    dashboardKeyRequired: !(dashboardAuth as any)?.authenticated && !isLoading && !isDashboardAuthLoading,
  };
}