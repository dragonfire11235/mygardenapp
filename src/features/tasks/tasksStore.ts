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

  /** Schließt ab und legt bei Wiederholung die Folgeaufgabe an. Gibt sie zurück (für Toast). */
  async function complete(task: Task): Promise<Task | null> {
    const { done, next } = completeTask(task)
    await storage.tasks.put(done)
    if (next) await storage.tasks.put(next)
    await load()
    return next
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
    load,
    create,
    update,
    remove,
    complete,
    syncCareTasks,
  }
})
