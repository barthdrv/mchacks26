# SnowPlanner ❄️

An AI-powered daily schedule planner that helps students organize their time, manage courses, and coordinate with friends.

## Features

### 🤖 AI Schedule Generation
- Chat-based interface to describe your day naturally
- AI generates optimized visual time blocks for your activities
- Export schedules to Apple Calendar, Google Calendar, or other ICS-compatible apps

### 📚 Course Management
- Upload syllabi (PDF) for automatic parsing of assignments and class schedules
- Track homework assignments with due dates and completion status
- Manually add classes with recurring weekly schedules

### 📅 Weekly Calendar View
- Visual weekly calendar showing all your classes and planned events
- Color-coded categories (classes, study time, breaks, meals, etc.)
- Toggle between daily planner and weekly overview

### 👥 Friends & Schedule Comparison
- Add friends by username to view their schedules
- **Multi-select comparison**: Compare your schedule with multiple friends simultaneously
- Find common free time slots across all selected schedules
- Privacy controls for your events (public/private)

### 🔐 Authentication
- Secure user accounts with email/password authentication
- Profile management with customizable display names and usernames
- Schedule visibility settings (public, friends-only, private)

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Animations**: Framer Motion
- **Backend**: Lovable Cloud (Supabase)
  - PostgreSQL database with Row Level Security
  - Edge Functions for AI integration and syllabus parsing
  - Real-time subscriptions
- **AI**: Lovable AI (GPT-based schedule generation)

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── AuthDialog.tsx   # Authentication modal
│   ├── ChatInput.tsx    # Message input for AI chat
│   ├── FriendsTab.tsx   # Friend management & comparison
│   ├── ScheduleView.tsx # Daily schedule visualization
│   ├── SyllabusUpload.tsx # Course/syllabus management
│   ├── WeeklyCalendarView.tsx # Weekly calendar with friend comparison
│   └── ...
├── hooks/
│   ├── useAuth.ts       # Authentication state
│   ├── useFriends.ts    # Friend relationships
│   ├── usePlannedEvents.ts # Event CRUD operations
│   ├── useScheduler.ts  # AI chat & schedule generation
│   └── useSyllabus.ts   # Syllabus & assignment management
├── pages/
│   └── Index.tsx        # Main dashboard
├── types/
│   ├── schedule.ts      # Schedule type definitions
│   └── syllabus.ts      # Syllabus type definitions
└── lib/
    ├── calendar-export.ts # ICS file generation
    └── utils.ts          # Utility functions

supabase/
└── functions/
    ├── generate-schedule/ # AI schedule generation
    └── parse-syllabus/    # PDF syllabus parsing
```

## Database Schema

- **profiles**: User profiles with display names and privacy settings
- **syllabi**: Uploaded course syllabi
- **class_schedules**: Recurring weekly class times
- **homework_assignments**: Assignments with due dates
- **planned_events**: User's scheduled events (from AI or manual)
- **friendships**: Friend relationships between users
- **friend_requests**: Pending friend requests

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`

## Live Demo

Visit [snowplanner.ca](https://snowplanner.ca) to try the app.

## License

MIT