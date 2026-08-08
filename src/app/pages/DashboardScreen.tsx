import { Link } from "react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  Clock,
  Target,
  Award,
  BookOpen,
  Code,
  Brain,
  Flame,
  Play,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { App } from "@capacitor/app";
import { api } from "../utils/api";

export function DashboardScreen() {
  const [stats, setStats] = useState({
    points: 0,
    currentLevel: 1,
    streakDays: 1,
    totalSubmissions: 0,
    successfulSubmissions: 0,
    completedModulesCount: 0
  });

  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [skillDistribution, setSkillDistribution] = useState<any[]>([]);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);

  const loadData = async () => {
    try {
      const [progressData, weeklyStats, skills] = await Promise.all([
        api.stats.getProgress(),
        api.stats.getWeeklyProgress(),
        api.stats.getSkillDistribution()
      ]);
      setStats({
        points: progressData?.points ?? 0,
        currentLevel: progressData?.currentLevel ?? progressData?.current_level ?? 1,
        streakDays: progressData?.streakDays ?? progressData?.streak_days ?? 1,
        totalSubmissions: progressData?.totalSubmissions ?? progressData?.total_submissions ?? 0,
        successfulSubmissions: progressData?.successfulSubmissions ?? progressData?.successful_submissions ?? 0,
        completedModulesCount: progressData?.completedModulesCount ?? progressData?.completed_modules_count ?? 0
      });
      setWeeklyData(weeklyStats);
      setSkillDistribution(skills);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setIsLoadingWeekly(false);
      setIsLoadingSkills(false);
    }
  };

  useEffect(() => {
    loadData();

    // Re-fetch when app resumes from background (Capacitor)
    const resumeListener = App.addListener("appRestoredResult", () => {
      loadData();
    });

    return () => {
      resumeListener.then(h => h.remove());
    };
  }, []);

  const handleEnrollPython = async () => {
    try {
      await api.courses.enroll("python-full");
      const skills = await api.stats.getSkillDistribution();
      setSkillDistribution(skills);
    } catch (err) {
      console.error("Enroll error:", err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-8 text-white shadow-xl"
      >
        <div className="relative z-10">
          <Badge className="bg-white/20 text-white border-none mb-3 backdrop-blur">
            Level {stats.currentLevel} Scholar
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Welcome Back! 👋</h1>
          <p className="text-purple-100 max-w-xl">
            You're on a <span className="font-semibold text-white">{stats.streakDays}-day streak</span>! Keep up the momentum and build your software engineering skills.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/app/tutor">
              <Button variant="secondary" className="rounded-xl shadow-md">
                <Brain className="h-4 w-4 mr-2 text-purple-600" /> Start AI Session
              </Button>
            </Link>
            <Link to="/app/code">
              <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-xl">
                <Code className="h-4 w-4 mr-2" /> Open Coding Arena
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Points Earned", value: `${stats.points} XP`, icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Day Streak", value: `${stats.streakDays} Days`, icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Modules Completed", value: stats.completedModulesCount, icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Code Submissions", value: `${stats.successfulSubmissions}/${stats.totalSubmissions}`, icon: Code, color: "text-blue-500", bg: "bg-blue-500/10" }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur hover:shadow-lg transition-all">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="border-border/50 bg-card/80 backdrop-blur h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" /> Weekly Learning Activity
              </CardTitle>
              <CardDescription>Hours spent studying per day this week</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWeekly ? (
                <div className="h-[220px] flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} unit="h" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }}
                        formatter={(val: any) => [`${val} hrs`, "Study Time"]}
                      />
                      <Area type="monotone" dataKey="hours" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorHours)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Skill Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-border/50 bg-card/80 backdrop-blur h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Skill Distribution</CardTitle>
                <CardDescription>Real-time enrolled course tracks</CardDescription>
              </div>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                Live Tracking
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoadingSkills ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-2 w-full bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : skillDistribution.length > 0 ? (
                <div className="space-y-4">
                  {skillDistribution.map((skill) => (
                    <div key={skill.name} className="space-y-1.5 p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{skill.name}</span>
                          {skill.completed > 0 && (
                            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-medium">
                              {skill.completed}/{skill.total} done
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-primary">{skill.value}%</span>
                      </div>
                      <Progress value={skill.value} className="h-2.5 rounded-full bg-secondary" style={{ "--progress-color": skill.color || "#8b5cf6" } as React.CSSProperties} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-44 text-center space-y-3">
                  <Target className="h-8 w-8 text-primary opacity-40 animate-bounce" />
                  <p className="text-sm text-muted-foreground">
                    Enroll in a course track to monitor skill proficiency.
                  </p>
                  <Button 
                    size="sm" 
                    onClick={handleEnrollPython}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-md transition-all"
                  >
                    <Play className="h-4 w-4 mr-1.5" /> Track Python Course
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/app/tutor">
            <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-accent/10 hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="p-6 text-center">
                <Brain className="h-8 w-8 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                <p className="font-medium">Ask AI Tutor</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/app/code">
            <Card className="border-border/50 bg-gradient-to-br from-accent/10 to-primary/10 hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="p-6 text-center">
                <Code className="h-8 w-8 mx-auto mb-2 text-accent group-hover:scale-110 transition-transform" />
                <p className="font-medium">Practice Code</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
