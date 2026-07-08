// Exportiert Aufgaben als iCalendar-Datei (.ics) — importierbar in Google
// Kalender, Apple Kalender, Outlook. Jede Aufgabe wird ein ganztägiger Termin
// am Fälligkeitsdatum; wiederkehrende Aufgaben bekommen eine RRULE.
//
// Das ist ein Schnappschuss-Export, keine Live-Synchronisation: spätere
// Änderungen in der App landen erst beim nächsten Export im Kalender.

import type { Task } from '../../data'
import { addDays } from '../../shared/dates'
import { taskTypeIcons } from '../../shared/texts'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Aktueller Zeitpunkt als UTC-Zeitstempel (yyyymmddThhmmssZ) für DTSTAMP */
function icsStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/** yyyy-mm-dd → yyyymmdd (für ganztägige VALUE=DATE-Termine) */
function icsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

/** Sonderzeichen in Text-Feldern gemäß RFC 5545 maskieren */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Lange Zeilen auf 75 Zeichen falten (Fortsetzung beginnt mit einem Leerzeichen) */
function fold(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = [line.slice(0, 75)]
  let rest = line.slice(75)
  while (rest.length) {
    parts.push(' ' + rest.slice(0, 74))
    rest = rest.slice(74)
  }
  return parts.join('\r\n')
}

/**
 * Baut den iCalendar-Text. `describe` liefert den Beschreibungstext je Aufgabe
 * (z. B. Pflanze/Beet); `stamp` ist überschreibbar für deterministische Tests.
 */
export function buildTasksIcs(
  tasks: Task[],
  describe: (task: Task) => string = () => '',
  stamp: Date = new Date(),
): string {
  const dtstamp = icsStamp(stamp)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mein Garten//Aufgaben//DE',
    'CALSCALE:GREGORIAN',
  ]

  for (const task of tasks) {
    const summary = `${taskTypeIcons[task.type]} ${task.title}`.trim()
    const description = describe(task)
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${task.id}@meingarten`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART;VALUE=DATE:${icsDate(task.dueDate)}`)
    lines.push(`DTEND;VALUE=DATE:${icsDate(addDays(task.dueDate, 1))}`)
    lines.push(fold(`SUMMARY:${escapeText(summary)}`))
    if (description) lines.push(fold(`DESCRIPTION:${escapeText(description)}`))
    if (task.intervalDays && task.intervalDays > 0) {
      lines.push(`RRULE:FREQ=DAILY;INTERVAL=${task.intervalDays}`)
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

/** Baut die .ics-Datei und startet den Download. */
export function downloadTasksIcs(tasks: Task[], describe?: (task: Task) => string): void {
  const ics = buildTasksIcs(tasks, describe)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mein-garten-aufgaben.ics'
  a.click()
  URL.revokeObjectURL(url)
}
