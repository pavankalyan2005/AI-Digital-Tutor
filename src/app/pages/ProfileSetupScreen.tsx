import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { User, Briefcase, GraduationCap, Target, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Progress } from "../components/ui/progress";

export function ProfileSetupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      navigate("/assessment");
    }
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Complete Your Profile</h2>
          <p className="text-muted-foreground">Help us personalize your learning experience</p>
          <Progress value={progress} className="mt-4 h-2" />
        </div>

        <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 p-8 shadow-2xl">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Basic Information</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age Range</Label>
                  <RadioGroup defaultValue="18-24">
                    {["Under 18", "18-24", "25-34", "35-44", "45+"].map((age) => (
                      <div key={age} className="flex items-center space-x-2">
                        <RadioGroupItem value={age} id={age} />
                        <Label htmlFor={age} className="cursor-pointer">{age}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input id="location" placeholder="e.g., New York, USA" />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Education & Experience</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Status</Label>
                  <RadioGroup defaultValue="student">
                    {[
                      { value: "student", label: "Student" },
                      { value: "fresher", label: "Fresh Graduate" },
                      { value: "professional", label: "Working Professional" },
                      { value: "career-change", label: "Career Switcher" },
                    ].map((status) => (
                      <div key={status.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={status.value} id={status.value} />
                        <Label htmlFor={status.value} className="cursor-pointer">{status.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Highest Education</Label>
                  <RadioGroup defaultValue="bachelor">
                    {["High School", "Bachelor's Degree", "Master's Degree", "PhD", "Other"].map((edu) => (
                      <div key={edu} className="flex items-center space-x-2">
                        <RadioGroupItem value={edu} id={edu} />
                        <Label htmlFor={edu} className="cursor-pointer">{edu}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Learning Goals</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Goal</Label>
                  <RadioGroup defaultValue="skill">
                    {[
                      "Learn new skills for career growth",
                      "Prepare for job interviews",
                      "Build projects for portfolio",
                      "Get certified in specific technologies",
                      "Start freelancing career",
                    ].map((goal) => (
                      <div key={goal} className="flex items-center space-x-2">
                        <RadioGroupItem value={goal} id={goal} />
                        <Label htmlFor={goal} className="cursor-pointer text-sm">{goal}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Time Commitment</Label>
                  <RadioGroup defaultValue="5-10">
                    {[
                      "1-5 hours per week",
                      "5-10 hours per week",
                      "10-20 hours per week",
                      "20+ hours per week",
                    ].map((time) => (
                      <div key={time} className="flex items-center space-x-2">
                        <RadioGroupItem value={time} id={time} />
                        <Label htmlFor={time} className="cursor-pointer">{time}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Previous
              </Button>
            )}
            <Button
              size="lg"
              onClick={nextStep}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30"
            >
              {step === totalSteps ? "Complete" : "Next"}
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
