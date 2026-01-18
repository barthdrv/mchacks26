import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, BookOpen, Clock, Users, User, Lock, Globe, GitCompare, X, Trash2, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import type { ClassSchedule, HomeworkAssignment } from "@/types/syllabus";
import type { ScheduleDay, ScheduleBlock } from "@/types/schedule";
import { useFriends } from "@/hooks/useFriends";
import { usePlannedEvents, PlannedEvent } from "@/hooks/usePlannedEvents";
import { EventPrivacyToggle } from "@/components/EventPrivacyToggle";

interface WeeklyCalendarViewProps {
  classSchedules: ClassSchedule[];
  assignments: HomeworkAssignment[];
  generatedSchedules?: ScheduleDay[];
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
  userId?: string;
}

const HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 6 AM to 12 AM (midnight)

export function WeeklyCalendarView({
  classSchedules,
  assignments,
  generatedSchedules = [],
  currentWeekStart,
  onWeekChange,
  userId,
}: WeeklyCalendarViewProps) {
  const { friends, getFriendSchedule } = useFriends();
  const { events: userPlannedEvents, fetchEvents, updateEventPrivacy, deleteEvent } = usePlannedEvents(userId);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [friendSchedules, setFriendSchedules] = useState<ClassSchedule[]>([]);
  const [friendPlannedEvents, setFriendPlannedEvents] = useState<Array<{
    id: string;
    title: string;
    event_date: string;
    start_time: string;
    end_time: string;
    category: string;
    notes?: string;
  }>>([]);
  const [isLoadingFriend, setIsLoadingFriend] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Category display names and colors
  const categoryInfo: Record<string, { label: string; color: string }> = {
    work: { label: "Work", color: "bg-amber-500" },
    personal: { label: "Personal", color: "bg-violet-500" },
    health: { label: "Health", color: "bg-emerald-500" },
    social: { label: "Social", color: "bg-pink-500" },
    errands: { label: "Errands", color: "bg-slate-500" },
    leisure: { label: "Leisure", color: "bg-cyan-500" },
    meal: { label: "Meal", color: "bg-orange-500" },
  };

  const handleDeleteEvent = async () => {
    if (eventToDelete) {
      await deleteEvent(eventToDelete);
      setEventToDelete(null);
    }
  };

  // Fetch user's planned events when week changes (also in compare mode)
  useEffect(() => {
    if (userId && (!selectedFriendId || compareMode)) {
      const startDate = format(currentWeekStart, "yyyy-MM-dd");
      const endDate = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");
      fetchEvents(startDate, endDate);
    }
  }, [userId, currentWeekStart, selectedFriendId, compareMode, fetchEvents]);

  // Get user's planned events for a specific day
  const getUserEventsForDay = useCallback((date: Date): PlannedEvent[] => {
    if (selectedFriendId && !compareMode) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return userPlannedEvents.filter(e => e.event_date === dateStr);
  }, [userPlannedEvents, selectedFriendId, compareMode]);
  // Filter friends with public schedules
  const publicFriends = useMemo(() => {
    return friends.filter(f => f.friend_profile?.schedule_visibility === "public");
  }, [friends]);

  // Fetch friend's schedule when selected or week changes
  useEffect(() => {
    if (!selectedFriendId) {
      setFriendSchedules([]);
      setFriendPlannedEvents([]);
      return;
    }

    const loadFriendSchedule = async () => {
      setIsLoadingFriend(true);
      try {
        // Calculate date range for current week view
        const startDate = format(currentWeekStart, "yyyy-MM-dd");
        const endDate = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");
        
        const data = await getFriendSchedule(selectedFriendId, startDate, endDate);
        if (data) {
          setFriendSchedules((data.classSchedules || []) as ClassSchedule[]);
          setFriendPlannedEvents(data.plannedEvents || []);
        } else {
          setFriendSchedules([]);
          setFriendPlannedEvents([]);
        }
      } catch (error) {
        console.error("Error loading friend schedule:", error);
        setFriendSchedules([]);
        setFriendPlannedEvents([]);
      } finally {
        setIsLoadingFriend(false);
      }
    };

    loadFriendSchedule();
  }, [selectedFriendId, getFriendSchedule, currentWeekStart]);

  // In compare mode, show both schedules. Otherwise, show friend's or user's
  const displayedSchedules = compareMode 
    ? classSchedules 
    : (selectedFriendId ? friendSchedules : classSchedules);
  const displayedAssignments = selectedFriendId && !compareMode ? [] : assignments;
  const displayedGeneratedSchedules = selectedFriendId && !compareMode ? [] : generatedSchedules;

  const selectedFriend = publicFriends.find(f => 
    (f.user_id === selectedFriendId || f.friend_id === selectedFriendId) &&
    f.friend_profile?.user_id === selectedFriendId
  );

  // Reset compare mode when friend is deselected
  useEffect(() => {
    if (!selectedFriendId) {
      setCompareMode(false);
    }
  }, [selectedFriendId]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const getClassesForDay = (date: Date) => {
    const dayOfWeek = date.getDay();
    return displayedSchedules.filter((s) => s.day_of_week === dayOfWeek);
  };

  const getAssignmentsForDay = (date: Date) => {
    return displayedAssignments.filter((a) => {
      const dueDate = new Date(a.due_date);
      return isSameDay(dueDate, date);
    });
  };

  const getGeneratedBlocksForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const daySchedule = displayedGeneratedSchedules.find((s) => s.date === dateStr);
    return daySchedule?.blocks || [];
  };

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours + minutes / 60;
  };

  const getBlockStyle = (
    startTime: string,
    endTime: string,
    columnIndex: number = 0,
    totalColumns: number = 1,
  ) => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    const top = ((start - 6) / 18) * 100; // 18 hours from 6 AM to midnight
    const height = ((end - start) / 18) * 100;

    // Use actual time-based height to avoid vertical overlap on packed days.
    const safeHeight = Math.max(height, 0);

    const widthPct = 100 / totalColumns;
    const leftPct = columnIndex * widthPct;
    const colGapPx = 4;

    return {
      top: `${top}%`,
      height: `${safeHeight}%`,
      left: `calc(${leftPct}% + ${colGapPx / 2}px)`,
      width: `calc(${widthPct}% - ${colGapPx}px)`,
    };
  };

  // Check if two time blocks overlap
  const blocksOverlap = (start1: string, end1: string, start2: string, end2: string) => {
    const s1 = parseTime(start1);
    const e1 = parseTime(end1);
    const s2 = parseTime(start2);
    const e2 = parseTime(end2);
    return s1 < e2 && s2 < e1;
  };

  // Calculate column positions for overlapping blocks
  const getBlockPositions = (blocks: Array<{ id: string; startTime: string; endTime: string }>) => {
    if (blocks.length === 0) return new Map<string, { column: number; totalColumns: number }>();
    
    // Sort by start time
    const sorted = [...blocks].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
    
    // Track which column each block is in
    const positions = new Map<string, { column: number; totalColumns: number }>();
    const columns: Array<{ endTime: string }> = [];
    
    for (const block of sorted) {
      // Find first available column
      let columnIndex = 0;
      for (let i = 0; i < columns.length; i++) {
        if (parseTime(columns[i].endTime) <= parseTime(block.startTime)) {
          columnIndex = i;
          columns[i] = { endTime: block.endTime };
          break;
        }
        columnIndex = i + 1;
      }
      
      if (columnIndex >= columns.length) {
        columns.push({ endTime: block.endTime });
      } else {
        columns[columnIndex] = { endTime: block.endTime };
      }
      
      positions.set(block.id, { column: columnIndex, totalColumns: 1 });
    }
    
    // Calculate total columns for each block based on overlapping blocks
    for (const block of sorted) {
      const overlappingBlocks = sorted.filter(other => 
        other.id !== block.id && blocksOverlap(block.startTime, block.endTime, other.startTime, other.endTime)
      );
      const maxColumn = Math.max(
        positions.get(block.id)!.column,
        ...overlappingBlocks.map(b => positions.get(b.id)!.column)
      );
      const totalColumns = maxColumn + 1;
      
      positions.set(block.id, { ...positions.get(block.id)!, totalColumns });
      for (const other of overlappingBlocks) {
        positions.set(other.id, { ...positions.get(other.id)!, totalColumns });
      }
    }
    
    return positions;
  };

  // Get friend's planned events for a specific day
  const getFriendEventsForDay = (date: Date) => {
    if (!selectedFriendId) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return friendPlannedEvents.filter(e => e.event_date === dateStr);
  };

  // Get friend's class schedules for a specific day
  const getFriendClassesForDay = (date: Date) => {
    const dayOfWeek = date.getDay();
    return friendSchedules.filter((s) => s.day_of_week === dayOfWeek);
  };

  // Calculate free time slots when both users are available (for compare mode)
  const getFreeTimeSlots = useCallback((date: Date) => {
    if (!compareMode || !selectedFriendId) return [];

    // Collect all busy times for user
    const userBusy: Array<{ start: number; end: number }> = [];
    
    // User's classes
    getClassesForDay(date).forEach(c => {
      userBusy.push({ start: parseTime(c.start_time), end: parseTime(c.end_time) });
    });
    
    // User's events
    getUserEventsForDay(date).forEach(e => {
      userBusy.push({ start: parseTime(e.start_time), end: parseTime(e.end_time) });
    });
    
    // User's generated schedules
    getGeneratedBlocksForDay(date).forEach(b => {
      userBusy.push({ start: parseTime(b.startTime), end: parseTime(b.endTime) });
    });

    // Collect all busy times for friend
    const friendBusy: Array<{ start: number; end: number }> = [];
    
    // Friend's classes
    getFriendClassesForDay(date).forEach(c => {
      friendBusy.push({ start: parseTime(c.start_time), end: parseTime(c.end_time) });
    });
    
    // Friend's events
    getFriendEventsForDay(date).forEach(e => {
      friendBusy.push({ start: parseTime(e.start_time), end: parseTime(e.end_time) });
    });

    // Merge overlapping busy periods
    const mergeBusy = (busy: Array<{ start: number; end: number }>) => {
      if (busy.length === 0) return [];
      const sorted = [...busy].sort((a, b) => a.start - b.start);
      const merged: Array<{ start: number; end: number }> = [sorted[0]];
      for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        if (sorted[i].start <= last.end) {
          last.end = Math.max(last.end, sorted[i].end);
        } else {
          merged.push(sorted[i]);
        }
      }
      return merged;
    };

    const userMerged = mergeBusy(userBusy);
    const friendMerged = mergeBusy(friendBusy);

    // Combine both users' busy times
    const allBusy = mergeBusy([...userMerged, ...friendMerged]);

    // Find free slots between 8 AM and 10 PM
    const dayStart = 8; // 8 AM
    const dayEnd = 22; // 10 PM
    const freeSlots: Array<{ startTime: string; endTime: string }> = [];
    
    let currentTime = dayStart;
    for (const busy of allBusy) {
      if (busy.start > currentTime && busy.start <= dayEnd) {
        const freeEnd = Math.min(busy.start, dayEnd);
        if (freeEnd - currentTime >= 0.5) { // At least 30 min free
          const startHour = Math.floor(currentTime);
          const startMin = Math.round((currentTime - startHour) * 60);
          const endHour = Math.floor(freeEnd);
          const endMin = Math.round((freeEnd - endHour) * 60);
          freeSlots.push({
            startTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:00`,
            endTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`,
          });
        }
      }
      currentTime = Math.max(currentTime, busy.end);
    }
    
    // Check for free time after last busy period
    if (currentTime < dayEnd) {
      const startHour = Math.floor(currentTime);
      const startMin = Math.round((currentTime - startHour) * 60);
      freeSlots.push({
        startTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:00`,
        endTime: `${dayEnd}:00:00`,
      });
    }

    return freeSlots;
  }, [compareMode, selectedFriendId, getClassesForDay, getUserEventsForDay, getGeneratedBlocksForDay, getFriendClassesForDay, getFriendEventsForDay, parseTime]);

  // Get all blocks for a day combined
  const getAllBlocksForDay = (date: Date) => {
    // User's classes (always show in compare mode, or when viewing own schedule)
    const classes = getClassesForDay(date).map(c => ({
      id: c.id,
      startTime: c.start_time,
      endTime: c.end_time,
      type: 'class' as const,
      data: c,
      isOwn: true,
    }));

    // Include user's planned events (from database) when viewing own schedule or in compare mode
    const userEvents = getUserEventsForDay(date).map(e => ({
      id: e.id,
      startTime: e.start_time,
      endTime: e.end_time,
      type: 'user_event' as const,
      data: e,
      isOwn: true,
    }));

    // Filter generated blocks to exclude any that are already saved in userEvents
    const generatedBlocks = getGeneratedBlocksForDay(date);
    const filteredGenerated = generatedBlocks
      .filter(b => {
        const isDuplicate = userEvents.some(ue => {
          const userEventData = ue.data as PlannedEvent;
          return (
            userEventData.title === b.title &&
            userEventData.start_time === b.startTime
          );
        });
        return !isDuplicate;
      })
      .map(b => ({
        id: b.id,
        startTime: b.startTime,
        endTime: b.endTime,
        type: 'generated' as const,
        data: b,
        isOwn: true,
      }));

    // Include friend's classes in compare mode
    const friendClasses = (compareMode ? getFriendClassesForDay(date) : []).map(c => ({
      id: `friend-class-${c.id}`,
      startTime: c.start_time,
      endTime: c.end_time,
      type: 'friend_class' as const,
      data: c,
      isOwn: false,
    }));

    // Include friend's planned events when viewing a friend's schedule or in compare mode
    const friendEvents = getFriendEventsForDay(date).map(e => ({
      id: e.id,
      startTime: e.start_time,
      endTime: e.end_time,
      type: 'friend_event' as const,
      data: e,
      isOwn: false,
    }));
    
    return [...classes, ...friendClasses, ...filteredGenerated, ...friendEvents, ...userEvents];
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden"
    >
      {/* Header with navigation and friend selector */}
      <div className="flex items-center justify-between p-4 border-b border-border gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onWeekChange(subWeeks(currentWeekStart, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onWeekChange(addWeeks(currentWeekStart, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Friend selector and compare toggle */}
        <div className="flex items-center gap-3">
          {selectedFriendId ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFriendId(null)}
                className="text-xs"
              >
                <User className="h-3 w-3 mr-1" />
                Your Schedule
              </Button>
              
              {/* Compare mode toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
                <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="compare-mode" className="text-xs font-medium cursor-pointer">
                  Compare
                </Label>
                <Switch
                  id="compare-mode"
                  checked={compareMode}
                  onCheckedChange={setCompareMode}
                  className="scale-75"
                />
              </div>
            </>
          ) : null}
          
          <Select
            value={selectedFriendId || ""}
            onValueChange={(val) => setSelectedFriendId(val || null)}
          >
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <Users className="h-3 w-3 mr-1" />
              <SelectValue placeholder="View friend's schedule" />
            </SelectTrigger>
            <SelectContent>
              {publicFriends.length > 0 ? (
                publicFriends.map((friendship) => {
                  const friendId = friendship.friend_profile?.user_id;
                  const friendName = friendship.friend_profile?.display_name || 
                                     friendship.friend_profile?.username || 
                                     "Unknown";
                  return (
                    <SelectItem key={friendId} value={friendId || ""}>
                      {friendName}
                    </SelectItem>
                  );
                })
              ) : (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  <p className="font-medium">No friends with public schedules</p>
                  <p className="mt-1">Add friends in the Friends tab and ask them to set their schedule visibility to "Public"</p>
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <h3 className="text-lg font-semibold">
          {format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
        </h3>
      </div>

      {/* Compare mode banner */}
      {compareMode && selectedFriend && (
        <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-rose-500/10 border-b border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/30 border-l-2 border-primary" />
              <span className="font-medium">Your schedule</span>
            </div>
            <span className="text-muted-foreground">vs</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-rose-500/30 border-l-2 border-rose-500" />
              <span className="font-medium">{selectedFriend.friend_profile?.display_name || selectedFriend.friend_profile?.username}'s schedule</span>
            </div>
          </div>
          {isLoadingFriend && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          )}
        </div>
      )}

      {/* Viewing friend banner (non-compare mode) */}
      {selectedFriendId && selectedFriend && !compareMode && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span>
              Viewing <strong>{selectedFriend.friend_profile?.display_name || selectedFriend.friend_profile?.username}</strong>'s schedule
            </span>
          </div>
          {isLoadingFriend && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex">
        {/* Time column */}
        <div className="w-16 flex-shrink-0 border-r border-border">
          <div className="h-12 border-b border-border" /> {/* Header spacer */}
          <div className="relative" style={{ height: "720px" }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-xs text-muted-foreground text-right pr-2"
                style={{ top: `${((hour - 6) / 18) * 100}%` }}
              >
                {hour === 24 ? "12 AM" : format(new Date().setHours(hour, 0), "h a")}
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
              <div className="relative" style={{ height: "720px" }}>
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/50"
                    style={{ top: `${((hour - 6) / 18) * 100}%` }}
                  />
                ))}

                {/* Render all blocks with overlap handling */}
                {(() => {
                  const allBlocks = getAllBlocksForDay(day);
                  const positions = getBlockPositions(allBlocks);
                  
                  const categoryColors: Record<string, string> = {
                    work: "bg-amber-500/20 border-amber-500",
                    personal: "bg-violet-500/20 border-violet-500",
                    health: "bg-emerald-500/20 border-emerald-500",
                    social: "bg-pink-500/20 border-pink-500",
                    errands: "bg-slate-500/20 border-slate-500",
                    leisure: "bg-cyan-500/20 border-cyan-500",
                    meal: "bg-orange-500/20 border-orange-500",
                  };
                  
                  return allBlocks.map((block) => {
                    const pos = positions.get(block.id) || { column: 0, totalColumns: 1 };
                    const style = getBlockStyle(block.startTime, block.endTime, pos.column, pos.totalColumns);
                    
                    if (block.type === 'class') {
                      const classItem = block.data as ClassSchedule;
                      return (
                        <Popover key={classItem.id}>
                          <PopoverTrigger asChild>
                            <div
                              className={`absolute rounded-md px-1 py-0.5 bg-primary/20 border-l-2 border-primary overflow-hidden cursor-pointer hover:bg-primary/30 hover:shadow-md transition-all ${compareMode ? 'ring-1 ring-primary/50' : ''}`}
                              style={style}
                            >
                              {compareMode && (
                                <Badge variant="outline" className="absolute -top-0.5 -right-0.5 text-[7px] px-0.5 py-0 h-3 bg-primary text-primary-foreground border-0">
                                  You
                                </Badge>
                              )}
                              <p className="text-[10px] font-medium text-primary truncate">
                                {classItem.course_name}
                              </p>
                              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {format(new Date(`2000-01-01T${classItem.start_time}`), "h:mm a")}
                              </div>
                              {classItem.location && pos.totalColumns === 1 && (
                                <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                  <MapPin className="h-2 w-2" />
                                  <span className="truncate">{classItem.location}</span>
                                </div>
                              )}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0" align="start">
                            <div className="p-3 border-b border-border bg-primary/5">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm leading-tight">{classItem.course_name}</h4>
                                <Badge variant="secondary" className="text-[10px] shrink-0">Class</Badge>
                              </div>
                            </div>
                            <div className="p-3 space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(new Date(`2000-01-01T${classItem.start_time}`), "h:mm a")} - {format(new Date(`2000-01-01T${classItem.end_time}`), "h:mm a")}
                                </span>
                              </div>
                              {classItem.location && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span>{classItem.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Every {format(day, "EEEE")}</span>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    } else if (block.type === 'friend_class') {
                      // Render friend's classes in compare mode
                      const classItem = block.data as ClassSchedule;
                      return (
                        <Popover key={block.id}>
                          <PopoverTrigger asChild>
                            <div
                              className="absolute rounded-md px-1 py-0.5 bg-rose-500/20 border-l-2 border-rose-500 overflow-hidden cursor-pointer hover:bg-rose-500/30 hover:shadow-md transition-all ring-1 ring-rose-500/50"
                              style={style}
                            >
                              <Badge variant="outline" className="absolute -top-0.5 -right-0.5 text-[7px] px-0.5 py-0 h-3 bg-rose-500 text-white border-0">
                                {selectedFriend?.friend_profile?.display_name?.split(' ')[0] || 'Friend'}
                              </Badge>
                              <p className="text-[10px] font-medium text-rose-700 dark:text-rose-300 truncate">
                                {classItem.course_name}
                              </p>
                              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {format(new Date(`2000-01-01T${classItem.start_time}`), "h:mm a")}
                              </div>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0" align="start">
                            <div className="p-3 border-b border-border bg-rose-500/10">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm leading-tight">{classItem.course_name}</h4>
                                <Badge className="text-[10px] shrink-0 bg-rose-500">
                                  {selectedFriend?.friend_profile?.display_name?.split(' ')[0]}'s Class
                                </Badge>
                              </div>
                            </div>
                            <div className="p-3 space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(new Date(`2000-01-01T${classItem.start_time}`), "h:mm a")} - {format(new Date(`2000-01-01T${classItem.end_time}`), "h:mm a")}
                                </span>
                              </div>
                              {classItem.location && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span>{classItem.location}</span>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    } else if (block.type === 'friend_event') {
                      // Render friend's planned events
                      const friendEvent = block.data as { id: string; title: string; category: string; start_time: string; end_time: string; notes?: string };
                      const colors = compareMode 
                        ? "bg-rose-500/20 border-rose-500 hover:bg-rose-500/30"
                        : (categoryColors[friendEvent.category] || categoryColors.social);
                      const catInfo = categoryInfo[friendEvent.category] || { label: friendEvent.category, color: "bg-pink-500" };
                      return (
                        <Popover key={friendEvent.id}>
                          <PopoverTrigger asChild>
                            <div
                              className={`absolute rounded-md px-1 py-0.5 border-l-2 overflow-hidden cursor-pointer hover:shadow-md transition-all ${colors} ${compareMode ? 'ring-1 ring-rose-500/50' : ''}`}
                              style={style}
                            >
                              {compareMode && (
                                <Badge variant="outline" className="absolute -top-0.5 -right-0.5 text-[7px] px-0.5 py-0 h-3 bg-rose-500 text-white border-0">
                                  {selectedFriend?.friend_profile?.display_name?.split(' ')[0] || 'Friend'}
                                </Badge>
                              )}
                              <p className="text-[10px] font-medium truncate">{friendEvent.title}</p>
                              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {format(new Date(`2000-01-01T${friendEvent.start_time}`), "h:mm a")}
                              </div>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0" align="start">
                            <div className="p-3 border-b border-border bg-secondary/30">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm leading-tight">{friendEvent.title}</h4>
                                <Badge className={`text-[10px] shrink-0 ${catInfo.color} text-white`}>
                                  {catInfo.label}
                                </Badge>
                              </div>
                            </div>
                            <div className="p-3 space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{selectedFriend?.friend_profile?.display_name || "Friend"}'s event</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(new Date(`2000-01-01T${friendEvent.start_time}`), "h:mm a")} - {format(new Date(`2000-01-01T${friendEvent.end_time}`), "h:mm a")}
                                </span>
                              </div>
                              {friendEvent.notes && (
                                <div className="pt-2 border-t border-border">
                                  <p className="text-xs text-muted-foreground">{friendEvent.notes}</p>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    } else if (block.type === 'user_event') {
                      // User's own planned events from database
                      const userEvent = block.data as PlannedEvent;
                      const colors = compareMode
                        ? "bg-primary/20 border-primary hover:bg-primary/30"
                        : (categoryColors[userEvent.category] || categoryColors.work);
                      const catInfo = categoryInfo[userEvent.category] || { label: userEvent.category, color: "bg-amber-500" };
                      return (
                        <Popover key={userEvent.id}>
                          <PopoverTrigger asChild>
                            <div
                              className={`absolute rounded-md px-1 py-0.5 border-l-2 overflow-hidden cursor-pointer hover:shadow-md transition-all group ${colors} ${compareMode ? 'ring-1 ring-primary/50' : ''}`}
                              style={style}
                            >
                              {compareMode && (
                                <Badge variant="outline" className="absolute -top-0.5 -right-0.5 text-[7px] px-0.5 py-0 h-3 bg-primary text-primary-foreground border-0">
                                  You
                                </Badge>
                              )}
                              <div className="flex items-start justify-between">
                                <p className="text-[10px] font-medium truncate flex-1">{userEvent.title}</p>
                                {userEvent.is_private && !compareMode && (
                                  <Lock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {format(new Date(`2000-01-01T${userEvent.start_time}`), "h:mm a")}
                              </div>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0" align="start">
                            <div className="p-3 border-b border-border bg-secondary/30">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm leading-tight">{userEvent.title}</h4>
                                <div className="flex items-center gap-1">
                                  {userEvent.is_private && (
                                    <Badge variant="outline" className="text-[10px]">
                                      <Lock className="h-2.5 w-2.5 mr-0.5" />
                                      Private
                                    </Badge>
                                  )}
                                  <Badge className={`text-[10px] ${catInfo.color} text-white`}>
                                    {catInfo.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(userEvent.event_date), "EEEE, MMMM d, yyyy")}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(new Date(`2000-01-01T${userEvent.start_time}`), "h:mm a")} - {format(new Date(`2000-01-01T${userEvent.end_time}`), "h:mm a")}
                                  <span className="ml-1 text-xs">({userEvent.duration} min)</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Tag className="h-4 w-4" />
                                <span className="capitalize">{userEvent.category}</span>
                              </div>
                              {userEvent.notes && (
                                <div className="pt-2 border-t border-border">
                                  <p className="text-xs text-muted-foreground">{userEvent.notes}</p>
                                </div>
                              )}
                            </div>
                            <div className="p-3 pt-0 flex items-center justify-between gap-2">
                              <EventPrivacyToggle
                                eventId={userEvent.id}
                                isPrivate={userEvent.is_private}
                                onToggle={updateEventPrivacy}
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEventToDelete(userEvent.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    } else if (block.type === 'generated') {
                      // Generated schedule blocks (user's own - from chat, not yet saved)
                      const genBlock = block.data as ScheduleBlock;
                      const colors = compareMode
                        ? "bg-primary/20 border-primary hover:bg-primary/30"
                        : (categoryColors[genBlock.category] || categoryColors.work);
                      const catInfo = categoryInfo[genBlock.category] || { label: genBlock.category, color: "bg-amber-500" };
                      return (
                        <Popover key={genBlock.id}>
                          <PopoverTrigger asChild>
                            <div
                              className={`absolute rounded-md px-1 py-0.5 border-l-2 overflow-hidden cursor-pointer hover:shadow-md transition-all ${colors} ${compareMode ? 'ring-1 ring-primary/50' : ''}`}
                              style={style}
                            >
                              {compareMode && (
                                <Badge variant="outline" className="absolute -top-0.5 -right-0.5 text-[7px] px-0.5 py-0 h-3 bg-primary text-primary-foreground border-0">
                                  You
                                </Badge>
                              )}
                              <p className="text-[10px] font-medium truncate">{genBlock.title}</p>
                              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                <Clock className="h-2 w-2" />
                                {format(new Date(`2000-01-01T${genBlock.startTime}`), "h:mm a")}
                              </div>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0" align="start">
                            <div className="p-3 border-b border-border bg-secondary/30">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm leading-tight">{genBlock.title}</h4>
                                <Badge className={`text-[10px] ${catInfo.color} text-white`}>
                                  {catInfo.label}
                                </Badge>
                              </div>
                            </div>
                            <div className="p-3 space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(new Date(`2000-01-01T${genBlock.startTime}`), "h:mm a")} - {format(new Date(`2000-01-01T${genBlock.endTime}`), "h:mm a")}
                                </span>
                              </div>
                              <div className="pt-2 border-t border-border">
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                  ✨ AI-generated • Save your schedule to keep this event
                                </p>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    }
                    return null;
                  });
                })()}

                {/* Free time slots in compare mode */}
                {compareMode && (() => {
                  const freeSlots = getFreeTimeSlots(day);
                  return freeSlots.map((slot, index) => {
                    const style = getBlockStyle(slot.startTime, slot.endTime);
                    return (
                      <div
                        key={`free-${index}`}
                        className="absolute rounded-md px-1 py-0.5 bg-emerald-500/15 border border-dashed border-emerald-500/50 overflow-hidden pointer-events-none"
                        style={style}
                      >
                        <p className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                          ✓ Both free
                        </p>
                        <div className="flex items-center gap-0.5 text-[8px] text-emerald-600/70 dark:text-emerald-400/70">
                          <Clock className="h-2 w-2" />
                          {format(new Date(`2000-01-01T${slot.startTime}`), "h:mm a")} - {format(new Date(`2000-01-01T${slot.endTime}`), "h:mm a")}
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Assignment due indicators (shown at top of day) */}
                {getAssignmentsForDay(day).length > 0 && !compareMode && (
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
        {compareMode ? (
          // Compare mode legend
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20 border-l-2 border-primary ring-1 ring-primary/50" />
              <span>Your events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-rose-500/20 border-l-2 border-rose-500 ring-1 ring-rose-500/50" />
              <span>{selectedFriend?.friend_profile?.display_name || "Friend"}'s events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500/15 border border-dashed border-emerald-500/50" />
              <span className="text-emerald-600 dark:text-emerald-400">Both free</span>
            </div>
          </>
        ) : (
          // Standard legend
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20 border-l-2 border-primary" />
              <span>Classes</span>
            </div>
            {!selectedFriendId && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-destructive/20 border-l-2 border-destructive" />
                  <span>Assignments Due</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  <span>Private Event</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span>Public Event</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500/20 border-l-2 border-amber-500" />
              <span>{selectedFriendId ? "Planned Events" : "Scheduled Tasks"}</span>
            </div>
            {selectedFriendId && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-pink-500/20 border-l-2 border-pink-500" />
                <span>Social/Meetups</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Event Confirmation */}
      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
