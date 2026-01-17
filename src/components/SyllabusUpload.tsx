import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Loader2, BookOpen, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInDays } from "date-fns";
import type { Syllabus, HomeworkAssignment, ClassSchedule } from "@/types/syllabus";

interface SyllabusUploadProps {
  syllabi: Syllabus[];
  assignments: HomeworkAssignment[];
  classSchedules: ClassSchedule[];
  isUploading: boolean;
  onUpload: (file: File) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDeleteSyllabus: (id: string) => void;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SyllabusUpload({
  syllabi,
  assignments,
  classSchedules,
  isUploading,
  onUpload,
  onToggleComplete,
  onDeleteSyllabus,
}: SyllabusUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    ];
    if (!validTypes.includes(file.type)) {
      return false;
    }
    return true;
  };

  const upcomingAssignments = assignments.filter((a) => !a.completed).slice(0, 5);

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
          accept=".pdf,.doc,.docx"
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
                Drag and drop a PDF or Word document, or click to browse
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
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium">{syllabus.course_name}</span>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteSyllabus(syllabus.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming assignments */}
      <AnimatePresence>
        {upcomingAssignments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingAssignments.map((assignment) => {
                    const dueDate = new Date(assignment.due_date);
                    const daysUntil = differenceInDays(dueDate, new Date());
                    const urgency =
                      daysUntil <= 1
                        ? "text-destructive"
                        : daysUntil <= 3
                        ? "text-orange-500"
                        : "text-muted-foreground";

                    return (
                      <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30"
                      >
                        <Checkbox
                          checked={assignment.completed}
                          onCheckedChange={(checked) =>
                            onToggleComplete(assignment.id, checked as boolean)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{assignment.title}</p>
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
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
