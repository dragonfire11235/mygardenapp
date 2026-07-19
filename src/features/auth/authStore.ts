import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../../data/supabase/client'

/**
 * Auth-Zustand (E-Mail + Passwort über Supabase). Additiv: Ohne Login bleibt die
 * App voll offline nutzbar — Login schaltet später Geräte-Sync/Cloud-Features frei.
 * `init()` wird in App.vue beim Start aufgerufen (Session wiederherstellen +
 * auf Änderungen lauschen). Ist Supabase nicht konfiguriert, bleibt alles inaktiv.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const ready = ref(false) // init() abgeschlossen (Session geprüft)

  const isAuthenticated = computed(() => Boolean(user.value))
  const email = computed(() => user.value?.email ?? '')
  const available = computed(() => isSupabaseConfigured)

  function apply(next: Session | null) {
    session.value = next
    user.value = next?.user ?? null
  }

  async function init() {
    if (!supabase) {
      ready.value = true
      return
    }
    const { data } = await supabase.auth.getSession()
    apply(data.session)
    supabase.auth.onAuthStateChange((_event, next) => apply(next))
    ready.value = true
  }

  /** Wo Supabase nach Bestätigungs-/Reset-Links zurückspringt (GitHub Pages: /<repo>/). */
  function redirectUrl(): string {
    return `${window.location.origin}${import.meta.env.BASE_URL}`
  }

  /**
   * Registrieren. Gibt `needsConfirmation` zurück, wenn Supabase eine
   * E-Mail-Bestätigung verlangt (dann ist noch keine Session aktiv).
   */
  async function register(mail: string, password: string, displayName = '') {
    if (!supabase) throw new Error('Online-Konto ist nicht verfügbar (Supabase nicht konfiguriert).')
    const { data, error } = await supabase.auth.signUp({
      email: mail.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: redirectUrl(),
      },
    })
    if (error) throw error
    const needsConfirmation = !data.session
    return { needsConfirmation }
  }

  async function login(mail: string, password: string) {
    if (!supabase) throw new Error('Online-Konto ist nicht verfügbar (Supabase nicht konfiguriert).')
    const { error } = await supabase.auth.signInWithPassword({ email: mail.trim(), password })
    if (error) throw error
  }

  async function logout() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function sendPasswordReset(mail: string) {
    if (!supabase) throw new Error('Online-Konto ist nicht verfügbar (Supabase nicht konfiguriert).')
    const { error } = await supabase.auth.resetPasswordForEmail(mail.trim(), {
      redirectTo: redirectUrl(),
    })
    if (error) throw error
  }

  async function updatePassword(newPassword: string) {
    if (!supabase) throw new Error('Online-Konto ist nicht verfügbar (Supabase nicht konfiguriert).')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return {
    session,
    user,
    ready,
    isAuthenticated,
    email,
    available,
    init,
    register,
    login,
    logout,
    sendPasswordReset,
    updatePassword,
  }
})
