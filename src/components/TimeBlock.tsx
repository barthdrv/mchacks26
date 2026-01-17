import { motion } from "framer-motion";
import { Clock, Briefcase, User, Heart, Users, ShoppingBag, Coffee, Utensils } from "lucide-react";
import type { ScheduleBlock } from "@/types/schedule";

const categoryConfig: Record<string, { color: string; icon: typeof Clock }> = {
  work: { color: "bg-block-coral", icon: Briefcase },
  personal: { color: "bg-block-lavender", icon: User },
  health: { color: "bg-block-mint", icon: Heart },
  social: { color: "bg-block-peach", icon: Users },
  errands: { color: "bg-block-sky", icon: ShoppingBag },
  leisure: { color: "bg-block-sage", icon: Coffee },
  meal: { color: "bg-block-peach", icon: Utensils },
};

interface TimeBlockProps {
  block: ScheduleBlock;
  index: number;
}

export function TimeBlock({ block, index }: TimeBlockProps) {
  const config = categoryConfig[block.category] || categoryConfig.personal;
  const Icon = config.icon;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`${config.color} rounded-xl p-4 border border-border/50 hover:shadow-soft transition-shadow`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-lg bg-background/50">
          <Icon className="h-4 w-4 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{block.title}</h4>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {formatTime(block.startTime)} – {formatTime(block.endTime)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-background/50">
              {block.duration} min
            </span>
          </div>
          {block.notes && (
            <p className="mt-2 text-sm text-muted-foreground">{block.notes}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
