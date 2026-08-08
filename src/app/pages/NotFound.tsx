import { Link } from "react-router";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5 p-6">
      <div className="text-center">
        <h1 className="text-9xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">404</h1>
        <h2 className="text-2xl font-bold mt-4 mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/app">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent">
              <Home className="h-5 w-5 mr-2" />
              Go Home
            </Button>
          </Link>
          <Button size="lg" variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
