import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Syllabus } from "@/types/syllabus";

interface CourseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syllabus: Syllabus | null;
  onSave: (id: string, data: { course_name: string }) => void;
}

export function CourseEditDialog({
  open,
  onOpenChange,
  syllabus,
  onSave,
}: CourseEditDialogProps) {
  const [courseName, setCourseName] = useState("");

  useEffect(() => {
    if (syllabus) {
      setCourseName(syllabus.course_name);
    }
  }, [syllabus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabus || !courseName.trim()) return;

    onSave(syllabus.id, { course_name: courseName.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Course Name</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="course-name">Course Name</Label>
              <Input
                id="course-name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g., Introduction to Computer Science"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!courseName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
