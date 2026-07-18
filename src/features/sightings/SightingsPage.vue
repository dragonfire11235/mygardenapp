<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import type { Sighting, SightingGroup } from '../../data'
import { sightingGroupIcons, sightingGroupLabels } from '../../shared/texts'
import { formatDate } from '../../shared/dates'
import PhotoImg from '../../shared/PhotoImg.vue'
import { useSightingsStore, type SightingDraft } from './sightingsStore'
import SightingDialog from './SightingDialog.vue'
import { allAchievements, earnedAchievements } from './achievements'
import { biodiversityScore } from './biodiversity'
import { useSightingTip } from './useSightingTip'
import { usePlantsStore } from '../plants/plantsStore'
import { speciesForGroup, undiscoveredSpecies } from './speciesCatalog'
import SpeciesPhotoChip from './SpeciesPhotoChip.vue'

const GROUPS_WITH_CATALOG: SightingGroup[] = ['wildbee', 'butterfly', 'hoverfly', 'beetle', 'bird']

/** Pluralform nur für die Überschrift der "noch zu entdecken"-Listen. */
const groupPluralLabels: Partial<Record<SightingGroup, string>> = {
  wildbee: 'Wildbienen-Arten',
  butterfly: 'Schmetterlings-Arten',
  hoverfly: 'Schwebfliegen-Arten',
  beetle: 'Käfer-Arten',
  bird: 'Gartenvögel',
}

const store = useSightingsStore()
const plantsStore = usePlantsStore()
const confirm = useConfirm()
const badges = computed(() => earnedAchievements(store.sightings))
const score = computed(() => biodiversityScore(store.sightings))
const { tip } = useSightingTip()

// Score-Ring: Umfang bei r=41 ≈ 258 (wie im Prototyp)
const RING = 258
const ringOffset = computed(() => Math.round(RING * (1 - score.value.score / 100)))
const earnedIds = computed(() => new Set(badges.value.map((b) => b.id)))

const undiscoveredByGroup = computed(() =>
  GROUPS_WITH_CATALOG.filter((group) => speciesForGroup(group).length > 0).map((group) => ({
    group,
    species: undiscoveredSpecies(
      group,
      store.sightings.filter((s) => s.group === group && s.species.trim()).map((s) => s.species),
    ),
  })),
)

onMounted(() => {
  if (!store.loaded) store.load()
  if (!plantsStore.loaded) plantsStore.load()
})

const dialogVisible = ref(false)
const editingSighting = ref<Sighting | null>(null)

function openNew() {
  editingSighting.value = null
  dialogVisible.value = true
}

function openEdit(sighting: Sighting) {
  editingSighting.value = sighting
  dialogVisible.value = true
}

async function save(draft: SightingDraft) {
  if (editingSighting.value) {
    await store.update({ ...editingSighting.value, ...draft })
  } else {
    await store.create(draft)
  }
}

