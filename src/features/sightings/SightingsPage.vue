<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import type { Sighting, SightingGroup } from '../../data'
import { sightingGroupIcons, sightingGroupLabels } from '../../shared/texts'
import { formatDate } from '../../shared/dates'
import PhotoImg from '../../shared/PhotoImg.vue'
import { useSightingsStore, type SightingDraft } from './sightingsStore'
import SightingDialog from './SightingDialog.vue'
import { earnedAchievements } from './achievements'
import { biodiversityScore } from './biodiversity'
import { useSightingTip } from './useSightingTip'
import { usePlantsStore } from '../plants/plantsStore'
import { speciesForGroup, undiscoveredSpecies } from './speciesCatalog'

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
        <h1>Entdeckungen</h1>
        <span class="muted">{{ store.sightings.length }} Sichtungen · Biodiversitäts-Score {{ score.score }}/100</span>
      </div>
      <Button label="Neue Sichtung" icon="pi pi-plus" @click="openNew" />
    </div>

    <p v-if="tip" class="tip card">💡 {{ tip.text }}</p>
    <p v-else-if="store.sightings.length" class="tip card muted">
      💡 Du hast schon alles fotografiert, was deine Pflanzen anlocken — weiter so!
    </p>

    <div v-if="badges.length" class="badges">
      <span v-for="badge in badges" :key="badge.id" class="badge" :title="badge.description">
        {{ badge.icon }} {{ badge.label }}
      </span>
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
      <i class="pi pi-camera" />
      <p>Noch keine Entdeckungen. Fotografiere Insekten oder Vögel in deinem Garten und sammle sie hier.</p>
    </div>

    <details v-for="entry in undiscoveredByGroup" :key="entry.group" class="card undiscovered">
      <summary>
        {{ sightingGroupIcons[entry.group] }} {{ entry.species.length }} {{ groupPluralLabels[entry.group] }}
        noch zu entdecken
      </summary>
      <div class="chip-list">
        <span v-for="s in entry.species" :key="s.name" class="chip" :title="s.hint">{{ s.name }}</span>
      </div>
    </details>

    <SightingDialog v-model:visible="dialogVisible" :initial="editingSighting" @save="save" @delete="removeCurrent" />
  </div>
</template>

<style scoped>
.tip {
  margin: 0 0 0.9rem;
  padding: 0.6rem 0.9rem;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.9rem;
}

.badge {
  background: var(--app-accent-soft, rgba(22, 163, 74, 0.12));
  color: var(--app-accent);
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 640px;
}

.group-title {
  margin: 0 0 0.6rem;
  font-size: 1rem;
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
  border-radius: var(--app-radius);
}

.photo-caption {
  font-size: 0.8rem;
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
  gap: 0.35rem;
  margin-top: 0.6rem;
}

.chip {
  background: var(--app-surface-muted, rgba(100, 116, 139, 0.12));
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
}
</style>
