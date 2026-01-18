import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, RotateCcw, Trash2, User, LogOut, BookOpen, LayoutGrid, ChevronDown, ChevronUp, Upload, X, ArrowUp, Users } from "lucide-react";
import { SnowLogo } from "@/components/SnowLogo";
import { Snowfall } from "@/components/Snowfall";
import { startOfWeek, format, parseISO, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { ScheduleView } from "@/components/ScheduleView";
import { AuthDialog } from "@/components/AuthDialog";
import { SyllabusUpload } from "@/components/SyllabusUpload";
import { WeeklyCalendarView } from "@/components/WeeklyCalendarView";
import { FriendsTab } from "@/components/FriendsTab";
import { useScheduler } from "@/hooks/useScheduler";
import { useAuth } from "@/hooks/useAuth";
import { useSyllabus } from "@/hooks/useSyllabus";
import { useFriends } from "@/hooks/useFriends";
import { exportToCalendar } from "@/lib/calendar-export";

const Index = () => {
  const { user, loading: authLoading, signOut, isAuthenticated } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("planner");
  const [showWeeklyView, setShowWeeklyView] = useState(false);
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showSyllabusHint, setShowSyllabusHint] = useState(() => {
    return localStorage.getItem("hideSyllabusHint") !== "true";
  });

  const { messages, schedules, summary, isLoading, hasSchedule, sendMessage, resetSchedule, clearAll, removeScheduleBlocksForText } = useScheduler(
    user?.id,
  );

  const {
    syllabi,
    assignments,
    classSchedules,
    upcomingAssignments,
    isUploading,
    uploadSyllabus,
    toggleAssignmentComplete,
    deleteAssignment,
    deleteSyllabus,
    updateSyllabus,
    addClassSchedule,
    updateClassSchedule,
    deleteClassSchedule,
  } = useSyllabus(user?.id);

  const { incomingRequests } = useFriends();

  const handleExport = (format: "apple" | "google") => {
    if (schedules.length > 0) {
      const dateStr = schedules[0].date;
      exportToCalendar(schedules, format, `schedule-${dateStr}`);
    }
  };

  const handleToggleAssignmentComplete = async (id: string, completed: boolean) => {
    await toggleAssignmentComplete(id, completed);

    // If an assignment was completed, remove any existing study/work blocks that mention it.
    if (completed) {
      const assignment = assignments.find((a) => a.id === id);
      if (assignment?.title) {
        removeScheduleBlocksForText(assignment.title);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    clearAll();
  };

  return (
    <div className="min-h-screen bg-background relative">
      <Snowfall />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SnowLogo size="sm" />
            <h1 className="text-xl font-semibold">snow.</h1>
          </div>
          <div className="flex items-center gap-2">
            {(messages.length > 0 || hasSchedule) && (
              <Button
                onClick={clearAll}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
            {isAuthenticated ? (
              <Button onClick={handleSignOut} variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            ) : (
              <Button onClick={() => setAuthDialogOpen(true)} variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Tabs for Planner / Courses / Weekly View - Always visible when authenticated */}
        {isAuthenticated && (
          <div className="mb-6 space-y-3">
            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); }}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="planner" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Planner
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Weekly
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex items-center gap-2 relative">
                  <BookOpen className="h-4 w-4" />
                  Courses
                  {upcomingAssignments.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {upcomingAssignments.length}
                    </span>
                  )}
                  {syllabi.length === 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-accent text-accent-foreground rounded-full animate-pulse">
                      <Upload className="h-2.5 w-2.5" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="friends" className="flex items-center gap-2 relative">
                  <Users className="h-4 w-4" />
                  Friends
                  {incomingRequests.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                      {incomingRequests.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Hint bubble pointing to Courses tab when on Planner */}
            <AnimatePresence>
              {activeTab === "planner" && syllabi.length === 0 && showSyllabusHint && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex justify-end pr-2"
                >
                  <div className="relative">
                    {/* Animated arrow pointing up */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                      className="absolute -top-5 right-8"
                    >
                      <ArrowUp className="h-4 w-4 text-primary" />
                    </motion.div>
                    
                    <div className="flex items-center gap-1 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg shadow-lg">
                      <button
                        onClick={() => setActiveTab("courses")}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Upload className="h-3 w-3" />
                        Import your syllabus in Courses
                      </button>
                      <button
                        onClick={() => {
                          setShowSyllabusHint(false);
                          localStorage.setItem("hideSyllabusHint", "true");
                        }}
                        className="ml-2 p-0.5 rounded hover:bg-primary-foreground/20 transition-colors"
                        aria-label="Dismiss hint"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "weekly" && isAuthenticated ? (
            <motion.div key="weekly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WeeklyCalendarView
                classSchedules={classSchedules}
                assignments={assignments}
                generatedSchedules={schedules}
                currentWeekStart={currentWeekStart}
                onWeekChange={setCurrentWeekStart}
                userId={user?.id}
              />
            </motion.div>
          ) : activeTab === "friends" && isAuthenticated ? (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FriendsTab />
            </motion.div>
          ) : activeTab === "courses" && isAuthenticated ? (
            <motion.div key="courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SyllabusUpload
                syllabi={syllabi}
                assignments={assignments}
                classSchedules={classSchedules}
                isUploading={isUploading}
                onUpload={uploadSyllabus}
                onToggleComplete={handleToggleAssignmentComplete}
                onDeleteAssignment={deleteAssignment}
                onDeleteSyllabus={deleteSyllabus}
                onUpdateSyllabus={updateSyllabus}
                onAddClassSchedule={addClassSchedule}
                onUpdateClassSchedule={updateClassSchedule}
                onDeleteClassSchedule={deleteClassSchedule}
              />
            </motion.div>
          ) : !hasSchedule ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Welcome section */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-12"
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mb-6"
                  >
                    <SnowLogo size="lg" className="shadow-glow" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-3">What do you want to do today?</h2>
                  <p className="text-lg text-muted-foreground max-w-md mx-auto">
                    Tell me about your plans, tasks, and goals. I'll create a personalized schedule for you.
                  </p>
                  {!isAuthenticated && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-4 text-sm text-muted-foreground"
                    >
                      <button
                        onClick={() => setAuthDialogOpen(true)}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Sign in
                      </button>{" "}
                      to upload syllabi and automatically include classes & homework in your schedule.
                    </motion.p>
                  )}
                  {isAuthenticated && syllabi.length > 0 && upcomingAssignments.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-4 p-3 bg-primary/10 rounded-xl text-sm"
                    >
                      📚 You have <strong>{upcomingAssignments.length}</strong> upcoming assignments. I'll automatically
                      incorporate them into your schedule!
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Messages */}
              {messages.length > 0 && (
                <div className="space-y-4 mb-6">
                  {messages.map((message, index) => (
                    <MessageBubble key={message.id} message={message} index={index} />
                  ))}
                </div>
              )}

              {/* Chat input */}
              <ChatInput
                onSend={sendMessage}
                isLoading={isLoading}
                placeholder={
                  messages.length === 0
                    ? "e.g., I need to work on my presentation, hit the gym, and meet Sarah for coffee..."
                    : "Update your schedule or add more details..."
                }
              />

              {/* Example prompts */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap justify-center gap-2"
                >
                  {[
                    "Plan a productive work day",
                    "Schedule gym, work, and dinner",
                    isAuthenticated && syllabi.length > 0
                      ? "Help me catch up on homework"
                      : "Help me balance work and relaxation",
                  ]
                    .filter(Boolean)
                    .map((example) => (
                      <button
                        key={example}
                        onClick={() => sendMessage(example as string)}
                        className="px-4 py-2 text-sm rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ScheduleView schedules={schedules} summary={summary} onEdit={resetSchedule} onExport={handleExport} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
};

export default Index;
