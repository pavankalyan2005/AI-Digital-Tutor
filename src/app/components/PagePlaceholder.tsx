import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PagePlaceholder({ icon: Icon, title, description }: PagePlaceholderProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="border-border/50 bg-card/80 backdrop-blur text-center py-12">
        <CardHeader>
          <div className="mx-auto p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 w-fit mb-4">
            <Icon className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This feature is coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
}
