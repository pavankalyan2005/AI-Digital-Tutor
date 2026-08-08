import { Link } from "react-router";
import { motion } from "motion/react";
import { Mail, ArrowLeft, Shield } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function ForgotPasswordScreen() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 mb-4">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Reset Password</h3>
            <p className="text-muted-foreground">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30"
            >
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
