import { storage } from './index'
import type { BackupData } from './storage'

/** Erstellt ein JSON-Backup und startet den Download. */
export async function downloadBackup(includePhotos: boolean): Promise<void> {
  const data = await storage.exportAll(includePhotos)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mygarden-backup-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Liest eine Backup-Datei ein und ersetzt den kompletten Datenbestand. */
export async function importBackupFile(file: File): Promise<void> {
  const text = await file.text()
  let data: BackupData
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  if (typeof data !== 'object' || data === null || !Array.isArray(data.plants) || !Array.isArray(data.beds)) {
    throw new Error('Die Datei sieht nicht wie ein MyGarden-Backup aus.')
  }
  data.photos ??= []
  data.tasks ??= []
  data.plantings ??= []
  data.diary ??= []
  data.devices ??= []
  data.settings ??= {}
  await storage.importAll(data)
}
