<script setup lang="ts">
// Auth-Dialog (Login / Registrieren / Passwort vergessen / Passwort ändern).
// Optik wie ProDialog: Overlay + Karte, Teleport nach body, uiStore-gesteuert.
// Klick aufs Overlay schließt; Klick auf die Karte nicht.
import { computed, ref, watch } from 'vue'
import { useUiStore, type AuthMode } from '../ui/uiStore'
import { useAuthStore } from './authStore'

const ui = useUiStore()
const auth = useAuthStore()

const mode = ref<AuthMode>('login')
const email = ref('')
const password = ref('')
const displayName = ref('')
const busy = ref(false)
const errorMsg = ref('')
const notice = ref('') // Erfolgs-/Hinweistext (z. B. „E-Mail bestätigen")

// Beim Öffnen Felder/Modus zurücksetzen
watch(
  () => ui.authDialogOpen,
  (open) => {
    if (open) {
      mode.value = ui.authMode
      password.value = ''
      errorMsg.value = ''
      notice.value = ''
      if (mode.value !== 'password') email.value = ''
    }
  },
)

const title = computed(() => {
  switch (mode.value) {
    case 'register': return 'Konto erstellen'
    case 'reset': return 'Passwort zurücksetzen'
    case 'password': return 'Passwort ändern'
    default: return 'Anmelden'
  }
})

function setMode(next: AuthMode) {
  mode.value = next
  errorMsg.value = ''
  notice.value = ''
}

function messageFor(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  // Ein paar häufige Supabase-Meldungen freundlich eindeutschen
  if (/Invalid login credentials/i.test(raw)) return 'E-Mail oder Passwort ist falsch.'
  if (/Email not confirmed/i.test(raw)) return 'Bitte bestätige zuerst deine E-Mail-Adresse.'
  if (/User already registered/i.test(raw)) return 'Für diese E-Mail gibt es schon ein Konto. Melde dich an.'
  if (/Password should be at least/i.test(raw)) return 'Das Passwort ist zu kurz (mindestens 6 Zeichen).'
  if (/rate limit|too many/i.test(raw)) return 'Zu viele Versuche. Bitte kurz warten und erneut probieren.'
  return raw
}

async function submit() {
  errorMsg.value = ''
  notice.value = ''
  busy.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value)
      ui.closeAuth()
    } else if (mode.value === 'register') {
      const { needsConfirmation } = await auth.register(email.value, password.value, displayName.value)
      if (needsConfirmation) {
        notice.value = 'Fast geschafft! Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke den Link darin.'
      } else {
        ui.closeAuth()
      }
    } else if (mode.value === 'reset') {
      await auth.sendPasswordReset(email.value)
      notice.value = 'Wenn ein Konto existiert, ist eine E-Mail zum Zurücksetzen unterwegs.'
    } else if (mode.value === 'password') {
      await auth.updatePassword(password.value)
      notice.value = 'Dein Passwort wurde geändert.'
    }
  } catch (e) {
    errorMsg.value = messageFor(e)
  } finally {
    busy.value = false
  }
}

const canSubmit = computed(() => {
  if (busy.value) return false
  if (mode.value === 'reset') return email.value.trim().length > 3
  if (mode.value === 'password') return password.value.length >= 6
  return email.value.trim().length > 3 && password.value.length >= 6
})
</script>

<template>
  <Teleport to="body">
    <Transition name="auth-fade">
      <div v-if="ui.authDialogOpen" class="auth-overlay" @click="ui.closeAuth()">
        <div class="auth-card" @click.stop>
          <div class="auth-title">{{ title }}</div>
          <p v-if="mode === 'reset'" class="auth-sub">
            Gib deine E-Mail ein — wir schicken dir einen Link zum Zurücksetzen.
          </p>

          <form class="auth-form" @submit.prevent="submit">
            <input
              v-if="mode === 'register'"
              v-model="displayName"
              type="text"
              class="auth-input"
              placeholder="Anzeigename (optional)"
              autocomplete="nickname"
            />
            <input
              v-if="mode !== 'password'"
              v-model="email"
              type="email"
              class="auth-input"
              placeholder="E-Mail"
              autocomplete="email"
              required
            />
            <input
              v-if="mode !== 'reset'"
              v-model="password"
              type="password"
              class="auth-input"
              :placeholder="mode === 'password' ? 'Neues Passwort' : 'Passwort'"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            />

            <p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>
            <p v-if="notice" class="auth-notice">{{ notice }}</p>

            <button type="submit" class="pill-btn auth-cta" :disabled="!canSubmit">
              <span v-if="busy">Bitte warten …</span>
              <span v-else-if="mode === 'login'">Anmelden</span>
              <span v-else-if="mode === 'register'">Konto erstellen</span>
              <span v-else-if="mode === 'reset'">Link senden</span>
              <span v-else>Passwort speichern</span>
            </button>
          </form>

          <div class="auth-links">
            <template v-if="mode === 'login'">
              <button type="button" class="auth-link" @click="setMode('register')">Neu hier? Konto erstellen</button>
              <button type="button" class="auth-link" @click="setMode('reset')">Passwort vergessen?</button>
            </template>
            <template v-else-if="mode === 'register'">
              <button type="button" class="auth-link" @click="setMode('login')">Schon ein Konto? Anmelden</button>
            </template>
            <template v-else>
              <button type="button" class="auth-link" @click="setMode('login')">Zurück zum Anmelden</button>
            </template>
          </div>

          <button type="button" class="pill-btn-ghost auth-close" @click="ui.closeAuth()">Schließen</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(20, 30, 16, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface-card-solid);
  border-radius: var(--radius-xl);
  padding: 26px;
  box-shadow: var(--shadow-raised);
  text-align: center;
  animation: fadeUp var(--dur-base) var(--ease-spring);
}

.auth-title {
  font-size: 21px;
  font-weight: 800;
}

.auth-sub {
  font-size: 14px;
  color: var(--text-2);
  margin-top: 4px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0 6px;
}

/* Eigene Inputs (kein PrimeVue), 16px gegen iOS-Auto-Zoom im Dialog.
   Flächen-/Textfarbe über Theme-Tokens, damit es auch im Dunkelmodus lesbar ist. */
.auth-input {
  width: 100%;
  font-size: 16px;
  padding: 12px 14px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg, 14px);
  background: var(--surface-card-solid);
  color: var(--text-1);
}
.auth-input::placeholder {
  color: var(--text-3);
}
.auth-input:focus {
  outline: none;
  border-color: var(--accent);
}

.auth-error {
  font-size: 13px;
  color: #c0392b;
  margin: 2px 0;
}
.auth-notice {
  font-size: 13px;
  color: var(--accent);
  font-weight: 700;
  margin: 2px 0;
}

.auth-cta {
  width: 100%;
  font-weight: 800;
  padding: 14px;
}
.auth-cta:disabled {
  opacity: 0.55;
}

.auth-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 14px 0 4px;
}
.auth-link {
  background: none;
  border: none;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px;
}
.auth-link:hover {
  color: var(--accent);
}

.auth-close {
  width: 100%;
  margin-top: 4px;
}

.auth-fade-enter-active,
.auth-fade-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out);
}
.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
}
</style>
