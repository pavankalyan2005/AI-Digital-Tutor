import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Show a blank screen or loader while checking session
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If logged in, render the protected content
  return <Outlet />;
}
