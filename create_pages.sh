#!/bin/bash

# Create SkillCategories page
cat > /workspaces/default/code/src/app/pages/SkillCategories.tsx << 'EOF'
import { Link } from "react-router";
import { motion } from "motion/react";
import { Brain, Code, Database, Cloud, Lock, Palette, Smartphone, Box, Activity, TrendingUp, Users, Briefcase, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

const categories = [
  { icon: Brain, name: "AI & Machine Learning", courses: 45, color: "from-purple-500 to-pink-500", students: "125K" },
  { icon: Code, name: "Full Stack Development", courses: 78, color: "from-blue-500 to-cyan-500", students: "230K" },
  { icon: Database, name: "Data Science", courses: 52, color: "from-green-500 to-emerald-500", students: "180K" },
  { icon: Cloud, name: "Cloud Computing", courses: 38, color: "from-orange-500 to-red-500", students: "95K" },
  { icon: Lock, name: "Cybersecurity", courses: 42, color: "from-red-500 to-pink-500", students: "110K" },
  { icon: Palette, name: "UI/UX Design", courses: 33, color: "from-pink-500 to-purple-500", students: "150K" },
  { icon: Smartphone, name: "Mobile Development", courses: 29, color: "from-cyan-500 to-blue-500", students: "88K" },
  { icon: Box, name: "Blockchain", courses: 21, color: "from-yellow-500 to-orange-500", students: "65K" },
  { icon: Activity, name: "DevOps", courses: 31, color: "from-emerald-500 to-green-500", students: "72K" },
  { icon: TrendingUp, name: "Digital Marketing", courses: 27, color: "from-indigo-500 to-purple-500", students: "140K" },
  { icon: Users, name: "Product Management", courses: 19, color: "from-violet-500 to-fuchsia-500", students: "58K" },
  { icon: Briefcase, name: "Business Analytics", courses: 24, color: "from-rose-500 to-red-500", students: "82K" },
];

export function SkillCategories() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Explore Skills</h1>
        <p className="text-muted-foreground">Choose from 500+ courses across trending technologies</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Search for skills, courses, or technologies..." className="pl-10" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/app/course/${index + 1}`}>
                <Card className="border-border/50 bg-card/80 backdrop-blur hover:shadow-xl hover:scale-105 transition-all cursor-pointer group">
                  <CardHeader>
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${category.color} w-fit mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">{category.name}</CardTitle>
                    <CardDescription>{category.courses} courses available</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{category.students} students</Badge>
                      <Badge variant="outline" className="text-xs">Trending</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
EOF

# Create remaining placeholder pages
for page in "CourseDetails" "LearningRoadmap" "CourseModules" "VideoLearning" "AINotesGenerator" "SmartQuizDashboard" "CodingArena" "AIDebuggingAssistant" "DailyChallenges" "ProgressTracking" "LearningAnalytics" "AchievementBadges" "LearningStreak" "AICareerGuidance" "InternshipSuggestions" "JobReadinessDashboard" "AIResumeBuilder" "MockInterview" "InterviewAnalytics" "ProjectShowcase" "PortfolioBuilder" "CommunityFeed" "DiscussionForum" "MentorBooking" "LiveClasses" "CalendarPlanner" "GoalTracking" "ProductivityInsights" "FocusMode" "NotificationCenter" "ThemeSettings" "PremiumPlans" "AIMotivationCoach" "RevisionPlanner" "CertificationScreen"; do
  cat > "/workspaces/default/code/src/app/pages/${page}.tsx" << EOF
import { PagePlaceholder } from "../components/PagePlaceholder";
import { BookOpen } from "lucide-react";

export function ${page}() {
  return (
    <PagePlaceholder
      icon={BookOpen}
      title="${page}"
      description="Feature coming soon"
    />
  );
}
EOF
done

