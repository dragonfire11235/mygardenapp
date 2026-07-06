<script setup lang="ts">
import { computed } from 'vue'
import SeasonWidget from '../plants/SeasonWidget.vue'
import BedsWidget from '../beds/BedsWidget.vue'
import DueTasksWidget from '../tasks/DueTasksWidget.vue'
import RecentDiaryWidget from '../diary/RecentDiaryWidget.vue'
import SensorsWidget from '../devices/SensorsWidget.vue'
import SwitchesWidget from '../devices/SwitchesWidget.vue'
import { useSettingsStore } from '../settings/settingsStore'

const settings = useSettingsStore()

const widgets = [
  { id: 'tasks', title: 'Fällige Aufgaben', component: DueTasksWidget },
  { id: 'season', title: 'Saison', component: SeasonWidget },
  { id: 'beds', title: 'Beete', component: BedsWidget },
  { id: 'diary', title: 'Tagebuch', component: RecentDiaryWidget },
  { id: 'sensors', title: 'Sensoren', component: SensorsWidget },
  { id: 'switches', title: 'Schalter', component: SwitchesWidget },
] as const

// Sichtbarkeit und Reihenfolge aus den Einstellungen; unbekannte/neue Widgets sind standardmäßig sichtbar.
const visibleWidgets = computed(() => {
  const layout = settings.dashboardLayout
  if (!layout.length) return [...widgets]
  const byId = new Map(widgets.map((w) => [w.id, w]))
  const ordered = layout
    .filter((c) => c.visible && byId.has(c.id as (typeof widgets)[number]['id']))
    .map((c) => byId.get(c.id as (typeof widgets)[number]['id'])!)
  const known = new Set(layout.map((c) => c.id))
  for (const w of widgets) if (!known.has(w.id)) ordered.push(w)
  return ordered
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="muted">Dein Garten auf einen Blick.</p>
      </div>
    </div>

    <div class="card-grid">
      <section v-for="widget in visibleWidgets" :key="widget.id" class="card">
        <h2 class="widget-title">{{ widget.title }}</h2>
        <component :is="widget.component" />
      </section>
    </div>

    <p v-if="!visibleWidgets.length" class="muted">
      Alle Widgets sind ausgeblendet. Unter
      <RouterLink to="/einstellungen">Einstellungen</RouterLink> kannst du sie wieder einblenden.
    </p>
  </div>
</template>

<style scoped>
.widget-title {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  font-weight: 600;
}
</style>
