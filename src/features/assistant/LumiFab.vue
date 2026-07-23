<script setup lang="ts">
// Schwebender Maskottchen-Button — öffnet den Vollbild-Chat. Auf jeder Route
// sichtbar, außer der Chat ist selbst offen (dann würde er ihn nur verdecken).
import { useUiStore } from '../ui/uiStore'
import { useLumiMascot } from './useLumiMascot'

const ui = useUiStore()

// Bild wechselt mit der aktuellen Seite (Pflanzen, Beete, Aufgaben …).
const { src: mascotUrl } = useLumiMascot()
</script>

<template>
  <button v-if="!ui.lumiOpen" type="button" class="lumi-fab" aria-label="Lumi öffnen" @click="ui.openLumi()">
    <img :src="mascotUrl" alt="" class="lumi-fab-img" />
  </button>
</template>

<style scoped>
.lumi-fab {
  position: fixed;
  right: 16px;
  bottom: calc(88px + env(safe-area-inset-bottom));
  z-index: 50;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  padding: 0;
  background: var(--accent);
  box-shadow: var(--shadow-card);
  display: grid;
  place-items: center;
  overflow: hidden;
  transition: filter var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.lumi-fab:hover {
  filter: brightness(var(--hover-brightness));
}
.lumi-fab:active {
  transform: scale(var(--press-scale));
}

.lumi-fab-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (min-width: 1024px) {
  .lumi-fab {
    bottom: 24px;
  }
}
</style>
