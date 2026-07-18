<script setup lang="ts">
// Pro-Upgrade-Dialog (Modal). Bewusst als eigene leichte Komponente statt
// PrimeVue-Dialog, um die Optik aus dem Design-Handoff pixelgenau zu treffen.
// Klick auf das Overlay schließt; Klick auf die Karte nicht (stopPropagation).
import { useUiStore } from './uiStore'
import { useAccountStore } from '../account/accountStore'

const ui = useUiStore()
const account = useAccountStore()

const mascotUrl = `${import.meta.env.BASE_URL}lumi/mascot/lumi-cheer.png`

const benefits = [
  'Konto & Sync auf allen Geräten',
  'Unbegrenzte Smart-Garden-Geräte',
  'Foto-Backups im Tagebuch',
  'Erweiterte Beetplaner-Werkzeuge',
]

async function upgrade() {
  // Kein echter Kauf — schaltet lokal auf „pro" (Stripe-Anbindung ist Roadmap).
  await account.setPlan('pro')
  ui.closePro()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="pro-fade">
      <div v-if="ui.proDialogOpen" class="pro-overlay" @click="ui.closePro()">
        <div class="pro-card" @click.stop>
          <img :src="mascotUrl" alt="Lumi jubelt" class="pro-mascot" />
          <div class="pro-title">lumi Pro ✨</div>
          <div class="pro-sub">Alles aus deinem Garten herausholen.</div>
          <div class="pro-benefits">
            <div v-for="b in benefits" :key="b" class="pro-benefit">
              <i class="ph-fill ph-check-circle" />{{ b }}
            </div>
          </div>
          <button type="button" class="pill-btn pro-cta" @click="upgrade">2,99 € / Monat</button>
          <button type="button" class="pill-btn-ghost" @click="ui.closePro()">Später vielleicht</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pro-overlay {
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

.pro-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface-card-solid);
  border-radius: var(--radius-xl);
  padding: 26px;
  box-shadow: var(--shadow-raised);
  text-align: center;
  animation: fadeUp var(--dur-base) var(--ease-spring);
}

.pro-mascot {
  width: 96px;
  border-radius: 24px;
}

.pro-title {
  font-size: 21px;
  font-weight: 800;
  margin-top: 10px;
}

.pro-sub {
  font-size: 14px;
  color: var(--text-2);
  margin-top: 4px;
}

.pro-benefits {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0;
  text-align: left;
}

.pro-benefit {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
}
.pro-benefit i {
  color: var(--accent);
  font-size: 19px;
  flex: none;
}

.pro-cta {
  width: 100%;
  font-weight: 800;
  padding: 14px;
  margin-bottom: 2px;
}

/* Overlay-Ein/Ausblendung */
.pro-fade-enter-active,
.pro-fade-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out);
}
.pro-fade-enter-from,
.pro-fade-leave-to {
  opacity: 0;
}
</style>
