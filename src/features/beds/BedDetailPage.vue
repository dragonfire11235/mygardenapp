<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { formatDate } from '../../shared/dates'
import PhotoImg from '../../shared/PhotoImg.vue'
import { usePlantsStore } from '../plants/plantsStore'
import { useDiaryStore, type DiaryDraft } from '../diary/diaryStore'
import DiaryEntryDialog from '../diary/DiaryEntryDialog.vue'
import type { DiaryEntry } from '../../data'
import { useBedsStore } from './bedsStore'
import BedFormDialog, { type BedDraft } from './BedFormDialog.vue'
import BedPlanner from './BedPlanner.vue'
import PlantingDialog from './PlantingDialog.vue'
import { useBedBeneficials } from './useBedBeneficials'
import { useBedCompanions } from './useBedCompanions'
import { levelLabel, scoreLabel } from '../plants/beneficials'

const route = useRoute()
const router = useRouter()
const store = useBedsStore()
const plantsStore = usePlantsStore()
const diaryStore = useDiaryStore()
const confirm = useConfirm()

const bedId = computed(() => route.params.id as string)
const bed = computed(() => store.bedById.get(bedId.value) ?? null)

const editVisible = ref(false)
const plantingVisible = ref(false)

// Nützlingswert des Beets (aus den enthaltenen Pflanzen)
const { forBed } = useBedBeneficials()
const bedBeneficials = computed(() => forBed(bedId.value))

// Mischkultur-Check: gute/schlechte Nachbarschaften im Beet
const { forBed: companionsForBed } = useBedCompanions()
const bedCompanions = computed(() => companionsForBed(bedId.value))

const plantings = computed(() => store.plantings.filter((p) => p.bedId === bedId.value))
const activePlantings = computed(() => plantings.value.filter((p) => p.removedAt === null))
const pastPlantings = computed(() => plantings.value.filter((p) => p.removedAt !== null))

const diaryEntries = computed(() =>
  diaryStore.sortedEntries.filter((e) => e.bedIds.includes(bedId.value)),
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

function plantName(id: string): string {
  return plantsStore.byId.get(id)?.name ?? 'Unbekannte Pflanze'
}

function sizeLabel(): string {
  const b = bed.value
  if (!b) return ''
  if (b.widthM && b.heightM) {
    const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
    return `${fmt(b.widthM)} × ${fmt(b.heightM)} m`
  }
  return b.sizeText
}

async function saveEdit(draft: BedDraft) {
  if (bed.value) await store.updateBed({ ...bed.value, ...draft })
}

function removeBed() {
  const b = bed.value
  if (!b) return
  confirm.require({
    message: `„${b.name}" wirklich löschen? Aktive Bepflanzungen werden beendet.`,
    header: 'Beet löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: async () => {
      await store.removeBed(b.id)
      router.push('/beete')
    },
  })
}

async function savePlanting(data: { plantId: string; quantity: number; plantedAt: string }) {
  await store.addPlanting({ ...data, bedId: bedId.value, notes: '' })
}

