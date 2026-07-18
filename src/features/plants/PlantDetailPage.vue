<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { categoryColors, categoryLabels, formatMonths, plantSpreadM, sunlightLabels } from '../../shared/texts'
import { formatDate } from '../../shared/dates'
import PhotoImg from '../../shared/PhotoImg.vue'
import { useBedsStore } from '../beds/bedsStore'
import { useDiaryStore, type DiaryDraft } from '../diary/diaryStore'
import DiaryEntryDialog from '../diary/DiaryEntryDialog.vue'
import type { DiaryEntry } from '../../data'
import { usePlantsStore, type PlantDraft } from './plantsStore'
import PlantFormDialog from './PlantFormDialog.vue'
import { getCatalogByBotanical, getCatalogMapByBotanical } from './catalogApi'
import type { CatalogPlant } from './catalogTypes'
import { activeGroups, levelLabel, scoreLabel } from './beneficials'
import { resolveCompanions } from './companions'

const route = useRoute()
const router = useRouter()
const plantsStore = usePlantsStore()
const bedsStore = useBedsStore()
const diaryStore = useDiaryStore()
const confirm = useConfirm()

const plantId = computed(() => route.params.id as string)
const plant = computed(() => plantsStore.byId.get(plantId.value) ?? null)

// Kategorie-Tönung (Kategorie-Farbe mit 13 % Alpha, wie im Design-System)
const catColor = computed(() => (plant.value ? categoryColors[plant.value.category] : 'var(--accent)'))
const catTint = computed(() => `${catColor.value}22`)

const editVisible = ref(false)

// Nützlinge aus dem Katalog (per botanischem Namen nachgeschlagen)
const catalogEntry = ref<CatalogPlant | null>(null)
watch(
  () => plant.value?.botanicalName,
  async (name) => {
    catalogEntry.value = name ? await getCatalogByBotanical(name).catch(() => null) : null
  },
  { immediate: true },
)
const beneficialGroups = computed(() => activeGroups(catalogEntry.value?.beneficials))

// Mischkultur (gute/schlechte Nachbarn) — Referenznamen aus dem Katalog auflösen
const catalogMap = ref<Map<string, CatalogPlant> | null>(null)
getCatalogMapByBotanical().then((m) => { catalogMap.value = m }).catch(() => {})
const companions = computed(() =>
  catalogMap.value ? resolveCompanions(catalogEntry.value ?? undefined, catalogMap.value) : { good: [], bad: [] },
)

const plantings = computed(() => bedsStore.plantings.filter((p) => p.plantId === plantId.value))
const activePlantings = computed(() => plantings.value.filter((p) => p.removedAt === null))
const pastPlantings = computed(() => plantings.value.filter((p) => p.removedAt !== null))

// Pflege-Kacheln (nur befüllte Werte; Icons/Farben laut Handoff)
const careTiles = computed(() => {
  const p = plant.value
  if (!p) return []
  const tiles: { icon: string; color: string; label: string; value: string }[] = []
  if (p.wateringIntervalDays)
    tiles.push({ icon: 'ph-drop', color: 'var(--info)', label: 'Gießen', value: `alle ${p.wateringIntervalDays} Tage` })
  if (p.fertilizingIntervalDays)
    tiles.push({ icon: 'ph-flask', color: 'var(--accent)', label: 'Düngen', value: `alle ${p.fertilizingIntervalDays} Tage` })
  if (p.sunlight)
    tiles.push({ icon: 'ph-sun', color: 'var(--warning)', label: 'Standort', value: sunlightLabels[p.sunlight] })
  tiles.push({
    icon: 'ph-arrows-out-line-horizontal',
    color: 'var(--lumi-bark-500)',
    label: 'Wuchsbreite',
    value: `${plantSpreadM(p).toLocaleString('de-DE')} m`,
  })
  if (p.sowingMonths.length)
    tiles.push({ icon: 'ph-plant', color: '#10b981', label: 'Aussaat', value: formatMonths(p.sowingMonths) })
  if (p.harvestMonths.length)
    tiles.push({ icon: 'ph-basket', color: '#dba842', label: 'Ernte', value: formatMonths(p.harvestMonths) })
  if (p.bloomMonths?.length)
    tiles.push({ icon: 'ph-flower', color: '#d946ef', label: 'Blüte', value: formatMonths(p.bloomMonths) })
  if (p.pruningMonths?.length)
    tiles.push({ icon: 'ph-scissors', color: '#d95f4c', label: 'Schnitt', value: formatMonths(p.pruningMonths) })
  return tiles
})

const diaryEntries = computed(() =>
  diaryStore.sortedEntries.filter((e) => e.plantIds.includes(plantId.value)),
)

// Tagebuch: neuer Eintrag (vorverknüpft) oder bestehenden bearbeiten
const diaryDialogVisible = ref(false)
const editingEntry = ref<DiaryEntry | null>(null)

function openDiaryEntry(entry: DiaryEntry | null) {
  editingEntry.value = entry
  diaryDialogVisible.value = true
}

