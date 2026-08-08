import { Outlet } from "react-router";
import { ThemeProvider } from "next-themes";
import { Toaster } from "../components/ui/sonner";
import { AuthProvider } from "../contexts/AuthContext";

export function RootLayout() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Outlet />
        </div>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
