import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Ephemere UI-Zustände, die keine Persistenz brauchen. Aktuell nur der
 * Pro-Upgrade-Dialog, der aus mehreren Stellen geöffnet wird (Sidebar,
 * Geräte-Upsell, Mehr-Seite) und global in App.vue liegt.
 */
export const useUiStore = defineStore('ui', () => {
  const proDialogOpen = ref(false)

  function openPro() {
    proDialogOpen.value = true
  }

  function closePro() {
    proDialogOpen.value = false
  }

  return { proDialogOpen, openPro, closePro }
})
