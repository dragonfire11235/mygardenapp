import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { storage } from '../../data'

/**
 * Konto/Profil — heute rein lokal (Anzeige-Info), später Naht fürs Online-Konto.
 * `userName` + `plan` liegen in der Dexie-Settings-Tabelle (Datenbestand),
 * `onboarded` in localStorage (muss vor dem ersten Render synchron lesbar sein,
 * damit das Onboarding nicht kurz aufblitzt). Siehe PLAN-profil-saas.md.
 */
export type Plan = 'free' | 'pro'

const ONBOARDED_KEY = 'lumi-onboarded'

function readOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return false
  }
}

export const useAccountStore = defineStore('account', () => {
  const userName = ref('')
  const plan = ref<Plan>('free')
  const onboarded = ref(readOnboarded())
  const loaded = ref(false)

  const isFree = computed(() => plan.value !== 'pro')
  const initial = computed(() => userName.value.trim().charAt(0).toUpperCase() || '🌱')
  const planLabel = computed(() => (isFree.value ? 'Free' : 'Pro ✨'))
  const planSub = computed(() => (isFree.value ? 'Lokal auf diesem Gerät' : 'Sync aktiv'))

  async function load() {
    userName.value = (await storage.getSetting<string>('profileName')) ?? ''
    plan.value = (await storage.getSetting<Plan>('plan')) ?? 'free'
    loaded.value = true
  }

  async function setUserName(name: string) {
    userName.value = name.trim()
    await storage.setSetting('profileName', userName.value)
  }

  async function setPlan(next: Plan) {
    plan.value = next
    await storage.setSetting('plan', next)
  }

  function setOnboarded(done: boolean) {
    onboarded.value = done
    try {
      localStorage.setItem(ONBOARDED_KEY, done ? '1' : '0')
    } catch {
      /* localStorage kann im Privatmodus fehlen — dann bleibt es Session-lokal */
    }
  }

  return {
    userName,
    plan,
    onboarded,
    loaded,
    isFree,
    initial,
    planLabel,
    planSub,
    load,
    setUserName,
    setPlan,
    setOnboarded,
  }
})
