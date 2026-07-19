// Supabase-Client (Singleton).
//
// Nur für Auth (und später Sync) — die lokale Datenschicht bleibt vorerst der
// DexieProvider (src/data/index.ts). Der Client wird aus den Vite-Env-Variablen
// gebaut (.env, siehe .env.example). Der Publishable/Anon-Key ist bewusst
// client-öffentlich; die Daten schützt Row Level Security in Supabase.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** true, wenn beide Env-Variablen gesetzt sind (sonst läuft die App rein offline). */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  // Kein harter Fehler: Ohne Konfiguration bleibt die App voll offline nutzbar,
  // nur Login/Sync stehen dann nicht zur Verfügung.
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen — Auth ist deaktiviert.')
}

/**
 * Der geteilte Supabase-Client. Ist `null`, wenn die Env-Variablen fehlen —
 * Aufrufer müssen darauf prüfen (bzw. `isSupabaseConfigured` nutzen).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
