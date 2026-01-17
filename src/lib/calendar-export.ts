import type { ScheduleDay, ScheduleBlock } from "@/types/schedule";

function formatDateForICS(date: string, time: string): string {
  const [year, month, day] = date.split("-");
  const [hours, minutes] = time.split(":");
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@scheduler`;
}

export function generateICS(schedules: ScheduleDay[]): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Daily Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:My Schedule",
  ].join("\r\n");

  for (const day of schedules) {
    for (const block of day.blocks) {
      const dtStart = formatDateForICS(day.date, block.startTime);
      const dtEnd = formatDateForICS(day.date, block.endTime);

      const event = [
        "",
        "BEGIN:VEVENT",
        `UID:${generateUID()}`,
        `DTSTAMP:${timestamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${block.title}`,
        `DESCRIPTION:${block.notes || `Category: ${block.category}`}`,
        `CATEGORIES:${block.category.toUpperCase()}`,
        "END:VEVENT",
      ].join("\r\n");

      icsContent += event;
    }
  }

  icsContent += "\r\nEND:VCALENDAR";
  return icsContent;
}

export function downloadICS(schedules: ScheduleDay[], filename: string = "schedule"): void {
  const icsContent = generateICS(schedules);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
