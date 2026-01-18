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

function formatDateForGoogle(date: string, time: string): string {
  const [year, month, day] = date.split("-");
  const [hours, minutes] = time.split(":");
  return `${year}${month}${day}T${hours}${minutes}00`;
}

export function openGoogleCalendar(schedules: ScheduleDay[]): void {
  // Google Calendar only supports adding one event at a time via URL
  // We'll open the first event and show instructions for the rest
  if (schedules.length === 0 || schedules[0].blocks.length === 0) return;

  const firstDay = schedules[0];
  const firstBlock = firstDay.blocks[0];
  
  const startDate = formatDateForGoogle(firstDay.date, firstBlock.startTime);
  const endDate = formatDateForGoogle(firstDay.date, firstBlock.endTime);
  
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: firstBlock.title,
    dates: `${startDate}/${endDate}`,
    details: firstBlock.notes || `Category: ${firstBlock.category}`,
  });

  const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
  window.open(url, "_blank");
}

export function exportToCalendar(
  schedules: ScheduleDay[],
  format: "apple" | "google",
  filename: string = "schedule"
): void {
  if (format === "apple") {
    downloadICS(schedules, filename);
  } else {
    // For Google, we download ICS too since it's more reliable for multiple events
    // User can import the ICS file into Google Calendar
    downloadICS(schedules, filename);
    // Also open Google Calendar import page
    window.open("https://calendar.google.com/calendar/r/settings/export", "_blank");
  }
}
