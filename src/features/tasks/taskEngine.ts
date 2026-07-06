// Kernlogik für Aufgaben — bewusst framework-frei und testbar.

import { createEntity, touch, type Plant, type Planting, type Task } from '../../data'
import { addDays, todayIso } from '../../shared/dates'

/**
 * Schließt eine Aufgabe ab. Bei wiederkehrenden Aufgaben (intervalDays)
 * wird die Folgeaufgabe erzeugt, fällig in n Tagen ab heute.
 */
export function completeTask(task: Task, today = todayIso()): { done: Task; next: Task | null } {
  const done = touch({ ...task, doneAt: new Date().toISOString() })
  let next: Task | null = null
  if (task.intervalDays !== null && task.intervalDays > 0) {
    next = createEntity<Task>({
      title: task.title,
      type: task.type,
      dueDate: addDays(today, task.intervalDays),
      intervalDays: task.intervalDays,
      plantId: task.plantId,
      bedId: task.bedId,
      auto: task.auto,
      doneAt: null,
      notes: task.notes,
    })
  }
  return { done, next }
}

/**
 * Leitet Pflegeaufgaben aus den Pflegeintervallen der Pflanzen ab:
 * Für jede aktive Bepflanzung, deren Pflanze ein Gieß-/Düngeintervall hat
 * und für die noch keine offene automatische Aufgabe existiert, wird eine
 * wiederkehrende Aufgabe erzeugt (fällig heute).
 */
export function generateCareTasks(
  plants: Plant[],
  activePlantings: Planting[],
  openTasks: Task[],
  today = todayIso(),
): Task[] {
  const plantById = new Map(plants.map((p) => [p.id, p]))
  const newTasks: Task[] = []

  const hasOpenTask = (plantId: string, bedId: string, type: Task['type']) =>
    openTasks.some((t) => t.auto && t.plantId === plantId && t.bedId === bedId && t.type === type) ||
    newTasks.some((t) => t.plantId === plantId && t.bedId === bedId && t.type === type)

  for (const planting of activePlantings) {
    const plant = plantById.get(planting.plantId)
    if (!plant) continue

    const care: { type: Task['type']; interval: number | null; label: string }[] = [
      { type: 'giessen', interval: plant.wateringIntervalDays, label: 'Gießen' },
      { type: 'duengen', interval: plant.fertilizingIntervalDays, label: 'Düngen' },
    ]

    for (const { type, interval, label } of care) {
      if (interval === null || interval <= 0) continue
      if (hasOpenTask(plant.id, planting.bedId, type)) continue
      newTasks.push(
        createEntity<Task>({
          title: `${label}: ${plant.name}`,
          type,
          dueDate: today,
          intervalDays: interval,
          plantId: plant.id,
          bedId: planting.bedId,
          auto: true,
          doneAt: null,
          notes: '',
        }),
      )
    }
  }

  return newTasks
}
