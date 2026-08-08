import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/AuthContext";

export function RequireAdmin() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Redirect non-admins or unauthenticated users away from Admin Panel
  if (!user || user.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
