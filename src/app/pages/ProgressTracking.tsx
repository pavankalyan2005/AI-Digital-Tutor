import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import {
  Calendar, TrendingUp, Award, Clock, Target, BookOpen,
  Code, Brain, Flame, Zap, RefreshCw, Play, CheckCircle2,
  GraduationCap, BarChart3, Activity
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend
} from "recharts";
import { api } from "../utils/api";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────
interface DashStats {
  points: number;
  current_level: number;
  streak_days: number;
  enrolled_courses: number;
  completed_modules: number;
  total_study_hours: number;
}

interface WeeklyEntry { day: string; hours: number; courses: number; }
interface SkillEntry  { skill: string; score: number; completed: number; total: number; }
interface CourseEntry {
  id: string; title: string; skill: string; thumbnail: string; level: string;
  total_modules: number; completed_modules: number;
  completion_percent: number; study_hours: number; last_studied: string;
}

const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#f97316"];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "rgba(10,10,20,0.92)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: "12px",
    color: "#e2e8f0",
  }
};

// ── Stat Card Component ────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color, progress, delay = 0
}: {
  label: string; value: string | number; sub: string;
  icon: any; color: string; progress?: number; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden relative">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-10 rounded-full blur-2xl`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <div className={`p-2 rounded-xl bg-gradient-to-br ${color} text-white shadow`}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black mb-1">{value}</div>
          {progress !== undefined && <Progress value={progress} className="h-1.5 mb-2" />}
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function ProgressTracking() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyEntry[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [enrolled, setEnrolled] = useState<CourseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = async () => {
    try {
      const [dashStats, weeklyData, skillData, enrolledData] = await Promise.all([
        api.get("/api/progress/dashboard-stats"),
        api.stats.getWeeklyProgress(),
        api.stats.getSkillDistribution(),
        api.get("/api/progress/enrolled-courses"),
      ]);
      setStats(dashStats);
      setWeekly(weeklyData);
      setSkills(skillData);
      setEnrolled(enrolledData);
      setLastRefresh(new Date());
    } catch (err: any) {
      toast.error("Failed to load progress data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // Auto-refresh every 30 seconds for real-time feel
    intervalRef.current = setInterval(loadAll, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const totalWeeklyHours = weekly.reduce((s, d) => s + d.hours, 0).toFixed(1);

  // Skill pie data from enrolled courses (non-zero skills)
  const skillPie = skills.filter(s => s.total > 0).map((s, i) => ({
    name: s.skill,
    value: s.total,
    color: COLORS[i % COLORS.length]
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Real-Time Progress
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live tracking · Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button
          onClick={() => { setIsLoading(true); loadAll(); }}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 rounded-xl border-primary/30 hover:bg-primary/10"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      {isLoading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-card/40 border-border/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Study Hours" icon={Clock}
            value={`${stats?.total_study_hours ?? 0}h`}
            sub={`${totalWeeklyHours}h this week`}
            color="from-primary to-violet-600"
            progress={Math.min(100, Number(stats?.total_study_hours ?? 0) / 2)}
            delay={0}
          />
          <StatCard
            label="Courses Enrolled" icon={BookOpen}
            value={stats?.enrolled_courses ?? 0}
            sub={`${enrolled.filter(e => e.completion_percent === 100).length} fully completed`}
            color="from-accent to-teal-500"
            progress={(enrolled.filter(e => e.completion_percent === 100).length / Math.max(1, stats?.enrolled_courses ?? 1)) * 100}
            delay={0.05}
          />
          <StatCard
            label="Modules Completed" icon={CheckCircle2}
            value={stats?.completed_modules ?? 0}
            sub="videos watched to completion"
            color="from-green-500 to-emerald-600"
            delay={0.1}
          />
          <StatCard
            label="Current Level" icon={GraduationCap}
            value={`Lvl ${stats?.current_level ?? 1}`}
            sub={`${stats?.points ?? 0} XP total`}
            color="from-yellow-500 to-orange-500"
            progress={(((stats?.points ?? 0) % 500) / 500) * 100}
            delay={0.15}
          />
          <StatCard
            label="Study Streak" icon={Flame}
            value={`${stats?.streak_days ?? 0} days`}
            sub="Keep it going 🔥"
            color="from-rose-500 to-pink-600"
            delay={0.2}
          />
          <StatCard
            label="Skills Tracked" icon={Brain}
            value={skills.length}
            sub={`across ${skills.length} tech domains`}
            color="from-purple-500 to-indigo-600"
            delay={0.25}
          />
        </div>
      )}

      {/* Charts Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="bg-card/60 border border-border/40 rounded-xl p-1">
          <TabsTrigger value="activity" className="rounded-lg">📈 Weekly Activity</TabsTrigger>
          <TabsTrigger value="skills" className="rounded-lg">🧠 Skill Map</TabsTrigger>
          <TabsTrigger value="courses" className="rounded-lg">📚 My Courses</TabsTrigger>
        </TabsList>

        {/* ── Weekly Activity Tab ── */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Daily Study Hours
                </CardTitle>
                <CardDescription>Hours you spent learning each day this week</CardDescription>
              </CardHeader>
              <CardContent>
                {weekly.every(d => d.hours === 0) ? (
                  <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <BarChart3 className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Start watching courses to see your activity here</p>
                    <Link to="/app/skills">
                      <Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-accent">
                        <Play className="h-4 w-4 mr-2" /> Browse Courses
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={weekly}>
                      <defs>
                        <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="#888" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#888" tick={{ fontSize: 12 }} unit="h" />
                      <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}h`, "Study Time"]} />
                      <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3}
                        fillOpacity={1} fill="url(#hoursGrad)" dot={{ fill: "#6366f1", r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" /> Hours Spent Studying per Day
                </CardTitle>
                <CardDescription>Total study hours recorded per day this week</CardDescription>
              </CardHeader>
              <CardContent>
                {weekly.every(d => (d.hours || 0) === 0) ? (
                  <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Clock className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No study activity recorded yet this week</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="#888" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#888" tick={{ fontSize: 12 }} unit="h" />
                      <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} hrs`, "Study Time"]} />
                      <Bar dataKey="hours" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                        {weekly.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Skill Map Tab ── */}
        <TabsContent value="skills">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" /> Skill Proficiency Radar
                </CardTitle>
                <CardDescription>Completion % across each tech domain you've enrolled in</CardDescription>
              </CardHeader>
              <CardContent>
                {skills.length === 0 ? (
                  <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Target className="h-10 w-10 opacity-30" />
                    <p className="text-sm text-center">Enroll in a course to start tracking your skill progress</p>
                    <Link to="/app/skills">
                      <Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-accent">
                        <Play className="h-4 w-4 mr-2" /> Explore Courses
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={skills}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="skill" stroke="#888" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#555" tickCount={4} />
                      <Radar name="Completion %" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                      <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}%`, "Completion"]} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" /> Skill Distribution
                </CardTitle>
                <CardDescription>Breakdown of modules across enrolled skill categories</CardDescription>
              </CardHeader>
              <CardContent>
                {skillPie.length === 0 ? (
                  <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Award className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No skill data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={skillPie} cx="50%" cy="50%" outerRadius={110}
                        dataKey="value" nameKey="name" label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        } labelLine={false}>
                        {skillPie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} formatter={(v: any) => [v, "Modules"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── My Courses Tab ── */}
        <TabsContent value="courses">
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" /> Enrolled Courses
              </CardTitle>
              <CardDescription>Your real-time course completion and study time</CardDescription>
            </CardHeader>
            <CardContent>
              {enrolled.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-4">
                  <GraduationCap className="h-14 w-14 opacity-25" />
                  <h3 className="font-semibold text-lg">No courses enrolled yet</h3>
                  <p className="text-sm text-center max-w-sm">
                    Open any course and start watching — you'll be automatically enrolled and your progress tracked here.
                  </p>
                  <Link to="/app/skills">
                    <Button className="rounded-xl bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25">
                      <Play className="h-4 w-4 mr-2" /> Browse 52 Courses
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrolled.map((course, i) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link to={`/app/course/${course.id}`}>
                        <div className="group p-4 rounded-2xl border border-border/40 bg-background/40 hover:border-primary/40 hover:bg-background/70 transition-all flex items-center gap-4">
                          {/* Thumbnail */}
                          <div
                            className="h-14 w-20 rounded-xl bg-cover bg-center shrink-0 border border-border/20"
                            style={{ backgroundImage: `url(${course.thumbnail})` }}
                          />
                          {/* Info */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                {course.title}
                              </h4>
                              <Badge variant="outline" className="text-[9px] shrink-0 border-primary/20 text-primary bg-primary/5">
                                {course.level}
                              </Badge>
                              {course.completion_percent === 100 && (
                                <Badge className="text-[9px] shrink-0 bg-green-500/20 text-green-500 border-green-500/20">
                                  ✅ Done
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                {course.completed_modules}/{course.total_modules} modules
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-accent" />
                                {course.study_hours}h studied
                              </span>
                              <span className="text-muted-foreground/60">
                                {course.last_studied
                                  ? `Last: ${new Date(course.last_studied).toLocaleDateString()}`
                                  : "Not started"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={course.completion_percent} className="h-1.5 flex-1" />
                              <span className="text-xs font-bold text-primary shrink-0">
                                {course.completion_percent}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
