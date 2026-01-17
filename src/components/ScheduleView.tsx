import { motion } from "framer-motion";
import { Calendar, Download, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeBlock } from "./TimeBlock";
import type { ScheduleDay } from "@/types/schedule";

interface ScheduleViewProps {
  schedules: ScheduleDay[];
  summary: string;
  onEdit: () => void;
  onExport: (format: 'ics') => void;
}

export function ScheduleView({ schedules, summary, onEdit, onExport }: ScheduleViewProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-6"
    >
      {/* Summary */}
      <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
        <p className="text-muted-foreground">{summary}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={onEdit}
          variant="outline"
          className="rounded-xl"
        >
          <Edit3 className="h-4 w-4 mr-2" />
          Edit schedule
        </Button>
        <Button
          onClick={() => onExport('ics')}
          className="gradient-hero text-primary-foreground rounded-xl"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to Calendar
        </Button>
      </div>

      {/* Schedule days */}
      {schedules.map((day, dayIndex) => (
        <motion.div
          key={day.date}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: dayIndex * 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">{formatDate(day.date)}</h3>
          </div>

          <div className="space-y-3 pl-2">
            {day.blocks.map((block, blockIndex) => (
              <TimeBlock key={block.id} block={block} index={blockIndex} />
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
