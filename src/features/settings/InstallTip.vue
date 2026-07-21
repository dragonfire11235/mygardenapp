<script setup lang="ts">
// Dezenter Installier-Tipp beim Start (dismissible) + der globale <pwa-install>-Dialog.
// Einmal global in App.vue gemountet. Der „App installieren"-Button in den Einstellungen
// nutzt denselben Dialog über openInstallDialog().
import { onMounted, ref } from 'vue'
import { isAppInstalled, openInstallDialog } from '../../shared/pwaInstall'

const DISMISS_KEY = 'lumi-install-tip-dismissed'
const visible = ref(false)
const appBaseUrl = import.meta.env.BASE_URL

onMounted(() => {
  if (isAppInstalled()) return
  try {
    if (localStorage.getItem(DISMISS_KEY) === '1') return
  } catch {
    /* localStorage im Privatmodus evtl. nicht verfügbar */
  }
  visible.value = true
})

function install() {
  openInstallDialog()
}

function dismiss() {
  visible.value = false
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* egal */
  }
}
</script>

<template>
  <!-- Globaler Installier-Dialog (unsichtbar bis showDialog); Attribute manual = kein Auto-Popup -->
  <pwa-install
    manual-apple="true"
    manual-chrome="true"
    name="lumi"
    description="Dein Garten. Dein Zuhause."
    :icon="`${appBaseUrl}pwa-512.png`"
  />

  <Transition name="tip-slide">
    <div v-if="visible" class="install-tip">
      <i class="ph-fill ph-device-mobile tip-icon" />
      <span class="tip-text">
        Tipp: <button type="button" class="tip-link" @click="install">lumi installieren</button>
        — als App auf dem Startbildschirm.
      </span>
      <button type="button" class="tip-close" aria-label="Schließen" @click="dismiss">
        <i class="ph-bold ph-x" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.install-tip {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 84px);
  z-index: 55;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(560px, calc(100vw - 24px));
  padding: 10px 12px 10px 14px;
  border-radius: var(--radius-pill);
  background: var(--surface-deep);
  color: var(--text-on-deep);
  box-shadow: var(--shadow-raised);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 14px;
}
/* Auf Desktop (kein schwebendes Tab-Bar) tiefer ansetzen */
@media (min-width: 1024px) {
  .install-tip {
    bottom: 20px;
    left: auto;
    right: 20px;
    transform: none;
  }
}
.tip-icon {
  font-size: 20px;
  flex: none;
  opacity: 0.9;
}
.tip-text {
  min-width: 0;
}
.tip-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-weight: 800;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.tip-close {
  flex: none;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: inherit;
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 14px;
}
.tip-close:hover {
  background: rgba(255, 255, 255, 0.28);
}

.tip-slide-enter-active,
.tip-slide-leave-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.tip-slide-enter-from,
.tip-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
@media (min-width: 1024px) {
  .tip-slide-enter-from,
  .tip-slide-leave-to {
    transform: translateY(12px);
  }
}
</style>
