import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, RotateCcw, Trash2, User, LogOut, BookOpen, LayoutGrid, List } from "lucide-react";
import { startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { ScheduleView } from "@/components/ScheduleView";
import { AuthDialog } from "@/components/AuthDialog";
import { SyllabusUpload } from "@/components/SyllabusUpload";
import { WeeklyCalendarView } from "@/components/WeeklyCalendarView";
import { useScheduler } from "@/hooks/useScheduler";
import { useAuth } from "@/hooks/useAuth";
import { useSyllabus } from "@/hooks/useSyllabus";
import { downloadICS } from "@/lib/calendar-export";

const Index = () => {
  const { user, loading: authLoading, signOut, isAuthenticated } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("planner");
  const [showWeeklyView, setShowWeeklyView] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  const { messages, schedules, summary, isLoading, hasSchedule, sendMessage, resetSchedule, clearAll } = useScheduler(
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
    deleteSyllabus,
  } = useSyllabus(user?.id);

  const handleExport = (format: "ics") => {
    if (schedules.length > 0) {
      const dateStr = schedules[0].date;
      downloadICS(schedules, `schedule-${dateStr}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    clearAll();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-hero">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold">Daily Planner</h1>
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
        {/* Tabs for Planner / Courses / Weekly View */}
        {isAuthenticated && (
          <div className="mb-6 space-y-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="planner" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Planner
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Weekly
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Courses
                  {upcomingAssignments.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {upcomingAssignments.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
              />
            </motion.div>
          ) : activeTab === "courses" && isAuthenticated ? (
            <motion.div key="courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SyllabusUpload
                syllabi={syllabi}
                assignments={assignments}
                classSchedules={classSchedules}
                isUploading={isUploading}
                onUpload={uploadSyllabus}
                onToggleComplete={toggleAssignmentComplete}
                onDeleteSyllabus={deleteSyllabus}
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
                    className="inline-flex p-4 rounded-2xl gradient-hero shadow-glow mb-6"
                  >
                    <CalendarDays className="h-10 w-10 text-primary-foreground" />
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
