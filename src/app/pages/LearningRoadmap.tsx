import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Target, Sparkles, BookOpen, ChevronRight, CheckCircle2, 
  MapPin, Clock, Brain, Code, Palette, MessageSquare, 
  Briefcase, Loader2, HelpCircle 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { api } from "../utils/api";
import { toast } from "sonner";

interface RoadmapWeek {
  week: number;
  topic: string;
  detail: string;
  steps?: string[];
}

interface Roadmap {
  title: string;
  description: string;
  weeks: RoadmapWeek[];
}

const ROADMAP_LINKS = [
  { id: "programming", name: "Programming Essentials", icon: Code, color: "from-blue-500 to-cyan-500" },
  { id: "aiml", name: "AI & Machine Learning", icon: Brain, color: "from-purple-500 to-pink-500" },
  { id: "webdev", name: "Web Development", icon: BookOpen, color: "from-emerald-500 to-teal-500" },
  { id: "communication", name: "Professional Comm", icon: MessageSquare, color: "from-orange-500 to-amber-500" },
  { id: "aptitude", name: "Quantitative Aptitude", icon: Target, color: "from-pink-500 to-rose-500" },
  { id: "interview", name: "Interview Preparation", icon: Briefcase, color: "from-indigo-500 to-violet-500" },
  { id: "uiux", name: "UI/UX Design", icon: Palette, color: "from-fuchsia-500 to-pink-500" },
  { id: "career", name: "Career Guidance", icon: HelpCircle, color: "from-cyan-500 to-blue-500" }
];

