import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Target,
  Plus,
  Calendar,
  Trash2,
  CheckCircle2,
  Circle,
  Trophy,
  Loader2,
  AlertCircle
} from "lucide-react";
import { api } from "../utils/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

interface Goal {
  id: number;
  goal_text: string;
  target_date: string;
  completed: number;
}

export function GoalTracking() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await api.stats.getGoals();
      setGoals(data);
    } catch (err) {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;

    try {
      setIsSubmitting(true);
      const goal = await api.stats.addGoal(newGoal, targetDate);
      setGoals([goal, ...goals]);
      setNewGoal("");
      setTargetDate("");
      toast.success("Goal added successfully!");
    } catch (err) {
      toast.error("Failed to add goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGoal = async (id: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      await api.stats.updateGoal(id, newStatus === 1);
      setGoals(goals.map(g => g.id === id ? { ...g, completed: newStatus } : g));
      if (newStatus === 1) {
        toast.success("Goal completed! Great job! 🎉");
      }
    } catch (err) {
      toast.error("Failed to update goal");
    }
  };

  const deleteGoal = async (id: number) => {
    try {
      await api.stats.deleteGoal(id);
      setGoals(goals.filter(g => g.id !== id));
      toast.success("Goal deleted");
    } catch (err) {
      toast.error("Failed to delete goal");
    }
  };

  const completedCount = goals.filter(g => g.completed === 1).length;
  const completionRate = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Learning Goals
          </h1>
          <p className="text-muted-foreground mt-1">Track your progress and stay focused on your learning journey.</p>
        </div>
        <div className="flex items-center gap-4 bg-card/50 backdrop-blur border rounded-2xl p-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{completedCount}/{goals.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{completionRate}%</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Rate</p>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Set New Goal</CardTitle>
              <CardDescription>What do you want to achieve?</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Goal Description</label>
                  <Input
                    placeholder="e.g. Finish React course"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    className="bg-background"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Date (Optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>
                </div>
                <Button className="w-full" type="submit" disabled={isSubmitting || !newGoal.trim()}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Goal
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${completionRate >= 50 ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Consistency Master</p>
                  <p className="text-xs text-muted-foreground">Reach 50% completion rate</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${completedCount >= 5 ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Goal Setter</p>
                  <p className="text-xs text-muted-foreground">Complete 5 learning goals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold">Your Tasks</h3>
            <Badge variant="outline" className="font-mono">
              {goals.length} Total
            </Badge>
          </div>

          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p>Loading your goals...</p>
              </div>
            ) : goals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-card/50 border-2 border-dashed rounded-3xl"
              >
                <div className="p-4 bg-muted rounded-full">
                  <Target className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium">No goals set yet</p>
                  <p className="text-sm text-muted-foreground">Start by adding your first learning objective!</p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {goals.map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`group transition-all hover:shadow-md ${goal.completed ? 'bg-muted/30 border-none' : 'bg-card'}`}>
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={() => toggleGoal(goal.id, goal.completed)}
                            className={`p-1 rounded-full transition-colors ${goal.completed ? 'text-green-500' : 'text-muted-foreground hover:text-primary'}`}
                          >
                            {goal.completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                          </button>
                          <div className="flex-1">
                            <p className={`font-medium transition-all ${goal.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {goal.goal_text}
                            </p>
                            {goal.target_date && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {!loading && goals.length > 0 && (
            <Card className="bg-card/50 border-none mt-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Overall Completion Progress</span>
                  <span className="font-bold text-primary">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
