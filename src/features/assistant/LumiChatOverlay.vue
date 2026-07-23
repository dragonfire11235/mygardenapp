<script setup lang="ts">
// Vollbild-Chat mit Lumi. Auto-Scroll ans Ende bei neuer Nachricht/Tipp-Indikator,
// Fehler werden als Inline-Bubble gezeigt (kein Toast — der Chat ist der Kontext).
import { nextTick, ref, watch } from 'vue'
import { useUiStore } from '../ui/uiStore'
import { useAuthStore } from '../auth/authStore'
import { useAssistantStore } from './assistantStore'
import { renderLumiMarkdown } from './markdown'
import { useLumiMascot } from './useLumiMascot'
import type { LumiErrorCode } from './lumiApi'

const ui = useUiStore()
const auth = useAuthStore()
const store = useAssistantStore()

// Bild + Kontext-Text passend zur Seite, von der aus Lumi geöffnet wurde.
const { src: mascotUrl, label: mascotLabel } = useLumiMascot()

const draft = ref('')
const listEl = ref<HTMLElement | null>(null)
const online = ref(navigator.onLine)

function updateOnline() {
  online.value = navigator.onLine
}
window.addEventListener('online', updateOnline)
window.addEventListener('offline', updateOnline)

async function scrollToEnd() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

watch(() => store.messages.length, scrollToEnd)
watch(() => store.sending, scrollToEnd)
watch(() => ui.lumiOpen, (open) => {
  if (open) scrollToEnd()
})

const errorTexts: Record<LumiErrorCode, string> = {
  not_allowed: 'Lumi ist noch in der Testphase.',
  limit_reached: 'Tageslimit erreicht — morgen geht’s weiter.',
  offline: 'Du bist offline.',
  unauthenticated: 'Bitte melde dich an, um mit Lumi zu chatten.',
  error: 'Da ist etwas schiefgelaufen. Versuch es gleich noch mal.',
}

async function send() {
  const text = draft.value
  draft.value = ''
  await store.send(text)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (!store.sending && draft.value.trim()) void send()
  }
}
</script>

<template>
  <div v-if="ui.lumiOpen" class="lumi-overlay">
    <header class="lumi-header">
      <img :src="mascotUrl" alt="" class="lumi-avatar" />
      <div class="lumi-header-text">
        <div class="lumi-title">Lumi</div>
        <div class="lumi-sub">{{ mascotLabel }}</div>
      </div>
      <button type="button" class="circle-glass-btn" aria-label="Chat zurücksetzen" @click="store.reset()">
        <i class="ph-bold ph-arrows-clockwise" />
      </button>
      <button type="button" class="circle-glass-btn" aria-label="Schließen" @click="ui.closeLumi()">
        <i class="ph-bold ph-x" />
      </button>
    </header>

    <div ref="listEl" class="lumi-messages">
      <div v-if="store.messages.length === 0 && store.briefing" class="lumi-bubble lumi-bubble-assistant">
        🌱 {{ store.briefing }}
      </div>
      <div v-else-if="store.messages.length === 0" class="lumi-empty">
        Hallo! Ich bin Lumi 🌱 — frag mich alles zu deinem Garten.
      </div>

      <div
        v-for="(m, i) in store.messages"
        :key="i"
        class="lumi-bubble"
        :class="m.role === 'user' ? 'lumi-bubble-user' : 'lumi-bubble-assistant'"
      >
        <span v-if="m.role === 'user'">{{ m.text }}</span>
        <span v-else v-html="renderLumiMarkdown(m.text)" />
      </div>

      <div v-if="store.sending" class="lumi-bubble lumi-bubble-assistant lumi-typing">
        Lumi denkt nach
        <span class="lumi-dots"><span /><span /><span /></span>
      </div>

      <div v-if="store.error" class="lumi-bubble lumi-bubble-error">
        {{ errorTexts[store.error] }}
      </div>
    </div>

    <div v-if="!auth.isAuthenticated" class="lumi-input-row lumi-gate">
      <span>Melde dich an, um mit Lumi zu chatten.</span>
      <button type="button" class="pill-btn" @click="ui.openAuth('login')">Anmelden</button>
    </div>
    <div v-else-if="!online" class="lumi-input-row lumi-gate">
      <span>Du bist offline. Sobald du wieder verbunden bist, geht's weiter.</span>
    </div>
    <form v-else class="lumi-input-row" @submit.prevent="send">
      <textarea
        v-model="draft"
        class="lumi-input"
        rows="1"
        placeholder="Frag Lumi etwas…"
        :disabled="store.sending"
        @keydown="onKeydown"
      />
      <button type="submit" class="round-icon-btn" aria-label="Senden" :disabled="store.sending || !draft.trim()">
        <i class="ph-fill ph-paper-plane-right" />
      </button>
    </form>
  </div>
