import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface SparkleStarsProps {
  className?: string;
}

function SparkleStars({ className }: SparkleStarsProps) {
  return (
    <>
      <div className={cn("animate-pulse opacity-70", className)}>
        <Sparkles className="h-8 w-8 text-purple-400" />
      </div>
    </>
  );
}

export default SparkleStars;
