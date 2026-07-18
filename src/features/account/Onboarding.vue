<script setup lang="ts">
// Erststart-Onboarding (3 Schritte). Wird von App.vue nur gezeigt, solange
// account.onboarded false ist. E-Mail/Passwort sind hier noch reine Optik —
// das echte Konto (Supabase) ist Roadmap (PLAN-profil-saas.md). Der Name wird,
// falls eingegeben, ins lokale Profil übernommen (Dashboard-Begrüßung).
import { computed, ref } from 'vue'
import { useAccountStore } from './accountStore'

const account = useAccountStore()

const heroUrl = `${import.meta.env.BASE_URL}lumi/mascot/lumi-hero.png`
const hugUrl = `${import.meta.env.BASE_URL}lumi/mascot/lumi-hug.png`
const logoUrl = `${import.meta.env.BASE_URL}lumi/logo-lumi-wordmark-alpha.png`

const step = ref(0)
const name = ref('')

const dots = computed(() => [0, 1, 2].map((i) => i === step.value))

const features = [
  { icon: 'ph-potted-plant', bg: 'var(--accent-soft)', color: 'var(--accent)', title: 'Pflanzen pflegen', text: 'Gieß- und Düngeaufgaben, automatisch geplant.' },
  { icon: 'ph-grid-four', bg: 'var(--info-soft)', color: 'var(--info)', title: 'Beete planen', text: 'Grafischer Beetplaner mit 657 Pflanzen im Katalog.' },
  { icon: 'ph-butterfly', bg: 'rgba(217,70,239,0.12)', color: '#d946ef', title: 'Natur entdecken', text: 'Sammle Entdeckungen und steigere die Biodiversität.' },
]

function next() {
  step.value = Math.min(step.value + 1, 2)
}

function toLogin() {
  step.value = 2
}

async function finish() {
  if (name.value.trim()) await account.setUserName(name.value)
  account.setOnboarded(true)
}
</script>

<template>
  <div class="ob-overlay">
    <div class="ob-inner">
      <!-- Schritt 1: Willkommen -->
      <template v-if="step === 0">
        <img :src="heroUrl" alt="Lumi" class="ob-hero" />
        <img :src="logoUrl" alt="lumi" data-logo="1" class="ob-logo" />
        <div class="ob-tagline">Dein Garten. Dein Zuhause.</div>
        <div class="ob-actions">
          <button type="button" class="pill-btn ob-primary" @click="next">Los geht's 🌱</button>
          <button type="button" class="ob-link" @click="toLogin">Ich habe schon ein Konto</button>
        </div>
      </template>

      <!-- Schritt 2: Features -->
      <template v-else-if="step === 1">
        <div class="ob-heading">Was Lumi für dich tut</div>
        <div class="ob-features">
          <div v-for="f in features" :key="f.title" class="ob-feature glass-card">
            <span class="ob-feature-icon" :style="{ background: f.bg, color: f.color }"><i class="ph-fill" :class="f.icon" /></span>
            <div>
              <div class="ob-feature-title">{{ f.title }}</div>
              <div class="ob-feature-text">{{ f.text }}</div>
            </div>
          </div>
        </div>
        <button type="button" class="pill-btn ob-primary" @click="next">Weiter</button>
      </template>

      <!-- Schritt 3: Konto (optional) -->
      <template v-else>
        <img :src="hugUrl" alt="Lumi" class="ob-hug" />
        <div class="ob-heading">Fast geschafft!</div>
        <div class="ob-sub">Mit Konto werden deine Daten sicher synchronisiert.</div>
        <div class="ob-form">
          <input v-model="name" class="ob-input" placeholder="Dein Name" />
          <input class="ob-input" type="email" placeholder="E-Mail" />
          <input class="ob-input" type="password" placeholder="Passwort" />
          <button type="button" class="pill-btn ob-primary" @click="finish">Konto erstellen</button>
          <button type="button" class="ob-skip" @click="finish">Ohne Konto fortfahren</button>
        </div>
      </template>

      <div class="ob-dots">
        <span v-for="(active, i) in dots" :key="i" class="ob-dot" :class="{ 'is-active': active }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ob-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: var(--bg-app-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.ob-inner {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  animation: fadeUp 400ms var(--ease-out);
}

.ob-hero {
  width: 200px;
  animation: lumiFloat 4s ease-in-out infinite;
}
.ob-hug {
  width: 110px;
  border-radius: 24px;
}
.ob-logo {
  height: 44px;
}
.ob-tagline {
  color: var(--text-2);
  font-size: 17px;
  text-align: center;
}

.ob-actions,
.ob-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}
.ob-actions {
  margin-top: 8px;
}

.ob-primary {
  padding: 14px;
  width: 100%;
}

.ob-link {
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--text-brand);
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  padding: 10px;
}
.ob-skip {
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--text-2);
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  padding: 8px;
}

.ob-heading {
  font-size: 24px;
  font-weight: 800;
  text-align: center;
}
.ob-sub {
  color: var(--text-2);
  font-size: 14px;
  text-align: center;
  margin-top: -12px;
}

.ob-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.ob-feature {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px;
}
.ob-feature-icon {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 24px;
  flex: none;
}
.ob-feature-title {
  font-weight: 800;
}
.ob-feature-text {
  color: var(--text-2);
  font-size: 13px;
}

.ob-input {
  font-family: inherit;
  font-size: 16px;
  padding: 13px 16px;
  border-radius: 18px;
  border: 1px solid var(--border-soft);
  background: var(--surface-raised);
  color: var(--text-1);
  outline: none;
}
.ob-input:focus {
  border-color: var(--accent);
}

.ob-dots {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.ob-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border-soft);
  transition: background var(--dur-fast) var(--ease-out);
}
.ob-dot.is-active {
  background: var(--accent);
}
</style>
