import { useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import type { ClassSchedule, HomeworkAssignment } from "@/types/syllabus";
import type { ScheduleDay } from "@/types/schedule";

interface WeeklyCalendarViewProps {
  classSchedules: ClassSchedule[];
  assignments: HomeworkAssignment[];
  generatedSchedules?: ScheduleDay[];
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export function WeeklyCalendarView({
  classSchedules,
  assignments,
  generatedSchedules = [],
  currentWeekStart,
  onWeekChange,
}: WeeklyCalendarViewProps) {
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const getClassesForDay = (date: Date) => {
    const dayOfWeek = date.getDay();
    return classSchedules.filter((s) => s.day_of_week === dayOfWeek);
  };

  const getAssignmentsForDay = (date: Date) => {
    return assignments.filter((a) => {
      const dueDate = new Date(a.due_date);
      return isSameDay(dueDate, date);
    });
  };

  const getGeneratedBlocksForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const daySchedule = generatedSchedules.find((s) => s.date === dateStr);
    return daySchedule?.blocks || [];
  };

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours + minutes / 60;
  };

  const getBlockStyle = (startTime: string, endTime: string) => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    const top = ((start - 6) / 16) * 100;
    const height = ((end - start) / 16) * 100;
    return { top: `${top}%`, height: `${Math.max(height, 4)}%` };
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden"
    >
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onWeekChange(subWeeks(currentWeekStart, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onWeekChange(addWeeks(currentWeekStart, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="flex">
        {/* Time column */}
        <div className="w-16 flex-shrink-0 border-r border-border">
          <div className="h-12 border-b border-border" /> {/* Header spacer */}
          <div className="relative" style={{ height: "640px" }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-xs text-muted-foreground text-right pr-2"
                style={{ top: `${((hour - 6) / 16) * 100}%` }}
              >
                {format(new Date().setHours(hour, 0), "h a")}
              </div>
            ))}
          </div>
        </div>

        {/* Days columns */}
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map((day, dayIndex) => (
            <div
              key={dayIndex}
              className={`border-r border-border last:border-r-0 ${
                isToday(day) ? "bg-primary/5" : ""
              }`}
            >
              {/* Day header */}
              <div
                className={`h-12 flex flex-col items-center justify-center border-b border-border ${
                  isToday(day) ? "bg-primary/10" : ""
                }`}
              >
                <span className="text-xs text-muted-foreground">
                  {format(day, "EEE")}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isToday(day)
                      ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                      : ""
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Time slots */}
              <div className="relative" style={{ height: "640px" }}>
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/50"
                    style={{ top: `${((hour - 6) / 16) * 100}%` }}
                  />
                ))}

                {/* Class blocks */}
                {getClassesForDay(day).map((classItem) => (
                  <div
                    key={classItem.id}
                    className="absolute left-1 right-1 rounded-md px-1.5 py-1 bg-primary/20 border-l-2 border-primary overflow-hidden cursor-pointer hover:bg-primary/30 transition-colors"
                    style={getBlockStyle(classItem.start_time, classItem.end_time)}
                  >
                    <p className="text-xs font-medium text-primary truncate">
                      {classItem.course_name}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {format(new Date(`2000-01-01T${classItem.start_time}`), "h:mm a")}
                    </div>
                    {classItem.location && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" />
                        <span className="truncate">{classItem.location}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Generated schedule blocks */}
                {getGeneratedBlocksForDay(day).map((block) => {
                  const categoryColors: Record<string, string> = {
                    work: "bg-amber-500/20 border-amber-500",
                    personal: "bg-violet-500/20 border-violet-500",
                    health: "bg-emerald-500/20 border-emerald-500",
                    social: "bg-pink-500/20 border-pink-500",
                    errands: "bg-slate-500/20 border-slate-500",
                    leisure: "bg-cyan-500/20 border-cyan-500",
                    meal: "bg-orange-500/20 border-orange-500",
                  };
                  const colors = categoryColors[block.category] || categoryColors.work;

                  return (
                    <div
                      key={block.id}
                      className={`absolute left-1 right-1 rounded-md px-1.5 py-1 border-l-2 overflow-hidden ${colors}`}
                      style={getBlockStyle(block.startTime, block.endTime)}
                    >
                      <p className="text-xs font-medium truncate">{block.title}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {format(new Date(`2000-01-01T${block.startTime}`), "h:mm a")}
                      </div>
                    </div>
                  );
                })}

                {/* Assignment due indicators (shown at top of day) */}
                {getAssignmentsForDay(day).length > 0 && (
                  <div className="absolute top-1 left-1 right-1">
                    {getAssignmentsForDay(day)
                      .slice(0, 3)
                      .map((assignment) => (
                        <div
                          key={assignment.id}
                          className={`mb-1 rounded-md px-1.5 py-1 text-[10px] ${
                            assignment.completed
                              ? "bg-muted/50 text-muted-foreground line-through"
                              : "bg-destructive/20 border-l-2 border-destructive"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate font-medium">
                              {assignment.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    {getAssignmentsForDay(day).length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1.5">
                        +{getAssignmentsForDay(day).length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/20 border-l-2 border-primary" />
          <span>Classes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive/20 border-l-2 border-destructive" />
          <span>Assignments Due</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500/20 border-l-2 border-amber-500" />
          <span>Scheduled Tasks</span>
        </div>
      </div>
    </motion.div>
  );
}
