import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Startmodus des Auth-Dialogs. */
export type AuthMode = 'login' | 'register' | 'reset' | 'password'

/**
 * Ephemere UI-Zustände, die keine Persistenz brauchen. Enthält den
 * Pro-Upgrade-Dialog und den Auth-Dialog (Login/Registrieren) — beide werden
 * aus mehreren Stellen geöffnet und liegen global in App.vue.
 */
export const useUiStore = defineStore('ui', () => {
  const proDialogOpen = ref(false)

  function openPro() {
    proDialogOpen.value = true
  }

  function closePro() {
    proDialogOpen.value = false
  }

  const authDialogOpen = ref(false)
  const authMode = ref<AuthMode>('login')

  function openAuth(mode: AuthMode = 'login') {
    authMode.value = mode
    authDialogOpen.value = true
  }

  function closeAuth() {
    authDialogOpen.value = false
  }

  return { proDialogOpen, openPro, closePro, authDialogOpen, authMode, openAuth, closeAuth }
})
