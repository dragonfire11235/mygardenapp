<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getPhotoUrl } from '../../shared/photos'
import { useSettingsStore } from '../settings/settingsStore'
import { widgetRegistry } from './widgetRegistry'

const settings = useSettingsStore()

// Sichtbarkeit und Reihenfolge aus den Einstellungen; unbekannte/neue Widgets sind standardmäßig sichtbar.
const visibleWidgets = computed(() => {
  const layout = settings.dashboardLayout
  if (!layout.length) return [...widgetRegistry]
  const byId = new Map(widgetRegistry.map((w) => [w.id, w]))
  const ordered = layout
    .filter((c) => c.visible && byId.has(c.id))
    .map((c) => byId.get(c.id)!)
  const known = new Set(layout.map((c) => c.id))
  for (const w of widgetRegistry) if (!known.has(w.id)) ordered.push(w)
  return ordered
})

// Titelbild fürs Hero-Banner (Hintergrundbild liegt global in App.vue)
const headerUrl = ref<string | null>(null)

watch(
  () => settings.dashboardHeaderPhotoId,
  async (id) => {
    headerUrl.value = id ? await getPhotoUrl(id) : null
  },
  { immediate: true },
)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 5) return 'Gute Nacht'
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Hallo'
  return 'Guten Abend'
})

const today = new Date().toLocaleDateString('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
</script>

<template>
  <div class="dashboard">
    <div class="page">
      <!-- Hero-Banner mit Titelbild -->
      <header class="hero" :class="{ 'hero-photo': headerUrl }">
        <img v-if="headerUrl" :src="headerUrl" alt="" class="hero-img" />
        <div class="hero-content">
          <h1>{{ greeting }}! 🌱</h1>
          <p>{{ today }}</p>
        </div>
      </header>

      <div class="card-grid">
        <section v-for="widget in visibleWidgets" :key="widget.id" class="card widget-card">
          <h2 class="widget-title">{{ widget.title }}</h2>
          <component :is="widget.component" />
        </section>
      </div>

      <p v-if="!visibleWidgets.length" class="muted">
        Alle Widgets sind ausgeblendet. Unter
        <RouterLink to="/einstellungen">Einstellungen</RouterLink> kannst du sie wieder einblenden.
      </p>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100%;
}

.hero {
  position: relative;
  border-radius: var(--app-radius);
  overflow: hidden;
  margin-bottom: 1rem;
  background: linear-gradient(120deg, #16a34a, #65a30d);
  min-height: 130px;
  display: flex;
  align-items: flex-end;
}

.hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-photo {
  min-height: 180px;
}

.hero-content {
  position: relative;
  color: #fff;
  padding: 1rem 1.2rem;
  width: 100%;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.45));
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.hero-content h1 {
  font-size: 1.5rem;
}

.hero-content p {
  margin: 0.1rem 0 0;
  opacity: 0.95;
}

.widget-title {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  font-weight: 600;
}
</style>
