import { describe, expect, it } from 'vitest'
import { createEntity, type Task } from '../../data'
import { buildTasksIcs } from './taskCalendar'

function makeTask(overrides: Partial<Task> = {}): Task {
  return createEntity<Task>({
    title: 'Gießen: Tomate',
    type: 'giessen',
    dueDate: '2026-07-10',
    intervalDays: null,
    plantId: null,
    bedId: null,
    auto: false,
    doneAt: null,
    notes: '',
    ...overrides,
  })
}

const STAMP = new Date('2026-07-07T08:00:00Z')

describe('buildTasksIcs', () => {
  it('erzeugt ein gültiges VCALENDAR-Gerüst mit CRLF-Zeilenenden', () => {
    const ics = buildTasksIcs([makeTask()], () => '', STAMP)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
  })

  it('legt einen ganztägigen Termin am Fälligkeitsdatum an (DTEND = Folgetag)', () => {
    const ics = buildTasksIcs([makeTask()], () => '', STAMP)
    expect(ics).toContain('DTSTART;VALUE=DATE:20260710')
    expect(ics).toContain('DTEND;VALUE=DATE:20260711')
    expect(ics).toContain('SUMMARY:💧 Gießen: Tomate')
    expect(ics).toContain('DTSTAMP:20260707T080000Z')
  })

  it('ergänzt eine RRULE bei wiederkehrenden Aufgaben', () => {
    const ics = buildTasksIcs([makeTask({ intervalDays: 3 })], () => '', STAMP)
    expect(ics).toContain('RRULE:FREQ=DAILY;INTERVAL=3')
  })

  it('lässt die RRULE bei einmaligen Aufgaben weg', () => {
    const ics = buildTasksIcs([makeTask({ intervalDays: null })], () => '', STAMP)
    expect(ics).not.toContain('RRULE')
  })

  it('maskiert Sonderzeichen in der Beschreibung', () => {
    const ics = buildTasksIcs([makeTask()], () => 'Tomate; Hochbeet, Süd', STAMP)
    expect(ics).toContain('DESCRIPTION:Tomate\\; Hochbeet\\, Süd')
  })

  it('erzeugt pro Aufgabe genau ein VEVENT', () => {
    const ics = buildTasksIcs([makeTask(), makeTask({ dueDate: '2026-07-12' })], () => '', STAMP)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
  })
})
