import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useState } from "react";
import {
  Home,
  BookOpen,
  Bot,
  TrendingUp,
  User,
  Code,
  Target,
  Users,
  Award,
  Briefcase,
  Settings,
  Menu,
  X,
  Sparkles,
  Brain,
  MessageSquare,
  Calendar,
  Bell,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { path: "/app", icon: Home, label: "Home" },
  { path: "/app/skills", icon: BookOpen, label: "Learn" },
  { path: "/app/ai-tutor", icon: Bot, label: "AI Tutor" },
  { path: "/app/progress", icon: TrendingUp, label: "Progress" },
];

const sidebarItems = [
  { path: "/app", icon: Home, label: "Dashboard" },
  { path: "/app/skills", icon: BookOpen, label: "Courses" },
  { path: "/app/roadmap/ai", icon: Target, label: "Roadmaps" },
  { path: "/app/projects", icon: Code, label: "Projects" },
  { path: "/app/ai-tutor", icon: Brain, label: "AI Mentor" },
  { path: "/app/goals", icon: Target, label: "Goals" },
  { path: "/app/admin", icon: ShieldCheck, label: "Admin Panel" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const userName = user?.full_name || user?.profile?.full_name || "there";
  const userInitials = userName === "there" ? "U" : userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const userLevel = user?.profile?.current_level || 1;

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          border-r border-border/50 backdrop-blur-xl
          bg-gradient-to-b from-card/95 via-card/90 to-card/95
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-xl blur-lg opacity-50" />
                <div className="relative bg-gradient-to-r from-primary to-accent p-2.5 rounded-xl">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  AI Digital Tutor
                </h1>
                <p className="text-xs text-muted-foreground">Learn Smarter</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {sidebarItems
              .filter((item) => item.path !== "/app/admin" || user?.role === "admin")
              .map((item) => {
                const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200 group
                    ${
                      isActive
                        ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "" : "group-hover:scale-110 transition-transform"}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/10 backdrop-blur-sm">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={user?.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'user'}`} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground">Level {userLevel} Learner</p>
              </div>
              <Badge variant="secondary" className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">
                {userLevel >= 10 ? "Pro" : "Basic"}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <div className="hidden md:block">
              <h2 className="font-semibold text-foreground">Welcome back, {userName.split(" ")[0]}! 👋</h2>
              <p className="text-sm text-muted-foreground">Continue your learning journey</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/app/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full ring-2 ring-card" />
              </Button>
            </Link>

            <Link to="/app/ai-tutor">
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Ask AI</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Log Out"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">Log Out</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden border-t border-border/50 bg-card/95 backdrop-blur-xl">
          <div className="flex items-center justify-around px-4 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center gap-1 min-w-0"
                >
                  <div
                    className={`
                      p-2 rounded-xl transition-all
                      ${
                        isActive
                          ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20"
                          : "text-muted-foreground"
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs truncate ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
