import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Loader2, BookOpen, Clock, Trash2, ChevronDown, ChevronUp, Plus, Edit2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ClassScheduleDialog } from "@/components/ClassScheduleDialog";
import { CourseEditDialog } from "@/components/CourseEditDialog";
import { format, differenceInDays } from "date-fns";
import type { Syllabus, HomeworkAssignment, ClassSchedule } from "@/types/syllabus";

interface SyllabusUploadProps {
  syllabi: Syllabus[];
  assignments: HomeworkAssignment[];
  classSchedules: ClassSchedule[];
  isUploading: boolean;
  onUpload: (file: File) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDeleteAssignment?: (id: string) => void;
  onDeleteSyllabus: (id: string) => void;
  onAddClassSchedule?: (data: {
    course_name: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location?: string;
    syllabus_id?: string;
  }) => void;
  onUpdateClassSchedule?: (id: string, data: {
    course_name?: string;
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    location?: string | null;
  }) => void;
  onDeleteClassSchedule?: (id: string) => void;
  onUpdateSyllabus?: (id: string, data: { course_name: string }) => void;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SyllabusUpload({
  syllabi,
  assignments,
  classSchedules,
  isUploading,
  onUpload,
  onToggleComplete,
  onDeleteAssignment,
  onDeleteSyllabus,
  onAddClassSchedule,
  onUpdateClassSchedule,
  onDeleteClassSchedule,
  onUpdateSyllabus,
}: SyllabusUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingSyllabus, setEditingSyllabus] = useState<Syllabus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingCourseNames = [...new Set(syllabi.map(s => s.course_name))];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidFile(file)) {
      onUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      onUpload(file);
    }
  };

  const isValidFile = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    if (!validTypes.includes(file.type)) {
      return false;
    }
    return true;
  };

  // Show assignments (including completed) sorted by due date (stable when toggling complete)
  const allAssignmentsForDisplay = assignments
    .filter((a) => {
      const dueDate = new Date(a.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Show any assignment due today or later, plus any incomplete (even if overdue)
      return dueDate >= today || !a.completed;
    })
    .sort((a, b) => {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  
  const displayedAssignments = showAllAssignments 
    ? allAssignmentsForDisplay 
    : allAssignmentsForDisplay.slice(0, 5);
  return (
    <div className="space-y-6">
      {/* Upload area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Analyzing syllabus...</p>
              <p className="text-sm text-muted-foreground">
                Extracting assignments and class schedule
              </p>
            </>
          ) : (
            <>
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium mb-2">Upload your syllabus</p>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop a PDF, Word document, or image (JPG/PNG)
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Choose file
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Syllabi list */}
      <AnimatePresence>
        {syllabi.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Your Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syllabi.map((syllabus) => {
                    const courseSchedules = classSchedules.filter(
                      (s) => s.syllabus_id === syllabus.id
                    );
                    const courseAssignments = assignments.filter(
                      (a) => a.syllabus_id === syllabus.id && !a.completed
                    );

                      return (
                        <motion.div
                          key={syllabus.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start justify-between p-3 rounded-xl bg-secondary/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="font-medium truncate">{syllabus.course_name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                              {courseSchedules.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {courseSchedules
                                    .map((s) => dayNames[s.day_of_week].slice(0, 3))
                                    .join(", ")}
                                </span>
                              )}
                              {courseAssignments.length > 0 && (
                                <Badge variant="secondary">
                                  {courseAssignments.length} upcoming
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {onUpdateSyllabus && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setEditingSyllabus(syllabus);
                                  setCourseDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeleteSyllabus(syllabus.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Class Schedules - Always visible with Add button */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Class Schedule
            </CardTitle>
            {onAddClassSchedule && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Class
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {classSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No classes scheduled yet. Add a class manually or upload a syllabus.
            </p>
          ) : (
            <div className="space-y-2">
              {classSchedules
                .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                .map((schedule) => (
                  <motion.div
                    key={schedule.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{schedule.course_name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dayNames[schedule.day_of_week]} {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                        </span>
                        {schedule.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {schedule.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {onUpdateClassSchedule && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setEditingSchedule(schedule);
                          setScheduleDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Schedule Dialog */}
      <ClassScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        schedule={editingSchedule}
        existingCourseNames={existingCourseNames}
        onSave={(data) => {
          if (editingSchedule && onUpdateClassSchedule) {
            onUpdateClassSchedule(editingSchedule.id, data);
          } else if (onAddClassSchedule) {
            onAddClassSchedule(data);
          }
        }}
        onDelete={onDeleteClassSchedule}
      />

      {/* Upcoming assignments */}
      <AnimatePresence>
        {allAssignmentsForDisplay.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Assignments ({allAssignmentsForDisplay.filter(a => !a.completed).length} upcoming)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {displayedAssignments.map((assignment) => {
                    const dueDate = new Date(assignment.due_date);
                    const daysUntil = differenceInDays(dueDate, new Date());
                    const urgency = assignment.completed
                      ? "text-muted-foreground"
                      : daysUntil <= 1
                        ? "text-destructive"
                        : daysUntil <= 3
                        ? "text-orange-500"
                        : "text-muted-foreground";

                      return (
                        <motion.div
                          key={assignment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                            assignment.completed 
                              ? "bg-secondary/20 assignment-complete" 
                              : "bg-secondary/30"
                          }`}
                        >
                          <Checkbox
                            checked={assignment.completed}
                            onCheckedChange={(checked) =>
                              onToggleComplete(assignment.id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${
                              assignment.completed ? "strikethrough-text" : ""
                            }`}>
                              {assignment.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.course_name}
                            </p>
                          </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${urgency}`}>
                            {format(dueDate, "MMM d")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ~{assignment.estimated_hours}h
                          </p>
                        </div>
                        {assignment.completed && onDeleteAssignment && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => onDeleteAssignment(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                
                {/* Show All / Show Less button */}
                {allAssignmentsForDisplay.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 flex items-center justify-center gap-2"
                    onClick={() => setShowAllAssignments(!showAllAssignments)}
                  >
                    {showAllAssignments ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show all ({allAssignmentsForDisplay.length} assignments)
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course Edit Dialog */}
      <CourseEditDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        syllabus={editingSyllabus}
        onSave={(id, data) => {
          if (onUpdateSyllabus) {
            onUpdateSyllabus(id, data);
          }
        }}
      />
    </div>
  );
}
