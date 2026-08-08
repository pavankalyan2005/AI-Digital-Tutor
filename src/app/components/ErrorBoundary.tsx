import { useRouteError, useNavigate } from "react-router";
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";
import { Button } from "./ui/button";

export function ErrorBoundary() {
  const error: any = useRouteError();
  const navigate = useNavigate();

  console.error("Application Error Boundary caught error:", error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-6">
      <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="inline-block p-4 rounded-2xl bg-destructive/10 text-destructive mb-4">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">
          An unexpected error occurred. You can reload the application or return to the login screen.
        </p>
        {error?.message && (
          <code className="text-xs block bg-black/30 text-destructive p-3 rounded-xl mb-6 text-left break-all max-h-32 overflow-y-auto">
            {error.message || String(error)}
          </code>
        )}
        <div className="flex gap-3">
          <Button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gradient-to-r from-primary to-accent"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className="flex-1"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
