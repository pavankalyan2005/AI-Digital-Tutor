import { PagePlaceholder } from "../components/PagePlaceholder";
import { Mic } from "lucide-react";

export function VoiceAssistant() {
  return (
    <PagePlaceholder
      icon={Mic}
      title="Voice Assistant"
      description="Talk to your AI tutor hands-free"
    />
  );
}
