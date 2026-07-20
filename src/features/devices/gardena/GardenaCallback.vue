<script setup lang="ts">
// Landeseite nach dem Husqvarna-Login: liest ?code/&state, tauscht den Code
// über die Edge Function gegen Tokens und leitet zur Geräte-Seite weiter.
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGardenaStore } from './gardenaStore'

const route = useRoute()
const router = useRouter()
const gardena = useGardenaStore()

const state = ref<'busy' | 'ok' | 'error'>('busy')
const message = ref('Verbinde mit Gardena …')

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const oauthState = typeof route.query.state === 'string' ? route.query.state : null
  const err = typeof route.query.error === 'string' ? route.query.error : ''

  if (err) {
    state.value = 'error'
    message.value = `Gardena hat die Verbindung abgelehnt (${err}).`
    return
  }
  if (!code) {
    state.value = 'error'
    message.value = 'Kein Autorisierungscode erhalten.'
    return
  }

  const ok = await gardena.completeConnect(code, oauthState)
  if (ok) {
    state.value = 'ok'
    message.value = 'Gardena verbunden! Weiter zu deinen Geräten …'
    setTimeout(() => router.replace('/geraete'), 1200)
  } else {
    state.value = 'error'
    message.value = gardena.errorMsg || 'Verbindung fehlgeschlagen.'
  }
})
</script>

<template>
  <div class="page callback">
    <div class="card cb-card">
      <i
        class="ph-fill cb-icon"
        :class="{
          'ph-spinner-gap spin': state === 'busy',
          'ph-check-circle ok': state === 'ok',
          'ph-warning-circle err': state === 'error',
        }"
      />
      <p class="cb-msg">{{ message }}</p>
      <button v-if="state === 'error'" type="button" class="pill-btn" @click="router.replace('/geraete')">
        Zurück zu Geräte
      </button>
    </div>
  </div>
</template>

<style scoped>
.callback {
  display: grid;
  place-items: center;
  min-height: 60vh;
}
.cb-card {
  text-align: center;
  max-width: 360px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.cb-icon {
  font-size: 44px;
}
.cb-icon.ok {
  color: var(--accent);
}
.cb-icon.err {
  color: var(--danger);
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.cb-msg {
  margin: 0;
  font-weight: 600;
}
</style>