function removeCurrent() {
  const sighting = editingSighting.value
  if (!sighting) return
  confirm.require({
    message: 'Sichtung samt Foto wirklich löschen?',
    header: 'Sichtung löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.remove(sighting),
  })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Entdeckungen</h1>
        <span class="muted">{{ store.sightings.length }} Sichtungen</span>
      </div>
      <button type="button" class="camera-btn" @click="openNew">
        <i class="ph-fill ph-camera" /> Entdeckung
      </button>
    </div>

    <!-- Score-Hero (dunkles Glas) mit Fortschrittsring -->
    <div class="score-hero deep-card">
      <svg width="96" height="96" viewBox="0 0 96 96" class="score-ring">
        <circle cx="48" cy="48" r="41" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="9" />
        <circle
          cx="48" cy="48" r="41" fill="none" stroke="#b5d49a" stroke-width="9"
          stroke-linecap="round" :stroke-dasharray="RING" :stroke-dashoffset="ringOffset"
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="52" text-anchor="middle" font-size="24" font-weight="800" fill="#f4f8ee" font-family="Nunito">{{ score.score }}</text>
        <text x="48" y="66" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(244,248,238,0.7)" font-family="Nunito">von 100</text>
      </svg>
      <div>
        <div class="score-title">Biodiversitäts-Score</div>
        <div class="score-sub">
          {{ tip ? tip.text : score.score >= 50 ? 'Dein Garten summt!' : 'Fotografiere Insekten und Vögel — jede Entdeckung zählt.' }}
        </div>
      </div>
    </div>

    <!-- Abzeichen: verdient in Farbe, gesperrt ausgegraut -->
    <div>
      <h2 class="section-title badge-head">Abzeichen</h2>
      <div class="badge-grid">
        <div
          v-for="badge in allAchievements"
          :key="badge.id"
          class="badge-card"
          :class="{ 'is-locked': !earnedIds.has(badge.id) }"
          :title="badge.description"
        >
          <div class="badge-circle">{{ badge.icon }}</div>
          <div class="badge-label">{{ badge.label }}</div>
          <div class="badge-sub">{{ earnedIds.has(badge.id) ? 'verdient' : 'noch gesperrt' }}</div>
        </div>
      </div>
    </div>

    <div v-if="store.byGroup.size" class="groups">
      <section v-for="[group, sightings] in store.byGroup" :key="group" class="card group-card">
        <h2 class="group-title">{{ sightingGroupIcons[group] }} {{ sightingGroupLabels[group] }} ({{ sightings.length }})</h2>
        <div class="photo-grid">
          <button
            v-for="sighting in sightings"
            :key="sighting.id"
            type="button"
            class="photo-tile"
            @click="openEdit(sighting)"
          >
            <PhotoImg v-if="sighting.photoId" :photo-id="sighting.photoId" />
            <span class="photo-caption">{{ sighting.species || formatDate(sighting.date) }}</span>
          </button>
        </div>
      </section>
    </div>

    <div v-else class="empty-state">
      <i class="ph-fill ph-binoculars" />
      <p>Noch keine Entdeckungen. Fotografiere Insekten oder Vögel in deinem Garten und sammle sie hier.</p>
    </div>

    <details v-for="entry in undiscoveredByGroup" :key="entry.group" class="card undiscovered">
      <summary>
        {{ sightingGroupIcons[entry.group] }} {{ entry.species.length }} {{ groupPluralLabels[entry.group] }}
        noch zu entdecken
      </summary>
      <div class="chip-list">
        <SpeciesPhotoChip v-for="s in entry.species" :key="s.name" :species="s" />
      </div>
    </details>

    <SightingDialog v-model:visible="dialogVisible" :initial="editingSighting" @save="save" @delete="removeCurrent" />
  </div>
</template>

<style scoped>
.camera-btn {
  border: none;
  cursor: pointer;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: filter var(--dur-fast) var(--ease-out);
}
.camera-btn:hover {
  filter: brightness(var(--hover-brightness));
}
.camera-btn i {
  font-size: 16px;
}

.score-hero {
  display: flex;
  gap: 18px;
  align-items: center;
}
.score-ring {
  flex: none;
}
.score-title {
  font-size: 18px;
  font-weight: 800;
}
.score-sub {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 2px;
}

.badge-head {
  margin: 0 0 10px;
}
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.badge-card {
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: 20px;
  padding: 14px 10px;
  text-align: center;
  box-shadow: var(--shadow-glow), var(--shadow-card);
}
.badge-card.is-locked {
  opacity: 0.45;
  filter: grayscale(0.8);
}
.badge-circle {
  width: 46px;
  height: 46px;
  margin: 0 auto 8px;
  border-radius: 50%;
  background: var(--accent-soft);
  display: grid;
  place-items: center;
  font-size: 23px;
}
.badge-label {
  font-size: 12px;
  font-weight: 800;
}
.badge-sub {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
}

.group-title {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 800;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.5rem;
}

.photo-tile {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}

.photo-tile :deep(.photo-img) {
  height: 90px;
  border-radius: 16px;
}

.photo-caption {
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.undiscovered {
  max-width: 640px;
  margin-top: 0.9rem;
}

.undiscovered summary {
  cursor: pointer;
  font-weight: 600;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.6rem;
}
</style>