</template>

<style scoped>
.lumi-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: var(--bg-app-gradient);
  display: flex;
  flex-direction: column;
}

.lumi-header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(14px + env(safe-area-inset-top)) 16px 14px;
  border-bottom: 1px solid var(--border-soft);
}
.lumi-avatar {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--accent);
  box-shadow: var(--shadow-card);
}
.lumi-header-text {
  flex: 1;
  min-width: 0;
}
.lumi-title {
  font-size: 19px;
  font-weight: 800;
  color: var(--text-1);
}
.lumi-sub {
  font-size: 13px;
  color: var(--text-2);
}

.lumi-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lumi-empty {
  margin: auto;
  text-align: center;
  color: var(--text-2);
  font-size: 15px;
  max-width: 280px;
}

.lumi-bubble {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: var(--radius-l);
  font-size: 15px;
  line-height: 1.45;
}
.lumi-bubble :deep(p) {
  margin: 0;
}
.lumi-bubble :deep(p + p) {
  margin-top: 8px;
}
.lumi-bubble :deep(ul),
.lumi-bubble :deep(ol) {
  margin: 0;
  padding-left: 1.2em;
}

.lumi-bubble-user {
  align-self: flex-end;
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: var(--radius-s, 6px);
}
.lumi-bubble-assistant {
  align-self: flex-start;
  background: var(--surface-card);
  color: var(--text-1);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom-left-radius: var(--radius-s, 6px);
}
.lumi-bubble-error {
  align-self: center;
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 700;
  text-align: center;
}

.lumi-typing {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
}
.lumi-dots {
  display: inline-flex;
  gap: 3px;
}
.lumi-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-2);
  animation: lumiDot 1.1s ease-in-out infinite;
}
.lumi-dots span:nth-child(2) {
  animation-delay: 0.15s;
}
.lumi-dots span:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes lumiDot {
  0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

.lumi-input-row {
  flex: none;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-soft);
  background: var(--surface-card);
}

.lumi-input {
  flex: 1;
  min-width: 0;
  resize: none;
  max-height: 120px;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.4;
  padding: 10px 14px;
  border-radius: var(--radius-l);
  border: 1px solid var(--border-soft);
  background: var(--surface-card-solid);
  color: var(--text-1);
}
.lumi-input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.lumi-gate {
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-2);
  text-align: center;
  flex-wrap: wrap;
}

/* Desktop: kein Vollbild, sondern ein kleines schwebendes Glas-Panel unten
   rechts. Der Garten scheint durch (transparent), statt alles zu verdecken. */
@media (min-width: 1024px) {
  .lumi-overlay {
    inset: auto;
    right: 24px;
    bottom: 24px;
    width: 380px;
    height: 600px;
    max-height: calc(100vh - 48px);
    border-radius: var(--radius-xl);
    overflow: hidden;
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    backdrop-filter: var(--glass-blur-strong);
    -webkit-backdrop-filter: var(--glass-blur-strong);
    box-shadow: var(--shadow-deep);
  }
  /* Kopf-/Eingabe-Leisten transparent lassen, damit der Glas-Effekt trägt. */
  .lumi-overlay .lumi-header,
  .lumi-overlay .lumi-input-row {
    background: transparent;
  }
}
</style>
