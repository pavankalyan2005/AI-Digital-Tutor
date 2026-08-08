import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, Target, TrendingUp, Trophy, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";

const slides = [
  {
    icon: Sparkles,
    title: "AI-Powered Personalized Learning",
    description: "Get a customized learning experience tailored to your goals, pace, and learning style with advanced AI guidance.",
    gradient: "from-primary to-accent",
  },
  {
    icon: Target,
    title: "Smart Skill Roadmaps",
    description: "Follow expertly crafted learning paths for in-demand skills like AI, Full Stack Development, Data Science, and more.",
    gradient: "from-accent to-primary",
  },
  {
    icon: Trophy,
    title: "Gamified Learning System",
    description: "Stay motivated with streaks, achievements, daily challenges, and compete with learners worldwide.",
    gradient: "from-primary via-accent to-primary",
  },
];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/signup");
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const skip = () => {
    navigate("/signup");
  };

  const progress = ((currentSlide + 1) / slides.length) * 100;

  return (
    <div className="h-screen w-full bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Progress */}
        <div className="mb-12">
          <Progress value={progress} className="h-1.5" />
          <div className="flex justify-between mt-4">
            <Button variant="ghost" onClick={skip} className="text-muted-foreground">
              Skip
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentSlide + 1} / {slides.length}
            </span>
          </div>
        </div>

        {/* Slides */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-12"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-8 inline-block"
            >
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${slides[currentSlide].gradient} rounded-3xl blur-2xl opacity-50`} />
                <div className={`relative bg-gradient-to-r ${slides[currentSlide].gradient} p-12 rounded-3xl`}>
                  {(() => {
                    const Icon = slides[currentSlide].icon;
                    return <Icon className="h-20 w-20 text-primary-foreground" />;
                  })()}
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {slides[currentSlide].title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                {slides[currentSlide].description}
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="flex-1"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Previous
          </Button>
          <Button
            size="lg"
            onClick={nextSlide}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30"
          >
            {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>

        {/* Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
