import { useState } from "react";
import { Apple, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CalendarExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: "apple" | "google") => void;
}

export function CalendarExportDialog({
  open,
  onOpenChange,
  onExport,
}: CalendarExportDialogProps) {
  const handleExport = (format: "apple" | "google") => {
    onExport(format);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Calendar</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 rounded-xl hover:bg-accent"
            onClick={() => handleExport("apple")}
          >
            <Apple className="h-8 w-8" />
            <span>Apple Calendar</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 rounded-xl hover:bg-accent"
            onClick={() => handleExport("google")}
          >
            <Calendar className="h-8 w-8" />
            <span>Google Calendar</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Apple Calendar downloads an .ics file. Google Calendar opens in a new tab.
        </p>
      </DialogContent>
    </Dialog>
  );
}
