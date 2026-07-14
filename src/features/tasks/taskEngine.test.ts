import { describe, expect, it } from 'vitest'
import { createEntity, type Plant, type Planting, type Task } from '../../data'
import { completeTask, generateCareTasks } from './taskEngine'

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return createEntity<Plant>({
    name: 'Tomate',
    botanicalName: '',
    category: 'gemuese',
    imageUrl: '',
    photoId: null,
    wateringIntervalDays: 3,
    fertilizingIntervalDays: 14,
    wateringStartDate: null,
    spreadM: null,
    sowingMonths: [],
    harvestMonths: [],
    bloomMonths: [],
    pruningMonths: [],
    sunlight: null,
    notes: '',
    trefleId: null,
    ...overrides,
  })
}

function makePlanting(plantId: string, bedId = 'beet-1'): Planting {
  return createEntity<Planting>({
    plantId,
    bedId,
    quantity: 1,
    plantedAt: '2026-05-01',
    removedAt: null,
    posX: null,
    posY: null,
    notes: '',
  })
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return createEntity<Task>({
    title: 'Testaufgabe',
    type: 'sonstiges',
    dueDate: '2026-07-06',
    intervalDays: null,
    plantId: null,
    bedId: null,
    auto: false,
    doneAt: null,
    notes: '',
    ...overrides,
  })
}

describe('completeTask', () => {
  it('setzt doneAt und erzeugt keine Folgeaufgabe bei einmaligen Aufgaben', () => {
    const { done, next } = completeTask(makeTask(), '2026-07-06')
    expect(done.doneAt).not.toBeNull()
    expect(next).toBeNull()
  })

  it('erzeugt bei Wiederholung eine Folgeaufgabe in n Tagen ab heute', () => {
    const task = makeTask({ intervalDays: 7, title: 'Gießen: Tomate', type: 'giessen' })
    const { done, next } = completeTask(task, '2026-07-06')
    expect(done.doneAt).not.toBeNull()
    expect(next).not.toBeNull()
    expect(next!.dueDate).toBe('2026-07-13')
    expect(next!.title).toBe('Gießen: Tomate')
    expect(next!.doneAt).toBeNull()
    expect(next!.id).not.toBe(task.id)
  })

  it('rechnet über Monatsgrenzen korrekt', () => {
    const { next } = completeTask(makeTask({ intervalDays: 30 }), '2026-07-15')
    expect(next!.dueDate).toBe('2026-08-14')
  })

  it('rechnet die Folgeaufgabe ab heute, nicht ab der ursprünglichen Fälligkeit', () => {
    const task = makeTask({ dueDate: '2026-06-01', intervalDays: 3 })
    const { next } = completeTask(task, '2026-07-06')
    expect(next!.dueDate).toBe('2026-07-09')
  })

  it('erzeugt keine Folgeaufgabe bei intervalDays 0', () => {
    expect(completeTask(makeTask({ intervalDays: 0 }), '2026-07-06').next).toBeNull()
  })

  it('übernimmt Pflanzen-/Beet-Bezug und auto-Flag in die Folgeaufgabe', () => {
    const task = makeTask({ intervalDays: 7, plantId: 'p1', bedId: 'b1', auto: true })
    const { next } = completeTask(task, '2026-07-06')
    expect(next!.plantId).toBe('p1')
    expect(next!.bedId).toBe('b1')
    expect(next!.auto).toBe(true)
    expect(next!.intervalDays).toBe(7)
  })
})

describe('generateCareTasks', () => {
  it('erzeugt Gieß- und Düngeaufgaben für aktive Bepflanzungen', () => {
    const plant = makePlant()
    const tasks = generateCareTasks([plant], [makePlanting(plant.id)], [], '2026-07-06')

    expect(tasks).toHaveLength(2)
    const watering = tasks.find((t) => t.type === 'giessen')!
    expect(watering.title).toBe('Gießen: Tomate')
    expect(watering.intervalDays).toBe(3)
    expect(watering.dueDate).toBe('2026-07-06')
    expect(watering.auto).toBe(true)
  })

  it('nutzt das Gieß-Startdatum als erste Fälligkeit (Düngen bleibt heute)', () => {
    const plant = makePlant({ wateringStartDate: '2026-07-20', fertilizingIntervalDays: 14 })
    const tasks = generateCareTasks([plant], [makePlanting(plant.id)], [], '2026-07-06')
    expect(tasks.find((t) => t.type === 'giessen')!.dueDate).toBe('2026-07-20')
    expect(tasks.find((t) => t.type === 'duengen')!.dueDate).toBe('2026-07-06')
  })

  it('erzeugt keine Duplikate, wenn schon offene Aufgaben existieren', () => {
    const plant = makePlant()
    const planting = makePlanting(plant.id)
    const existing = generateCareTasks([plant], [planting], [])
    const again = generateCareTasks([plant], [planting], existing)
    expect(again).toHaveLength(0)
  })

  it('ignoriert Pflanzen ohne Pflegeintervalle', () => {
    const plant = makePlant({ wateringIntervalDays: null, fertilizingIntervalDays: null })
    expect(generateCareTasks([plant], [makePlanting(plant.id)], [])).toHaveLength(0)
  })

  it('legt pro Beet eigene Aufgaben an', () => {
    const plant = makePlant({ fertilizingIntervalDays: null })
    const tasks = generateCareTasks(
      [plant],
      [makePlanting(plant.id, 'beet-1'), makePlanting(plant.id, 'beet-2')],
      [],
    )
    expect(tasks).toHaveLength(2)
    expect(new Set(tasks.map((t) => t.bedId)).size).toBe(2)
  })

  it('erzeugt pro Pflanze+Beet+Typ nur eine Aufgabe, auch bei mehreren Bepflanzungen im selben Beet', () => {
    const plant = makePlant({ fertilizingIntervalDays: null })
    const tasks = generateCareTasks(
      [plant],
      [makePlanting(plant.id, 'beet-1'), makePlanting(plant.id, 'beet-1')],
      [],
    )
    expect(tasks).toHaveLength(1)
  })

  it('lässt sich von offenen manuellen Aufgaben (auto=false) nicht blockieren', () => {
    const plant = makePlant({ fertilizingIntervalDays: null })
    const manual = makeTask({ type: 'giessen', plantId: plant.id, bedId: 'beet-1', auto: false })
    const tasks = generateCareTasks([plant], [makePlanting(plant.id)], [manual])
    expect(tasks).toHaveLength(1)
  })

  it('ignoriert Bepflanzungen mit unbekannter Pflanze', () => {
    expect(generateCareTasks([], [makePlanting('gibt-es-nicht')], [])).toHaveLength(0)
  })
})