async function saveDiaryEntry(draft: DiaryDraft) {
  if (editingEntry.value) {
    await diaryStore.update({ ...editingEntry.value, ...draft })
  } else {
    await diaryStore.create(draft)
  }
}

function bedName(id: string): string {
  return bedsStore.bedById.get(id)?.name ?? 'Unbekanntes Beet'
}

async function saveEdit(draft: PlantDraft) {
  if (plant.value) await plantsStore.update({ ...plant.value, ...draft })
}

function removePlant() {
  const p = plant.value
  if (!p) return
  confirm.require({
    message: `„${p.name}" wirklich löschen?`,
    header: 'Pflanze löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: async () => {
      await plantsStore.remove(p.id)
      router.push('/pflanzen')
    },
  })
}
</script>

<template>
  <div class="page">
    <div class="detail-head">
      <button type="button" class="circle-glass-btn" aria-label="Zurück zu Pflanzen" @click="router.push('/pflanzen')">
        <i class="ph-bold ph-caret-left" />
      </button>
      <h1 class="page-title">{{ plant?.name ?? 'Pflanze' }}</h1>
      <div v-if="plant" class="head-actions">
        <button type="button" class="circle-glass-btn" aria-label="Bearbeiten" title="Bearbeiten" @click="editVisible = true">
          <i class="ph-bold ph-pencil-simple" />
        </button>
        <button type="button" class="circle-glass-btn head-delete" aria-label="Löschen" title="Löschen" @click="removePlant">
          <i class="ph-bold ph-trash" />
        </button>
      </div>
    </div>

    <template v-if="plant">
      <!-- Kopfkarte -->
      <div class="head-card">
        <PhotoImg v-if="plant.photoId" :photo-id="plant.photoId" class="head-img" />
        <img v-else-if="plant.imageUrl" :src="plant.imageUrl" alt="" class="head-img" />
        <div v-else class="head-img head-img-empty" :style="{ background: catTint }">🌿</div>

        <div class="head-info">
          <div class="head-name">{{ plant.name }}</div>
          <div v-if="plant.botanicalName" class="head-botanical">{{ plant.botanicalName }}</div>
          <div class="head-chips">
            <span class="head-chip" :style="{ background: catTint, color: catColor }">{{ categoryLabels[plant.category] }}</span>
            <span v-for="pl in activePlantings" :key="pl.id" class="head-chip chip-bed">{{ bedName(pl.bedId) }}</span>
          </div>
        </div>
      </div>

      <!-- Pflege-Kacheln -->
      <div class="care-grid">
        <div v-for="tile in careTiles" :key="tile.label" class="care-tile">
          <div class="care-icon" :style="{ color: tile.color }"><i class="ph-fill" :class="tile.icon" /></div>
          <div class="care-label">{{ tile.label }}</div>
          <div class="care-value">{{ tile.value }}</div>
        </div>
      </div>

      <!-- Nützlinge (aus dem Katalog) -->
      <section v-if="catalogEntry?.beneficialScore" class="card">
        <h2 class="section-title">
          Nützlinge
          <span class="ben-badge">{{ scoreLabel(catalogEntry.beneficialScore) }} · {{ catalogEntry.beneficialScore }}/5</span>
        </h2>
        <div class="ben-list">
          <div v-for="g in beneficialGroups" :key="g.group.key" class="ben-row">
            <div class="icon-tile ben-tile"><i class="ph-fill" :class="g.group.phIcon" /></div>
            <div class="ben-name">{{ g.group.label }}</div>
            <div class="ben-track"><div class="ben-fill" :style="{ width: `${Math.round((g.score / 3) * 100)}%` }" /></div>
            <div class="ben-score">{{ levelLabel(g.score) }}</div>
          </div>
        </div>
        <p class="muted ben-note">
          Schätzung aus Interaktionsdaten (GloBI) — je nach Art unterschiedlich gut belegt.
        </p>
      </section>

      <!-- Mischkultur (aus dem Katalog) -->
      <section v-if="companions.good.length || companions.bad.length" class="card">
        <h2 class="section-title">Mischkultur</h2>
        <div v-if="companions.good.length" class="comp-row">
          <span class="comp-tag comp-good">✓ Gute Nachbarn</span>
          <span>{{ companions.good.map((c) => c.name).join(', ') }}</span>
        </div>
        <div v-if="companions.bad.length" class="comp-row">
          <span class="comp-tag comp-bad">✗ Lieber nicht neben</span>
          <span>{{ companions.bad.map((c) => c.name).join(', ') }}</span>
        </div>
      </section>

      <!-- Notizen -->
      <section v-if="plant.notes" class="card">
        <h2 class="section-title">Notizen</h2>
        <p class="notes">{{ plant.notes }}</p>
      </section>

      <!-- In welchen Beeten -->
      <section class="card">
        <h2 class="section-title">In Beeten</h2>
        <ul v-if="activePlantings.length" class="link-list">
          <li v-for="pl in activePlantings" :key="pl.id">
            <RouterLink :to="`/beete/${pl.bedId}`" class="row-link">
              <span>🌿 {{ bedName(pl.bedId) }}<span v-if="pl.quantity > 1" class="muted"> ×{{ pl.quantity }}</span></span>
              <span class="muted">seit {{ formatDate(pl.plantedAt) }}</span>
            </RouterLink>
          </li>
        </ul>
        <p v-else class="muted">Aktuell in keinem Beet eingepflanzt.</p>

        <template v-if="pastPlantings.length">
          <h3 class="sub-title">Früher</h3>
          <ul class="link-list">
            <li v-for="pl in pastPlantings" :key="pl.id">
              <RouterLink :to="`/beete/${pl.bedId}`" class="row-link muted">
                <span>{{ bedName(pl.bedId) }}</span>
                <span>{{ formatDate(pl.plantedAt) }} – {{ formatDate(pl.removedAt!) }}</span>
              </RouterLink>
            </li>
          </ul>
        </template>
      </section>

      <!-- Tagebuch -->
      <section class="card">
        <div class="section-head">
          <h2 class="section-title">Tagebuch</h2>
          <button type="button" class="pill-btn-ghost" @click="openDiaryEntry(null)">
            <i class="ph-bold ph-plus" /> Eintrag
          </button>
        </div>
        <ul v-if="diaryEntries.length" class="link-list">
          <li v-for="entry in diaryEntries" :key="entry.id">
            <button class="row-link row-btn" @click="router.push(`/tagebuch/${entry.id}`)">
              <span>📖 {{ entry.title || entry.text || 'Eintrag' }}</span>
              <span class="muted">{{ formatDate(entry.date) }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="muted">Noch keine Einträge zu dieser Pflanze.</p>
      </section>

      <DiaryEntryDialog
        v-model:visible="diaryDialogVisible"
        :initial="editingEntry"
        :preset-plant-ids="[plantId]"
        @save="saveDiaryEntry"
      />

      <PlantFormDialog
        v-model:visible="editVisible"
        :initial="{ ...plant }"
        editing
        @save="saveEdit"
        @delete="removePlant"
      />
    </template>

    <div v-else-if="plantsStore.loaded" class="empty-state">
      <i class="ph-fill ph-potted-plant" />
      <p>Diese Pflanze gibt es nicht (mehr).</p>
    </div>
  </div>
</template>

<style scoped>
.detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.detail-head .page-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.head-actions {
  display: flex;
  gap: 8px;
}
.head-delete {
  color: var(--danger);
}

/* Kopfkarte (Radius 32) */
.head-card {
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  padding: 22px;
  box-shadow: var(--shadow-glow), var(--shadow-card);
  display: flex;
  gap: 18px;
  align-items: center;
}

.head-card > .head-img {
  width: 84px;
  height: 84px;
  border-radius: 28px;
  object-fit: cover;
  flex: none;
}
.head-img-empty {
  display: grid;
  place-items: center;
  font-size: 46px;
}

.head-info {
  min-width: 0;
}
.head-name {
  font-size: 19px;
  font-weight: 800;
}
.head-botanical {
  font-size: 13px;
  color: var(--text-3);
  font-style: italic;
}
.head-chips {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.head-chip {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 11px;
  border-radius: var(--radius-pill);
}
.chip-bed {
  background: var(--surface-tint);
  color: var(--text-2);
}

/* Pflege-Kacheln */
.care-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}
.care-tile {
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: 20px;
  padding: 14px;
  box-shadow: var(--shadow-glow);
}
.care-icon {
  font-size: 20px;
}
.care-label {
  font-size: 13px;
  color: var(--text-3);
  font-weight: 600;
}
.care-value {
  font-weight: 800;
}

.sub-title {
  font-size: 13px;
  color: var(--text-3);
  margin: 12px 0 6px;
}

.notes {
  margin: 0;
  white-space: pre-wrap;
  font-size: 14px;
  color: var(--text-2);
}

.ben-badge {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-strong);
  background: var(--accent-soft);
  border-radius: var(--radius-pill);
  padding: 2px 10px;
  margin-left: 8px;
  vertical-align: middle;
}

.ben-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ben-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ben-tile {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 18px;
}
.ben-name {
  flex: 1;
  min-width: 0;
  font-weight: 700;
  font-size: 14px;
}
.ben-track {
  width: 110px;
  height: 8px;
  border-radius: 99px;
  background: var(--border-soft);
  overflow: hidden;
}
.ben-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--accent);
}
.ben-score {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-2);
  min-width: 44px;
  text-align: right;
}

.ben-note {
  margin: 10px 0 0;
  font-size: 12px;
}

.comp-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 6px;
  flex-wrap: wrap;
  font-size: 14px;
}
.comp-tag {
  font-size: 12px;
  font-weight: 700;
  border-radius: var(--radius-pill);
  padding: 3px 10px;
  white-space: nowrap;
}
.comp-good {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
.comp-bad {
  background: var(--danger-soft);
  color: var(--danger);
}

.link-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.row-link {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 2px;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid var(--border-soft);
  font-size: 14px;
}
.row-link:hover {
  color: var(--accent-strong);
}
.link-list li:last-child .row-link {
  border-bottom: none;
}

.row-btn {
  width: 100%;
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font: inherit;
  cursor: pointer;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
</style>