export function LearningRoadmap() {
  const { skill } = useParams<{ skill: string }>();
  const navigate = useNavigate();
  
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedWeeks, setCompletedWeeks] = useState<Record<string, number[]>>({});
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"courses" | "domains">("courses");

  const activeSkillId = skill || "python-full";

  // Load all available courses for course-specific roadmaps
  useEffect(() => {
    async function loadCourses() {
      try {
        const list = await api.courses.getAll();
        if (Array.isArray(list)) {
          setCourses(list);
        }
      } catch (e) {}
    }
    loadCourses();
  }, []);

  // Load roadmap data for active skill or course
  useEffect(() => {
    async function loadRoadmapData() {
      setIsLoading(true);
      try {
        const data = await api.courses.getRoadmap(activeSkillId);
        if (data && data.weeks) {
          setRoadmap(data);
        } else {
          throw new Error("No roadmap data");
        }
      } catch (err: any) {
        // Fallback default roadmap
        setRoadmap({
          title: "Programming Essentials & DSA Roadmap",
          description: "Master core computer science fundamentals, Data Structures, Algorithms and Problem Solving.",
          weeks: [
            { week: 1, topic: "Week 1: Foundations & Control Flow", detail: "Variables, primitive data types, control flow, memory stack frames.", steps: ["Control structures & loops", "Function scope & variables", "First working programs"] },
            { week: 2, topic: "Week 2: Data Structures & Algorithms", detail: "Arrays, lists, dictionaries, search algorithms & complexity.", steps: ["Array operations", "Linear & Binary Search", "Functions & recursion"] },
            { week: 3, topic: "Week 3: Object-Oriented Programming", detail: "Classes, objects, encapsulation, inheritance, polymorphism.", steps: ["Class design", "Inheritance patterns", "Modular code architecture"] },
            { week: 4, topic: "Week 4: Advanced Concepts & APIs", detail: "Asynchronous operations, error handling, parsing data.", steps: ["Async/await & promises", "Error management", "API data integration"] },
            { week: 5, topic: "Week 5: System Design & Project Building", detail: "Constructing full project architecture and module integrations.", steps: ["Database connection", "API service structure", "Testing & debugging"] },
            { week: 6, topic: "Week 6: Deployment & Capstone", detail: "Production deployment, optimization, final project presentation.", steps: ["Code refactoring", "CI/CD setup", "Capstone project"] }
          ]
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadRoadmapData();
  }, [activeSkillId]);

  // Load completed weeks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("completed_weeks_log");
    if (saved) {
      try {
        setCompletedWeeks(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const toggleWeekCompleted = (weekNum: number) => {
    const log = { ...completedWeeks };
    if (!log[activeSkillId]) {
      log[activeSkillId] = [];
    }

    if (log[activeSkillId].includes(weekNum)) {
      log[activeSkillId] = log[activeSkillId].filter(w => w !== weekNum);
      toast.info(`Week ${weekNum} marked incomplete.`);
    } else {
      log[activeSkillId].push(weekNum);
      toast.success(`Congratulations! Week ${weekNum} completed! 🔥 +100 XP`);
    }

    setCompletedWeeks(log);
    localStorage.setItem("completed_weeks_log", JSON.stringify(log));
  };

  const getCompletedCount = () => {
    return (completedWeeks[activeSkillId] || []).length;
  };

  const isWeekDone = (weekNum: number) => {
    return (completedWeeks[activeSkillId] || []).includes(weekNum);
  };

  const totalWeeks = roadmap?.weeks?.length || 6;
  const progressPercent = (getCompletedCount() / totalWeeks) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent flex items-center gap-2">
            <Target className="h-8 w-8 text-primary animate-pulse" />
            Course-Specific & Skill Roadmaps
          </h1>
          <p className="text-muted-foreground text-sm">
            Structured week-by-week curricula dynamically compiled for every particular course in your academy.
          </p>
        </div>
        <Badge variant="outline" className="border-accent/40 bg-accent/5 text-accent text-xs font-semibold px-3 py-1">
          Interactive Course Blueprints
        </Badge>
      </div>

      {/* Grid Layout: Sidebar Navigation + Main Timeline */}
      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Left Side: Roadmap Selection Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="border-border/50 bg-card/65 backdrop-blur-md p-4 rounded-3xl space-y-3">
            {/* Sidebar Tab Switching: Particular Courses vs Skill Domains */}
            <div className="grid grid-cols-2 p-1 bg-muted/40 rounded-xl gap-1 text-[11px] font-bold">
              <button
                onClick={() => setActiveTab("courses")}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "courses" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Particular Courses
              </button>
              <button
                onClick={() => setActiveTab("domains")}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "domains" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Skill Domains
              </button>
            </div>

            {activeTab === "courses" ? (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                  Select Particular Course Roadmap
                </h3>
                {courses.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">Loading courses...</div>
                ) : (
                  courses.map((c) => {
                    const isActive = activeSkillId === c.id || activeSkillId === c.skill?.toLowerCase();
                    const completedCount = (completedWeeks[c.id] || []).length;

                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/app/roadmap/${c.id}`)}
                        className={`w-full text-left p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 relative group border ${
                          isActive 
                            ? "bg-gradient-to-br from-primary/15 to-accent/15 border-primary text-primary font-bold shadow-sm" 
                            : "bg-transparent border-transparent hover:bg-accent/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img 
                            src={c.thumbnail} 
                            alt={c.title} 
                            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border/40" 
                          />
                          <div className="min-w-0">
                            <p className="text-xs truncate font-semibold">{c.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{c.skill} • {c.level}</p>
                          </div>
                        </div>
                        {completedCount > 0 && (
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/20 text-[9px] border-0 shrink-0">
                            {completedCount}/6
                          </Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                  Select Domain Blueprint
                </h3>
                {ROADMAP_LINKS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSkillId === item.id;
                  const completedCount = (completedWeeks[item.id] || []).length;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/app/roadmap/${item.id}`)}
                      className={`w-full text-left p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 relative group border ${
                        isActive 
                          ? "bg-gradient-to-br from-primary/15 to-accent/15 border-primary text-primary font-bold" 
                          : "bg-transparent border-transparent hover:bg-accent/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl bg-gradient-to-br ${isActive ? item.color : "bg-muted/50"} text-white shadow shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs truncate">{item.name}</span>
                      </div>
                      {completedCount > 0 && (
                        <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/20 text-[9px] border-0">
                          {completedCount}/6
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Week-by-Week Roadmap Timeline */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center min-h-[300px]"
              >
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </motion.div>
            ) : !roadmap ? (
              <motion.div 
                key="notfound"
                className="text-center py-12"
              >
                <HelpCircle className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <p className="text-muted-foreground text-sm mt-2">Roadmap blueprint not configured in backend.</p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Active Roadmap Info Banner */}
                <Card className="relative overflow-hidden border border-border/50 bg-gradient-to-r from-card to-card/60 backdrop-blur p-6 rounded-3xl shadow-xl">
                  <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                  <div className="relative z-10 space-y-3">
                    <Badge className="bg-gradient-to-r from-primary to-accent border-0">6-WEEK BLUEPRINT</Badge>
                    <h2 className="text-2xl font-black">{roadmap.title}</h2>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">{roadmap.description}</p>
                    
                    {/* Progress tracking */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
                      <div className="space-y-2 w-full max-w-md">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-muted-foreground uppercase tracking-wider">Milestone Progress</span>
                          <span className="text-primary font-extrabold">
                            {getCompletedCount()} / {totalWeeks} Weeks completed ({Math.round(progressPercent)}%)
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                      </div>

                      {(roadmap as any)?.course_id && (
                        <Button 
                          onClick={() => navigate(`/app/course/${(roadmap as any).course_id}`)}
                          className="bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                        >
                          <BookOpen className="h-4 w-4" />
                          Open Course & Lessons
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Week-by-Week Interactive Timeline Connector */}
                <div className="relative pl-8 sm:pl-10 space-y-6 pt-2">
                  {/* Glowing Vertical Connector Line */}
                  <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary via-accent to-secondary/35 opacity-40 shadow-glow" />

                  {roadmap.weeks.map((week, idx) => {
                    const done = isWeekDone(week.week);
                    return (
                      <motion.div
                        key={week.week}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="relative group"
                      >
                        {/* Timeline Node Bubble indicator */}
                        <div 
                          onClick={() => toggleWeekCompleted(week.week)}
                          className={`absolute -left-8 sm:-left-9 top-1.5 h-8 w-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 z-10 hover:scale-110 shadow-md ${
                            done
                              ? "bg-green-500 border-green-400 text-white animate-glow"
                              : "bg-card border-border/80 text-muted-foreground hover:border-primary/60 hover:text-primary"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 fill-current" />
                          ) : (
                            <span className="text-[10px] font-extrabold">{week.week}</span>
                          )}
                        </div>

                        {/* Timeline Content Card */}
                        <Card className={`border-border/50 bg-card/65 backdrop-blur-md transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-md ${
                          done ? "border-green-500/25 bg-green-500/[0.01]" : ""
                        }`}>
                          <CardHeader className="p-5 flex flex-row justify-between items-start gap-4 space-y-0">
                            <div>
                              <div className="flex gap-2 items-center">
                                <Badge variant="outline" className={`text-[8px] tracking-wider font-extrabold uppercase py-0 ${
                                  done ? "border-green-500/20 text-green-500 bg-green-500/5" : "border-primary/20 text-primary bg-primary/5"
                                }`}>
                                  WEEK {week.week}
                                </Badge>
                                {done && <span className="text-[9px] font-bold text-green-500 flex items-center gap-0.5">🔥 Verified Done</span>}
                              </div>
                              <CardTitle className="text-base font-extrabold leading-tight mt-1.5 group-hover:text-primary transition-colors">
                                {week.topic}
                              </CardTitle>
                              <CardDescription className="text-xs leading-relaxed mt-2 text-muted-foreground/80 font-normal">
                                {week.detail}
                              </CardDescription>

                              {week.steps && week.steps.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Key Learning Steps:</p>
                                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {week.steps.map((step, sIdx) => (
                                      <li key={sIdx} className="flex items-start gap-2 text-[11px] text-foreground/70 bg-muted/30 p-2 rounded-lg border border-border/40">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        {step}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleWeekCompleted(week.week)}
                              className={`rounded-xl text-[10px] font-bold h-8 shrink-0 cursor-pointer ${
                                done 
                                  ? "border-green-500/20 bg-green-500/10 text-green-500 hover:bg-green-500/20" 
                                  : "border-border hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {done ? "Complete" : "Mark Done"}
                            </Button>
                          </CardHeader>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
