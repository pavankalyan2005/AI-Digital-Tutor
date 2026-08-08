import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RequireAdmin } from "./components/RequireAdmin";

// Pages
import { SplashScreen } from "./pages/SplashScreen";
import { OnboardingScreen } from "./pages/OnboardingScreen";
import { LoginScreen } from "./pages/LoginScreen";
import { SignUpScreen } from "./pages/SignUpScreen";
import { ForgotPasswordScreen } from "./pages/ForgotPasswordScreen";
import { ProfileSetupScreen } from "./pages/ProfileSetupScreen";
import { SkillAssessmentScreen } from "./pages/SkillAssessmentScreen";
import { DashboardScreen } from "./pages/DashboardScreen";
import { AITutorChat } from "./pages/AITutorChat";
import { VoiceAssistant } from "./pages/VoiceAssistant";
import { SkillCategories } from "./pages/SkillCategories";
import { CourseDetails } from "./pages/CourseDetails";
import { LearningRoadmap } from "./pages/LearningRoadmap";
import { CourseModules } from "./pages/CourseModules";
import { VideoLearning } from "./pages/VideoLearning";
import { AINotesGenerator } from "./pages/AINotesGenerator";
import { SmartQuizDashboard } from "./pages/SmartQuizDashboard";
import { CodingArena } from "./pages/CodingArena";
import { AIDebuggingAssistant } from "./pages/AIDebuggingAssistant";
import { DailyChallenges } from "./pages/DailyChallenges";
import { ProgressTracking } from "./pages/ProgressTracking";
import { LearningAnalytics } from "./pages/LearningAnalytics";
import { AchievementBadges } from "./pages/AchievementBadges";
import { LearningStreak } from "./pages/LearningStreak";
import { AICareerGuidance } from "./pages/AICareerGuidance";
import { InternshipSuggestions } from "./pages/InternshipSuggestions";
import { JobReadinessDashboard } from "./pages/JobReadinessDashboard";
import { AIResumeBuilder } from "./pages/AIResumeBuilder";
import { MockInterview } from "./pages/MockInterview";
import { InterviewAnalytics } from "./pages/InterviewAnalytics";
import { ProjectShowcase } from "./pages/ProjectShowcase";
import { PortfolioBuilder } from "./pages/PortfolioBuilder";
import { CommunityFeed } from "./pages/CommunityFeed";
import { DiscussionForum } from "./pages/DiscussionForum";
import { MentorBooking } from "./pages/MentorBooking";
import { LiveClasses } from "./pages/LiveClasses";
import { CalendarPlanner } from "./pages/CalendarPlanner";
import { GoalTracking } from "./pages/GoalTracking";
import { ProductivityInsights } from "./pages/ProductivityInsights";
import { FocusMode } from "./pages/FocusMode";
import { NotificationCenter } from "./pages/NotificationCenter";
import { ThemeSettings } from "./pages/ThemeSettings";
import { PremiumPlans } from "./pages/PremiumPlans";
import { AIMotivationCoach } from "./pages/AIMotivationCoach";
import { RevisionPlanner } from "./pages/RevisionPlanner";
import { NotFound } from "./pages/NotFound";
import AdminConsole from "./pages/AdminConsole";
import { ErrorBoundary } from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: ErrorBoundary,
    children: [
      { index: true, Component: SplashScreen },
      { path: "onboarding", Component: OnboardingScreen },
      { path: "login", Component: LoginScreen },
      { path: "signup", Component: SignUpScreen },
      { path: "forgot-password", Component: ForgotPasswordScreen },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "profile-setup", Component: ProfileSetupScreen },
          { path: "assessment", Component: SkillAssessmentScreen },
          {
            path: "app",
            Component: DashboardLayout,
            children: [
              { index: true, Component: DashboardScreen },
              { path: "ai-tutor", Component: AITutorChat },
              { path: "voice-assistant", Component: VoiceAssistant },
              { path: "skills", Component: SkillCategories },
              { path: "course/:id", Component: CourseDetails },
              { path: "roadmap/:skill", Component: LearningRoadmap },
              { path: "modules/:courseId", Component: CourseModules },
              { path: "learn/:moduleId", Component: VideoLearning },
              { path: "notes", Component: AINotesGenerator },
              { path: "quiz", Component: SmartQuizDashboard },
              { path: "code", Component: CodingArena },
              { path: "debug", Component: AIDebuggingAssistant },
              { path: "challenges", Component: DailyChallenges },
              { path: "progress", Component: ProgressTracking },
              { path: "analytics", Component: LearningAnalytics },
              { path: "streak", Component: LearningStreak },
              { path: "internships", Component: InternshipSuggestions },
              { path: "job-readiness", Component: JobReadinessDashboard },
              { path: "resume", Component: AIResumeBuilder },
              { path: "interview", Component: MockInterview },
              { path: "interview-analytics", Component: InterviewAnalytics },
              { path: "projects", Component: ProjectShowcase },
              { path: "portfolio", Component: PortfolioBuilder },
              { path: "forum", Component: DiscussionForum },
              { path: "mentors", Component: MentorBooking },
              { path: "live", Component: LiveClasses },
              { path: "calendar", Component: CalendarPlanner },
              { path: "goals", Component: GoalTracking },
              { path: "productivity", Component: ProductivityInsights },
              { path: "focus", Component: FocusMode },
              { path: "notifications", Component: NotificationCenter },
              { path: "settings", Component: ThemeSettings },
              { path: "premium", Component: PremiumPlans },
              { path: "motivation", Component: AIMotivationCoach },
              { path: "revision", Component: RevisionPlanner },
              {
                element: <RequireAdmin />,
                children: [
                  { path: "admin", Component: AdminConsole }
                ]
              },
            ],
          },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
