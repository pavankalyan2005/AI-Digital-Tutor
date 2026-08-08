import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, SlidersHorizontal, Clock, Play, BookOpen,
  Sparkles, ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { api } from "../utils/api";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  image_url: string;
  duration: string;
  modules_count: number;
}


export function SkillCategories() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [selectedPrice, setSelectedPrice] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const coursesData = await api.courses.getAll({
            search: search || undefined,
            category: selectedCategory || undefined,
            difficulty: selectedDifficulty || undefined,
            price_type: selectedPrice || undefined,
            language: selectedLanguage || undefined
          });
        setCourses(coursesData);
      } catch (err: any) {
        toast.error("Failed to load skills curriculum.");
      } finally {
        setIsLoading(false);
      }
    }
    const delayDebounceFn = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedCategory, selectedDifficulty, selectedPrice, selectedLanguage]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedDifficulty("");
    setSelectedPrice("");
    setSelectedLanguage("");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            AI Digital Skills Hub
          </h1>
          <p className="text-muted-foreground text-sm">
            Curated level-based YouTube paths verified by AI mentors.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="border-primary/20 hover:bg-primary/10 text-xs font-semibold rounded-xl flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Advanced Filters"}
          </Button>
          {(search || selectedCategory || selectedDifficulty || selectedPrice || selectedLanguage) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-xs text-rose-500 hover:text-rose-400 font-semibold"
            >
              Reset
            </Button>
          )}
        </div>
      </div>



      {/* Futuristic Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
          <Input 
            placeholder="Search skills, tech stacks, or YouTube channels..." 
            className="pl-12 py-6 rounded-2xl bg-card/60 border-border/60 focus:border-primary/50 text-base shadow-inner backdrop-blur"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-border/50 bg-card/85 backdrop-blur p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-border/50 bg-background/80 text-sm focus:outline-none"
                    value={selectedCategory || ""}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {/* Difficulty Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Difficulty Level</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-border/50 bg-background/80 text-sm focus:outline-none"
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                  >
                    <option value="">All Levels</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                {/* Pricing Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Price Type</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-border/50 bg-background/80 text-sm focus:outline-none"
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(e.target.value)}
                  >
                    <option value="">All Tiers</option>
                    <option value="Free">Free YouTube Paths</option>
                    <option value="Paid">Premium Certified Paths</option>
                  </select>
                </div>

                {/* Language Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Language</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-border/50 bg-background/80 text-sm focus:outline-none"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    <option value="">All Languages</option>
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                  </select>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dynamic Skills Grid */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[1, 2, 3].map(n => (
              <Card key={n} className="border-border/40 bg-card/50 h-[280px] animate-pulse rounded-3xl" />
            ))}
          </motion.div>
        ) : courses.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-16 max-w-md mx-auto space-y-4"
          >
            <ShieldAlert className="h-16 w-16 text-muted-foreground/60 mx-auto" />
            <h3 className="text-xl font-bold">No Matching Skills</h3>
            <p className="text-muted-foreground text-sm">
              We couldn't find any curated YouTube paths that match your current search queries or filter attributes.
            </p>
            <Button size="sm" onClick={clearFilters} className="rounded-xl">Clear Search</Button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {courses.map((course, index) => {
              // Simple deterministic color from category name (no lookup map needed)
              const CARD_COLORS = [
                "from-blue-500 to-cyan-500",
                "from-purple-500 to-pink-500",
                "from-emerald-500 to-teal-500",
                "from-orange-500 to-amber-500",
                "from-indigo-500 to-violet-500",
                "from-rose-500 to-red-500",
                "from-green-500 to-emerald-600",
                "from-fuchsia-500 to-purple-600",
              ];
              const cardColor = CARD_COLORS[(course.category || "").length % CARD_COLORS.length];
              
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -6 }}
                  className="h-full"
                >
                  <Link to={`/app/course/${course.id}`} className="h-full flex">
                    <Card className="border-border/50 bg-card/65 backdrop-blur-md hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all overflow-hidden flex flex-col justify-between rounded-3xl w-full group relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                      
                      <CardHeader className="relative">
                        <div className="flex justify-between items-start mb-3">
                          <div className={`p-3 rounded-2xl bg-gradient-to-r ${cardColor} text-white shadow group-hover:scale-110 transition-transform`}>
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px]">
                            {course.category}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl font-extrabold group-hover:text-primary transition-colors leading-tight line-clamp-1">
                          {course.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-3 text-xs leading-relaxed mt-2 text-muted-foreground/80">
                          {course.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-4 border-t border-border/30 pt-4 mt-auto">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock className="h-3.5 w-3.5 text-accent" />
                            {course.duration}
                          </span>
                          <span className="flex items-center gap-1.5 font-medium">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            {course.modules_count} Curated Videos
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-[10px] py-0.5 rounded-lg">
                            {course.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0.5 rounded-lg border-emerald-500/20 text-emerald-500 bg-emerald-500/5">
                            API Ready
                          </Badge>
                        </div>

                        <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-2xl py-5 hover:shadow-lg hover:shadow-primary/25 transition-all text-sm mt-2 flex items-center justify-center gap-2 group-hover:scale-[1.02]">
                          <Play className="h-4 w-4 fill-current" />
                          Enter Learning Path
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
