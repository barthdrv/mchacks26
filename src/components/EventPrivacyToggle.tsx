import { useState } from "react";
import { Lock, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EventPrivacyToggleProps {
  eventId: string;
  isPrivate: boolean;
  onToggle: (eventId: string, isPrivate: boolean) => void;
}

export function EventPrivacyToggle({ eventId, isPrivate, onToggle }: EventPrivacyToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);

  const handleToggle = async (newPrivate: boolean) => {
    if (newPrivate === isPrivate) {
      setOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("planned_events" as any)
        .update({ is_private: newPrivate })
        .eq("id", eventId);

      if (error) throw error;

      onToggle(eventId, newPrivate);
      toast.success(newPrivate ? "Event set to private" : "Event set to public");
      setOpen(false);
    } catch (error) {
      console.error("Error updating event privacy:", error);
      toast.error("Failed to update privacy setting");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0 hover:bg-background/50"
          onClick={(e) => e.stopPropagation()}
        >
          {isPrivate ? (
            <Lock className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Globe className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Event visibility</p>
          <Button
            variant={!isPrivate ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => handleToggle(false)}
            disabled={isUpdating}
          >
            {isUpdating && !isPrivate ? (
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            ) : (
              <Globe className="h-3 w-3 mr-2" />
            )}
            Public
            <span className="ml-auto text-muted-foreground">Friends can see</span>
          </Button>
          <Button
            variant={isPrivate ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => handleToggle(true)}
            disabled={isUpdating}
          >
            {isUpdating && isPrivate ? (
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            ) : (
              <Lock className="h-3 w-3 mr-2" />
            )}
            Private
            <span className="ml-auto text-muted-foreground">Only you</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
