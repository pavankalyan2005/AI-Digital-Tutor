import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Brain, Code, Database, Cloud, Lock, Palette, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";

const skillCategories = [
  { icon: Code, name: "Programming", color: "from-blue-500 to-cyan-500", skills: ["Python", "JavaScript", "Java", "C++"] },
  { icon: Brain, name: "AI & ML", color: "from-purple-500 to-pink-500", skills: ["Machine Learning", "Deep Learning", "NLP", "Computer Vision"] },
  { icon: Database, name: "Data Science", color: "from-green-500 to-emerald-500", skills: ["Data Analysis", "Statistics", "SQL", "Visualization"] },
  { icon: Cloud, name: "Cloud & DevOps", color: "from-orange-500 to-red-500", skills: ["AWS", "Docker", "Kubernetes", "CI/CD"] },
  { icon: Lock, name: "Cybersecurity", color: "from-red-500 to-pink-500", skills: ["Network Security", "Ethical Hacking", "Cryptography", "Penetration Testing"] },
  { icon: Palette, name: "Design", color: "from-pink-500 to-purple-500", skills: ["UI/UX", "Figma", "Adobe XD", "Prototyping"] },
];

export function SkillAssessmentScreen() {
  const navigate = useNavigate();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [currentCategory, setCurrentCategory] = useState(0);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const nextCategory = () => {
    if (currentCategory < skillCategories.length - 1) {
      setCurrentCategory(currentCategory + 1);
    } else {
      navigate("/app");
    }
  };

  const progress = ((currentCategory + 1) / skillCategories.length) * 100;
  const category = skillCategories[currentCategory];
  const Icon = category.icon;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-3xl"
      >
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Skill Assessment</h2>
          <p className="text-muted-foreground">Select skills you want to learn or improve</p>
          <Progress value={progress} className="mt-4 h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {currentCategory + 1} of {skillCategories.length} categories
          </p>
        </div>

        <motion.div
          key={currentCategory}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 p-8 shadow-2xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-4 rounded-2xl bg-gradient-to-r ${category.color}`}>
              <Icon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{category.name}</h3>
              <p className="text-muted-foreground">Select all that apply</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {category.skills.map((skill) => {
              const isSelected = selectedSkills.includes(skill);

              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`
                    relative p-6 rounded-2xl border-2 transition-all text-left
                    ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/50 bg-card/50"
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{skill}</h4>
                      <p className="text-sm text-muted-foreground">Click to select</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {skillCategories.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentCategory ? "w-8 bg-primary" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>

            <Button
              size="lg"
              onClick={nextCategory}
              className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30"
            >
              {currentCategory === skillCategories.length - 1 ? "Start Learning" : "Next Category"}
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>

          {selectedSkills.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Selected Skills ({selectedSkills.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="px-3 py-1.5">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
