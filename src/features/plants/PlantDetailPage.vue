<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { categoryLabels, formatMonths, plantSpreadM, sunlightLabels } from '../../shared/texts'
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
    <Button
      label="Pflanzen"
      icon="pi pi-arrow-left"
      text
      severity="secondary"
      class="back-btn"
      @click="router.push('/pflanzen')"
    />

    <template v-if="plant">
      <div class="detail-hero card">
        <PhotoImg v-if="plant.photoId" :photo-id="plant.photoId" class="hero-img" />
        <img v-else-if="plant.imageUrl" :src="plant.imageUrl" alt="" class="hero-img" />
        <div v-else class="hero-img hero-img-empty">🌿</div>

        <div class="hero-info">
          <div class="hero-title">
            <h1>{{ plant.name }}</h1>
            <Tag :value="categoryLabels[plant.category]" severity="success" />
          </div>
          <p v-if="plant.botanicalName" class="muted botanical">{{ plant.botanicalName }}</p>
          <div class="hero-actions">
            <Button label="Bearbeiten" icon="pi pi-pencil" size="small" @click="editVisible = true" />
            <Button label="Löschen" icon="pi pi-trash" size="small" severity="danger" outlined @click="removePlant" />
          </div>
        </div>
      </div>

      <!-- Pflegeinfos -->
      <section class="card">
        <h2 class="section-title">Pflege & Eigenschaften</h2>
        <dl class="facts">
          <template v-if="plant.sunlight">
            <dt>Standort</dt><dd>☀️ {{ sunlightLabels[plant.sunlight] }}</dd>
          </template>
          <template v-if="plant.wateringIntervalDays">
            <dt>Gießen</dt><dd>💧 alle {{ plant.wateringIntervalDays }} Tage<span v-if="plant.wateringStartDate"> (ab {{ formatDate(plant.wateringStartDate) }})</span></dd>
          </template>
          <template v-if="plant.fertilizingIntervalDays">
            <dt>Düngen</dt><dd>🧪 alle {{ plant.fertilizingIntervalDays }} Tage</dd>
          </template>
          <template v-if="plant.sowingMonths.length">
            <dt>Aussaat</dt><dd>🌱 {{ formatMonths(plant.sowingMonths) }}</dd>
          </template>
          <template v-if="plant.harvestMonths.length">
            <dt>Ernte</dt><dd>🧺 {{ formatMonths(plant.harvestMonths) }}</dd>
          </template>
          <template v-if="plant.bloomMonths?.length">
            <dt>Blüte</dt><dd>🌸 {{ formatMonths(plant.bloomMonths) }}</dd>
          </template>
          <template v-if="plant.pruningMonths?.length">
            <dt>Schnitt</dt><dd>✂️ {{ formatMonths(plant.pruningMonths) }}</dd>
          </template>
          <dt>Wuchsbreite</dt><dd>↔️ {{ plantSpreadM(plant).toLocaleString('de-DE') }} m</dd>
        </dl>
        <p v-if="plant.notes" class="notes">{{ plant.notes }}</p>
      </section>

      <!-- Nützlinge (aus dem Katalog) -->
      <section v-if="catalogEntry?.beneficialScore" class="card">
        <h2 class="section-title">
          Nützlinge
          <span class="ben-badge">{{ scoreLabel(catalogEntry.beneficialScore) }} · {{ catalogEntry.beneficialScore }}/5</span>
        </h2>
        <ul class="ben-list">
          <li v-for="g in beneficialGroups" :key="g.group.key">
            <span class="ben-ico">{{ g.group.icon }}</span>
            <span class="ben-name">{{ g.group.label }}</span>
            <span class="muted">{{ levelLabel(g.score) }}</span>
          </li>
        </ul>
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
          <Button label="Eintrag" icon="pi pi-plus" size="small" severity="secondary" outlined @click="openDiaryEntry(null)" />
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
      <i class="pi pi-book" />
      <p>Diese Pflanze gibt es nicht (mehr).</p>
    </div>
  </div>
</template>

<style scoped>
.back-btn {
  margin-bottom: 0.5rem;
  padding-left: 0;
}

.detail-hero {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 0.85rem;
}

.detail-hero > .hero-img {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}

.hero-img-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  background: var(--app-bg);
}

.hero-info {
  min-width: 0;
  flex: 1;
}

.hero-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.hero-title h1 {
  font-size: 1.5rem;
}

.botanical {
  font-style: italic;
  margin: 0.2rem 0 0.75rem;
}

.hero-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.card {
  margin-bottom: 0.85rem;
}

.section-title {
  font-size: 1rem;
  margin-bottom: 0.6rem;
}

.sub-title {
  font-size: 0.85rem;
  color: var(--app-text-muted);
  margin: 0.75rem 0 0.4rem;
}

.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
}

.facts dt {
  font-weight: 600;
  color: var(--app-text-muted);
}

.facts dd {
  margin: 0;
}

.notes {
  margin: 0.75rem 0 0;
  white-space: pre-wrap;
}

.ben-badge {
  font-size: 0.78rem;
  font-weight: 600;
  color: #fff;
  background: #16a34a;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  margin-left: 0.5rem;
  vertical-align: middle;
}

.ben-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ben-list li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.ben-ico {
  font-size: 1.1rem;
  width: 1.5rem;
  text-align: center;
}

.ben-name {
  flex: 1;
  min-width: 0;
}

.ben-note {
  margin: 0.6rem 0 0;
  font-size: 0.78rem;
}

.comp-row {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  margin-bottom: 0.4rem;
  flex-wrap: wrap;
}

.comp-tag {
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
}

.comp-good {
  background: rgba(22, 163, 74, 0.15);
  color: #16a34a;
}

.comp-bad {
  background: rgba(220, 38, 38, 0.15);
  color: #dc2626;
}

.link-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.row-link {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.35rem 0;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid var(--app-border);
}

.row-link:hover {
  color: var(--app-accent);
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
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.section-head .section-title {
  margin-bottom: 0;
}
</style>
