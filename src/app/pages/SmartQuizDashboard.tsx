import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, Trophy, Sparkles, CheckCircle, HelpCircle, RefreshCw, 
  Award, Clock, ChevronRight, Zap, Target, Star, Loader2, ArrowRight,
  Brain, BarChart3, Search, Lightbulb, Play
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { api } from "../utils/api";
import { useSessionTracker } from "../hooks/useSessionTracker";
import { toast } from "sonner";
import { Link } from "react-router";

export function SmartQuizDashboard() {
  useSessionTracker("quiz");

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // AI Quiz Generator State
  const [aiTopic, setAiTopic] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Active Quiz Execution State
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [allQuizzes, historyData] = await Promise.all([
        api.quizzes.getAll().catch(() => []),
        api.quizzes.getHistory().catch(() => [])
      ]);
      setQuizzes(allQuizzes);
      setHistory(historyData);
    } catch (err) {
      toast.error("Failed to load quizzes dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const startCourseQuiz = async (courseId: string) => {
    try {
      toast.info("Loading course questions...");
      const data = await api.quizzes.getByCourse(courseId);
      setActiveQuiz(data.quiz);
      setActiveQuestions(data.questions || []);
      setCurrentQIdx(0);
      setUserAnswers({});
      setQuizResult(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to start quiz.");
    }
  };

  const generateAiQuiz = async () => {
    if (!aiTopic.trim()) {
      toast.error("Please enter a topic to generate an AI quiz.");
      return;
    }
    setIsGeneratingAi(true);
    try {
      toast.info(`AI is crafting targeted questions for "${aiTopic}"...`);
      const res = await api.quizzes.generateAiQuiz(aiTopic);
      setActiveQuiz({
        id: "ai-generated",
        title: `AI Knowledge Check: ${res.topic}`,
        description: `Dynamically generated quiz testing core principles of ${res.topic}`,
        pass_score: 70,
        points: 100,
        skill: res.skill
      });
      setActiveQuestions(res.questions.map((q: any, idx: number) => ({ ...q, id: idx + 1 })));
      setCurrentQIdx(0);
      setUserAnswers({});
      setQuizResult(null);
      toast.success("AI Quiz ready! Good luck!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI quiz.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSelectOption = (questionId: number, optionKey: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmittingQuiz(true);

    // If AI generated local quiz without DB quizId
    if (activeQuiz.id === "ai-generated") {
      let correctCount = 0;
      const questionResults = activeQuestions.map((q) => {
        const selected = userAnswers[q.id];
        const isCorrect = selected === q.correct_option;
        if (isCorrect) correctCount++;
        return {
          questionId: q.id,
          question: q.question,
          selectedOption: selected || "Not Answered",
          correctOption: q.correct_option,
          isCorrect,
          explanation: q.explanation,
          options: {
            A: q.option_a,
            B: q.option_b,
            C: q.option_c,
            D: q.option_d
          }
        };
      });

      const total = activeQuestions.length;
      const pct = Math.round((correctCount / total) * 100);
      const passed = pct >= 70;
      const pts = passed ? 100 : Math.round((pct / 100) * 50);

      setQuizResult({
        score: correctCount,
        totalQuestions: total,
        percentage: pct,
        passed,
        passScore: 70,
        pointsAwarded: pts,
        questionResults
      });
      setSubmittingQuiz(false);
      if (passed) {
        toast.success(`🏆 AI Quiz Passed! Score: ${pct}% | +${pts} XP`);
      } else {
        toast.info(`AI Quiz Complete: ${pct}%. Review rationale below!`);
      }
      return;
    }

    try {
      const res = await api.quizzes.submit(activeQuiz.id, userAnswers, activeQuiz.course_id);
      setQuizResult(res);
      loadDashboardData(); // Refresh scores & history
      if (res.passed) {
        toast.success(`🏆 Quiz Passed! Score: ${res.percentage}% | +${res.pointsAwarded} XP`);
      } else {
        toast.info(`Quiz Finished! Score: ${res.percentage}%. Target pass rate is ${res.passScore}%.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quiz.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(quizzes.map(q => q.category).filter(Boolean)))];

  const filteredQuizzes = quizzes.filter(q => {
    const matchesCat = activeCategory === "All" || q.category === activeCategory;
    const matchesSearch = !searchQuery || 
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.skill.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.course_title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalAttempts = history.length;
  const avgScore = totalAttempts > 0 
    ? Math.round(history.reduce((sum, h) => sum + (h.percentage || 0), 0) / totalAttempts) 
    : 0;
  const totalXpEarned = history.reduce((sum, h) => sum + (h.points_awarded || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ── HEADER BANNER ────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-card via-card/70 to-background backdrop-blur-xl p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-primary to-accent border-0 text-primary-foreground font-bold px-3 py-1">
                Smart Quiz Hub 🎯
              </Badge>
              <Badge variant="outline" className="text-xs">
                Course-Specific Learning Check
              </Badge>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
              Interactive Course Quizzes & Skill Assessments
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Master course concepts through high-quality targeted multiple-choice questions, detailed explanations, instant XP rewards, and AI-powered custom quizzes!
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="p-4 rounded-2xl border border-border/40 bg-background/50 backdrop-blur text-center space-y-1">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                <Target className="h-3.5 w-3.5 text-primary" /> Attempted
              </div>
              <div className="text-2xl font-black text-foreground">{totalAttempts}</div>
            </div>

            <div className="p-4 rounded-2xl border border-border/40 bg-background/50 backdrop-blur text-center space-y-1">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-accent" /> Avg Score
              </div>
              <div className="text-2xl font-black text-accent">{avgScore}%</div>
            </div>

            <div className="p-4 rounded-2xl border border-border/40 bg-background/50 backdrop-blur text-center space-y-1">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> Total XP
              </div>
              <div className="text-2xl font-black text-amber-400">+{totalXpEarned}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── ACTIVE QUIZ MODAL / RUNNER VIEW ────────────────────────────────────── */}
      <AnimatePresence>
        {activeQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-card border border-border/80 rounded-3xl p-6 lg:p-8 max-w-3xl w-full shadow-2xl space-y-6 relative overflow-hidden my-8"
            >
              {/* Decorative Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-amber-500" />
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] font-bold">
                      {activeQuiz.skill || "Quiz Mode"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Pass Rate: {activeQuiz.pass_score || 70}%
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-black text-foreground">
                    {activeQuiz.title}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveQuiz(null)}
                  className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </Button>
              </div>

              {/* Quiz Results Screen */}
              {quizResult ? (
                <div className="space-y-6">
                  <div className={`p-6 rounded-2xl border text-center space-y-3 ${
                    quizResult.passed 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}>
                    <div className="text-4xl font-black">
                      {quizResult.passed ? "🎉 Quiz Passed!" : "💪 Keep Learning!"}
                    </div>
                    <div className="text-3xl font-bold">
                      {quizResult.score} / {quizResult.totalQuestions} Correct ({quizResult.percentage}%)
                    </div>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      {quizResult.passed 
                        ? `Outstanding performance! You earned +${quizResult.pointsAwarded} XP towards your skill tree.`
                        : `Target pass rate is ${quizResult.passScore}%. Read the explanations below to strengthen your understanding!`
                      }
                    </p>
                  </div>

                  {/* Detailed Analysis Per Question */}
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    <h4 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-400" /> Question Breakdown & Rationale
                    </h4>
                    {quizResult.questionResults?.map((res: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border space-y-2 text-xs ${
                          res.isCorrect 
                            ? "bg-emerald-500/5 border-emerald-500/20" 
                            : "bg-rose-500/5 border-rose-500/20"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 font-semibold text-foreground">
                          <span>Q{idx + 1}: {res.question}</span>
                          <Badge className={res.isCorrect ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}>
                            {res.isCorrect ? "Correct" : "Incorrect"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className={res.selectedOption === res.correctOption ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            Your Choice: Option {res.selectedOption} ({res.options[res.selectedOption] || "N/A"})
                          </div>
                          <div className="text-emerald-400 font-bold">
                            Correct Answer: Option {res.correctOption} ({res.options[res.correctOption]})
                          </div>
                        </div>
                        {res.explanation && (
                          <p className="text-[11px] text-muted-foreground pt-1.5 border-t border-border/30 italic leading-relaxed">
                            💡 <strong>Explanation:</strong> {res.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={() => {
                        setQuizResult(null);
                        setCurrentQIdx(0);
                        setUserAnswers({});
                      }} 
                      variant="outline"
                      className="flex-1 rounded-xl cursor-pointer"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Retake Quiz
                    </Button>
                    <Button 
                      onClick={() => setActiveQuiz(null)} 
                      className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold cursor-pointer"
                    >
                      Return to Quiz Hub
                    </Button>
                  </div>
                </div>
              ) : activeQuestions.length > 0 ? (
                /* Question Step Runner */
                (() => {
                  const q = activeQuestions[currentQIdx];
                  const totalQ = activeQuestions.length;
                  const selectedOpt = userAnswers[q.id];

                  return (
                    <div className="space-y-6">
                      {/* Step Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                          <span>Question {currentQIdx + 1} of {totalQ}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">{q.difficulty || "Medium"}</Badge>
                        </div>
                        <Progress value={((currentQIdx + 1) / totalQ) * 100} className="h-2 rounded-full" />
                      </div>

                      {/* Question Box */}
                      <div className="p-5 bg-background/60 border border-border/50 rounded-2xl shadow-inner">
                        <h4 className="text-lg font-bold text-foreground leading-relaxed">
                          {q.question}
                        </h4>
                      </div>

                      {/* Options Grid */}
                      <div className="grid gap-3">
                        {["A", "B", "C", "D"].map((key) => {
                          const optionText = q[`option_${key.toLowerCase()}`];
                          if (!optionText) return null;
                          const isSelected = selectedOpt === key;

                          return (
                            <button
                              key={key}
                              onClick={() => handleSelectOption(q.id, key)}
                              className={`w-full text-left p-4 rounded-xl border text-xs font-medium transition-all flex items-center gap-3 cursor-pointer ${
                                isSelected
                                  ? "bg-primary/20 border-primary text-primary font-bold shadow-md shadow-primary/10"
                                  : "bg-card/70 border-border/40 hover:bg-background/80 hover:border-border/80 text-foreground"
                              }`}
                            >
                              <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                              }`}>
                                {key}
                              </span>
                              <span className="flex-1 leading-snug">{optionText}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Navigation Controls */}
                      <div className="flex justify-between items-center pt-4 border-t border-border/40">
                        <Button
                          variant="outline"
                          disabled={currentQIdx === 0}
                          onClick={() => setCurrentQIdx(prev => prev - 1)}
                          className="rounded-xl text-xs cursor-pointer"
                        >
                          Previous Question
                        </Button>

                        {currentQIdx < totalQ - 1 ? (
                          <Button
                            disabled={!selectedOpt}
                            onClick={() => setCurrentQIdx(prev => prev + 1)}
                            className="rounded-xl text-xs bg-primary text-primary-foreground font-bold px-6 cursor-pointer"
                          >
                            Next Question <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        ) : (
                          <Button
                            disabled={submittingQuiz || Object.keys(userAnswers).length === 0}
                            onClick={handleSubmitQuiz}
                            className="rounded-xl text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black px-6 shadow-lg shadow-emerald-500/20 cursor-pointer"
                          >
                            {submittingQuiz ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Submit Quiz & See Results
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No questions loaded for this quiz.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI QUIZ GENERATOR BAR ──────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-gradient-to-r from-card to-card/60 backdrop-blur-md rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground flex items-center gap-2">
              Generate AI Custom Quiz
              <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px] uppercase">Powered by Gemini AI</Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Want to test yourself on a custom topic? Type any concept (e.g. "React Server Components", "Python Asyncio", "SQL Window Functions") to create a 5-question test!
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Input 
            placeholder="Type any skill or topic e.g. Docker Volumes, CSS Grid, Graph Algorithms..."
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateAiQuiz()}
            className="bg-background/60 border-border/50 text-sm rounded-xl py-5 text-foreground"
          />
          <Button 
            onClick={generateAiQuiz}
            disabled={isGeneratingAi || !aiTopic.trim()}
            className="rounded-xl px-6 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold shrink-0 cursor-pointer shadow-md"
          >
            {isGeneratingAi ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Quiz
          </Button>
        </div>
      </Card>

      {/* ── QUIZ BROWSER & HISTORY TABS ────────────────────────────────────────── */}
      <Tabs defaultValue="browse" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-card/70 border border-border/50 rounded-2xl p-1">
            <TabsTrigger value="browse" className="rounded-xl text-xs font-bold px-4 py-2">
              <BookOpen className="h-4 w-4 mr-2" /> Browse Course Quizzes ({quizzes.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl text-xs font-bold px-4 py-2">
              <BarChart3 className="h-4 w-4 mr-2" /> My Quiz Attempts ({history.length})
            </TabsTrigger>
          </TabsList>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search course quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/60 border-border/40 text-xs rounded-xl py-4"
            />
          </div>
        </div>

        {/* ── BROWSE TAB ──────────────────────────────────────────────────────── */}
        <TabsContent value="browse" className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 pb-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  activeCategory === cat 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "border-border/50 hover:bg-muted/10 text-muted-foreground"
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Quizzes Cards Grid */}
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground animate-pulse">Loading course-specific quizzes...</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <Card className="border-border/50 bg-card/40 p-12 text-center space-y-4 rounded-3xl">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <h4 className="text-lg font-bold text-foreground">No course quizzes found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try searching for a different course or use the AI Custom Quiz generator above!
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((qz) => {
                const hasAttempted = qz.best_score !== null && qz.best_score !== undefined;
                const isPassed = hasAttempted && qz.best_score >= (qz.pass_score || 70);

                return (
                  <motion.div
                    key={qz.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-border/50 bg-card/65 backdrop-blur-md rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all h-full flex flex-col justify-between group">
                      <div>
                        {/* Course Thumbnail Banner */}
                        <div 
                          className="h-36 w-full bg-cover bg-center relative border-b border-border/30"
                          style={{ backgroundImage: `url(${qz.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'})` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-black/40 to-transparent" />
                          <div className="absolute top-3 left-3 flex gap-2">
                            <Badge className="bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase">
                              {qz.skill}
                            </Badge>
                            <Badge variant="secondary" className="bg-background/80 text-[10px]">
                              {qz.level}
                            </Badge>
                          </div>
                          {hasAttempted && (
                            <div className="absolute top-3 right-3">
                              <Badge className={isPassed ? "bg-emerald-500 text-white font-bold" : "bg-amber-500 text-white font-bold"}>
                                {isPassed ? `Best: ${qz.best_score}% Passed` : `Best: ${qz.best_score}%`}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <CardHeader className="pb-2 space-y-2">
                          <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                            {qz.title}
                          </CardTitle>
                          <CardDescription className="text-xs line-clamp-2 leading-relaxed">
                            {qz.description}
                          </CardDescription>
                        </CardHeader>
                      </div>

                      <CardContent className="pt-2 space-y-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium border-t border-border/30 pt-3">
                          <span className="flex items-center gap-1">
                            <HelpCircle className="h-3.5 w-3.5 text-primary" />
                            {qz.total_questions || 5} Questions
                          </span>
                          <span className="flex items-center gap-1 font-bold text-amber-400">
                            <Zap className="h-3.5 w-3.5" />
                            +{qz.points || 100} XP
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            onClick={() => startCourseQuiz(qz.course_id)}
                            className="flex-1 rounded-xl text-xs font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                            {hasAttempted ? "Retake Quiz" : "Start Quiz"}
                          </Button>
                          <Link to={`/app/course/${qz.course_id}`}>
                            <Button variant="outline" size="icon" className="rounded-xl border-border/50 cursor-pointer">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
        <TabsContent value="history">
          <Card className="border-border/50 bg-card/60 backdrop-blur-md rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Past Quiz Attempts & Performance History
            </h3>

            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No quiz attempts recorded yet. Take your first quiz above to start tracking performance!
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((h, idx) => {
                  const passed = h.percentage >= 70;
                  return (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl border border-border/40 bg-background/40 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] border-primary/20 text-primary font-bold">
                            {h.skill || "Course Quiz"}
                          </Badge>
                          <span className="font-bold text-foreground text-sm">{h.quiz_title || h.course_title}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Attempted on: {new Date(h.attempted_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className={`font-black text-sm ${passed ? "text-emerald-400" : "text-rose-400"}`}>
                            {h.score} / {h.total_questions} ({h.percentage}%)
                          </div>
                          <div className="text-[10px] text-amber-400 font-bold">
                            +{h.points_awarded} XP
                          </div>
                        </div>
                        <Badge className={passed ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}>
                          {passed ? "Passed" : "Needs Review"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