function endPlanting(plantingId: string, name: string) {
  confirm.require({
    message: `„${name}" aus dem Beet entfernen?`,
    header: 'Bepflanzung beenden',
    icon: 'pi pi-question-circle',
    acceptProps: { label: 'Entfernen' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.endPlanting(plantingId),
  })
}
</script>

<template>
  <div class="page">
    <Button
      label="Beete"
      icon="pi pi-arrow-left"
      text
      severity="secondary"
      class="back-btn"
      @click="router.push('/beete')"
    />

    <template v-if="bed">
      <div class="card detail-head">
        <PhotoImg v-if="bed.photoId" :photo-id="bed.photoId" class="bed-banner" />
        <div class="head-row">
          <div>
            <h1>{{ bed.name }}</h1>
            <p class="muted">{{ [bed.location, sizeLabel()].filter(Boolean).join(' · ') || ' ' }}</p>
          </div>
          <div class="head-actions">
            <Button label="Bearbeiten" icon="pi pi-pencil" size="small" @click="editVisible = true" />
            <Button label="Löschen" icon="pi pi-trash" size="small" severity="danger" outlined @click="removeBed" />
          </div>
        </div>
        <p v-if="bed.notes" class="notes">{{ bed.notes }}</p>
      </div>

      <!-- Beetplaner -->
      <section class="planner-block">
        <h2 class="section-title"><i class="pi pi-th-large" /> Beetplaner</h2>
        <BedPlanner :bed="bed" />
      </section>

      <!-- Bepflanzung -->
      <section class="card">
        <div class="section-head">
          <h2 class="section-title">Bepflanzung</h2>
          <Button label="Pflanze einsetzen" icon="pi pi-plus" size="small" severity="secondary" outlined @click="plantingVisible = true" />
        </div>
        <ul v-if="activePlantings.length" class="link-list">
          <li v-for="pl in activePlantings" :key="pl.id" class="planting-row">
            <RouterLink :to="`/pflanzen/${pl.plantId}`" class="row-link">
              <span>🌿 {{ plantName(pl.plantId) }}<span v-if="pl.quantity > 1" class="muted"> ×{{ pl.quantity }}</span></span>
              <span class="muted">seit {{ formatDate(pl.plantedAt) }}</span>
            </RouterLink>
            <Button icon="pi pi-times" text rounded size="small" severity="secondary" aria-label="Entfernen" @click="endPlanting(pl.id, plantName(pl.plantId))" />
          </li>
        </ul>
        <p v-else class="muted">Noch nichts eingepflanzt.</p>

        <template v-if="pastPlantings.length">
          <h3 class="sub-title">Früher</h3>
          <ul class="link-list">
            <li v-for="pl in pastPlantings" :key="pl.id">
              <RouterLink :to="`/pflanzen/${pl.plantId}`" class="row-link muted">
                <span>{{ plantName(pl.plantId) }}</span>
                <span>{{ formatDate(pl.plantedAt) }} – {{ formatDate(pl.removedAt!) }}</span>
              </RouterLink>
            </li>
          </ul>
        </template>
      </section>

      <!-- Mischkultur-Check -->
      <section v-if="bedCompanions" class="card">
        <h2 class="section-title">Mischkultur-Check</h2>
        <ul v-if="bedCompanions.conflicts.length" class="comp-list">
          <li v-for="(p, i) in bedCompanions.conflicts" :key="'c' + i" class="comp-bad">
            ✗ {{ p.a }} neben {{ p.b }} — ungünstig
          </li>
        </ul>
        <ul v-if="bedCompanions.matches.length" class="comp-list">
          <li v-for="(p, i) in bedCompanions.matches" :key="'m' + i" class="comp-good">
            ✓ {{ p.a }} &amp; {{ p.b }} — gute Nachbarn
          </li>
        </ul>
        <p class="muted ben-note">Nach gängigen Mischkultur-Regeln · nur Pflanzen aus dem Katalog.</p>
      </section>

      <!-- Nützlinge im Beet (aus den Pflanzen) -->
      <section v-if="bedBeneficials" class="card">
        <h2 class="section-title">
          Nützlinge im Beet
          <span class="ben-badge">{{ scoreLabel(bedBeneficials.score) }} · {{ bedBeneficials.score }}/5</span>
        </h2>
        <ul class="ben-list">
          <li v-for="g in bedBeneficials.groups" :key="g.group.key">
            <span class="ben-ico">{{ g.group.icon }}</span>
            <span class="ben-name">{{ g.group.label }}</span>
            <span class="muted">{{ levelLabel(g.score) }}</span>
          </li>
        </ul>
        <p v-if="bedBeneficials.gaps.length" class="muted ben-note">
          Lücke: {{ bedBeneficials.gaps.map((g) => g.icon + ' ' + g.label).join(' · ') }}
          — hier fehlt Angebot; passende Pflanze nachsetzen.
        </p>
        <p class="muted ben-note">Bestes je Gruppe aus den Pflanzen im Beet · Schätzung (GloBI).</p>
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
        <p v-else class="muted">Noch keine Einträge zu diesem Beet.</p>
      </section>

      <DiaryEntryDialog
        v-model:visible="diaryDialogVisible"
        :initial="editingEntry"
        :preset-bed-ids="[bedId]"
        @save="saveDiaryEntry"
      />

      <BedFormDialog v-model:visible="editVisible" :initial="bed" @save="saveEdit" @delete="removeBed" />
      <PlantingDialog v-model:visible="plantingVisible" @save="savePlanting" />
    </template>

    <div v-else-if="store.loaded" class="empty-state">
      <i class="pi pi-table" />
      <p>Dieses Beet gibt es nicht (mehr).</p>
    </div>
  </div>
</template>

<style scoped>
.back-btn {
  margin-bottom: 0.5rem;
  padding-left: 0;
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

.comp-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.comp-list .comp-bad {
  color: #dc2626;
}

.comp-list .comp-good {
  color: #16a34a;
}

.detail-head {
  margin-bottom: 0.85rem;
}

.card > .bed-banner {
  margin: -1rem -1rem 0.75rem;
  width: calc(100% + 2rem);
  height: 160px;
  border-radius: var(--app-radius) var(--app-radius) 0 0;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.head-row h1 {
  font-size: 1.5rem;
}

.head-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.notes {
  margin: 0.75rem 0 0;
  white-space: pre-wrap;
}

.planner-block {
  margin-bottom: 0.85rem;
}

.card {
  margin-bottom: 0.85rem;
}

.section-title {
  font-size: 1rem;
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title .pi {
  color: var(--app-accent);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.4rem;
}

.section-head .section-title {
  margin-bottom: 0;
}

.sub-title {
  font-size: 0.85rem;
  color: var(--app-text-muted);
  margin: 0.75rem 0 0.4rem;
}

.link-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.planting-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.row-link {
  flex: 1;
  min-width: 0;
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
</style>
