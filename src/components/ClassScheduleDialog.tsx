import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClassSchedule } from "@/types/syllabus";

interface ClassScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ClassSchedule | null;
  existingCourseNames?: string[];
  onSave: (data: {
    course_name: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location?: string;
    syllabus_id?: string;
  }) => void;
  onDelete?: (id: string) => void;
}

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export function ClassScheduleDialog({
  open,
  onOpenChange,
  schedule,
  existingCourseNames = [],
  onSave,
  onDelete,
}: ClassScheduleDialogProps) {
  const [courseName, setCourseName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [useExistingCourse, setUseExistingCourse] = useState(false);

  const isEditing = !!schedule;

  useEffect(() => {
    if (schedule) {
      setCourseName(schedule.course_name);
      setDayOfWeek(schedule.day_of_week);
      setStartTime(schedule.start_time.slice(0, 5)); // Remove seconds if present
      setEndTime(schedule.end_time.slice(0, 5));
      setLocation(schedule.location || "");
      setUseExistingCourse(false);
    } else {
      setCourseName("");
      setDayOfWeek(1);
      setStartTime("09:00");
      setEndTime("10:00");
      setLocation("");
      setUseExistingCourse(existingCourseNames.length > 0);
    }
  }, [schedule, open, existingCourseNames.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseName.trim()) return;
    if (!startTime || !endTime) return;
    
    onSave({
      course_name: courseName.trim(),
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      location: location.trim() || undefined,
      syllabus_id: schedule?.syllabus_id,
    });
    
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (schedule && onDelete) {
      onDelete(schedule.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Class Schedule" : "Add Class Schedule"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Name */}
          <div className="space-y-2">
            <Label htmlFor="course-name">Course Name</Label>
            {!isEditing && existingCourseNames.length > 0 && (
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={useExistingCourse ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseExistingCourse(true)}
                >
                  Existing Course
                </Button>
                <Button
                  type="button"
                  variant={!useExistingCourse ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setUseExistingCourse(false);
                    setCourseName("");
                  }}
                >
                  New Course
                </Button>
              </div>
            )}
            
            {useExistingCourse && !isEditing ? (
              <Select value={courseName} onValueChange={setCourseName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {existingCourseNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="course-name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g., Introduction to Psychology"
                required
              />
            )}
          </div>

          {/* Day of Week */}
          <div className="space-y-2">
            <Label>Day of Week</Label>
            <Select
              value={dayOfWeek.toString()}
              onValueChange={(val) => setDayOfWeek(parseInt(val))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Room 101, Building A"
            />
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Save Changes" : "Add Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}