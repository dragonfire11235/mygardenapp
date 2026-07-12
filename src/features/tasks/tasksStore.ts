import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createEntity, storage, touch, type Plant, type Planting, type Task } from '../../data'
import { daysFromToday } from '../../shared/dates'
import { completeTask, generateCareTasks } from './taskEngine'

export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'doneAt' | 'auto'>

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const loaded = ref(false)

  const openTasks = computed(() =>
    tasks.value
      .filter((t) => t.doneAt === null)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  )

  const doneTasks = computed(() =>
    tasks.value
      .filter((t) => t.doneAt !== null)
      .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
      .slice(0, 30),
  )

  const dueTasks = computed(() => openTasks.value.filter((t) => daysFromToday(t.dueDate) <= 0))
  const overdueCount = computed(() => openTasks.value.filter((t) => daysFromToday(t.dueDate) < 0).length)
  /** Fällige Gießaufgaben (für den „Alles gegossen"-Button) */
  const dueWatering = computed(() => dueTasks.value.filter((t) => t.type === 'giessen'))

  async function load() {
    tasks.value = await storage.tasks.getAll()
    loaded.value = true
  }

  async function create(draft: TaskDraft) {
    await storage.tasks.put(createEntity<Task>({ ...draft, auto: false, doneAt: null }))
    await load()
  }

  async function update(task: Task) {
    await storage.tasks.put(touch(task))
    await load()
  }

  async function remove(id: string) {
    await storage.tasks.softDelete(id)
    await load()
  }

  /** Löscht alle erledigten Aufgaben. Gibt die Anzahl zurück. */
  async function removeDone(): Promise<number> {
    const done = tasks.value.filter((t) => t.doneAt !== null)
    for (const t of done) await storage.tasks.softDelete(t.id)
    if (done.length) await load()
    return done.length
  }

  /** Schließt ab und legt bei Wiederholung die Folgeaufgabe an. Gibt sie zurück (für Toast). */
  async function complete(task: Task): Promise<Task | null> {
    const { done, next } = completeTask(task)
    await storage.tasks.put(done)
    if (next) await storage.tasks.put(next)
    await load()
    return next
  }

  /** Schließt alle fälligen Gießaufgaben auf einmal ab (mit Folgeaufgaben). Gibt die Anzahl zurück. */
  async function completeAllWatering(): Promise<number> {
    const targets = dueWatering.value
    const toPut: Task[] = []
    for (const t of targets) {
      const { done, next } = completeTask(t)
      toPut.push(done)
      if (next) toPut.push(next)
    }
    if (toPut.length) {
      await storage.tasks.bulkPut(toPut)
      await load()
    }
    return targets.length
  }

  /** Erzeugt fehlende Pflegeaufgaben aus den Pflanzen-Intervallen. */
  async function syncCareTasks(plants: Plant[], activePlantings: Planting[]): Promise<number> {
    const created = generateCareTasks(plants, activePlantings, openTasks.value)
    if (created.length) {
      await storage.tasks.bulkPut(created)
      await load()
    }
    return created.length
  }

  return {
    tasks,
    loaded,
    openTasks,
    doneTasks,
    dueTasks,
    overdueCount,
    dueWatering,
    load,
    create,
    update,
    remove,
    removeDone,
    complete,
    completeAllWatering,
    syncCareTasks,
  }
})
