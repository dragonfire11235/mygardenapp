// Zentraler Zugriff auf den aktiven StorageProvider.
// Für einen späteren Backend-Wechsel wird nur diese Datei angepasst.

import { DexieProvider } from './dexie/DexieProvider'
import type { StorageProvider } from './storage'

export const storage: StorageProvider = new DexieProvider()

export * from './models'
export type { BackupData, Repository, StorageProvider } from './storage'
