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
    <div class="detail-head-row">
      <button type="button" class="circle-glass-btn" aria-label="Zurück zu Beeten" @click="router.push('/beete')">
        <i class="ph-bold ph-caret-left" />
      </button>
      <div class="head-titles">
        <h1 class="page-title">{{ bed?.name ?? 'Beet' }}</h1>
        <div v-if="bed" class="muted head-sub">
          {{ [bed.location, sizeLabel()].filter(Boolean).join(' · ') || 'Kreise = Wuchsbreite' }}
        </div>
      </div>
      <div v-if="bed" class="head-actions">
        <button type="button" class="circle-glass-btn" aria-label="Bearbeiten" title="Bearbeiten" @click="editVisible = true">
          <i class="ph-bold ph-pencil-simple" />
        </button>
        <button type="button" class="circle-glass-btn head-delete" aria-label="Löschen" title="Löschen" @click="removeBed">
          <i class="ph-bold ph-trash" />
        </button>
      </div>
    </div>

    <template v-if="bed">
      <PhotoImg v-if="bed.photoId" :photo-id="bed.photoId" class="bed-hero-img" />
      <p v-if="bed.notes" class="card notes">{{ bed.notes }}</p>

      <!-- Beetplaner -->
      <section class="planner-block">
        <BedPlanner :bed="bed" />
      </section>

      <!-- Bepflanzung -->
      <section class="card">
        <div class="section-head">
          <h2 class="section-title">Bepflanzung</h2>
          <button type="button" class="pill-btn-ghost" @click="plantingVisible = true">
            <i class="ph-bold ph-plus" /> Pflanze einsetzen
          </button>
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
      <i class="ph-fill ph-grid-four" />
      <p>Dieses Beet gibt es nicht (mehr).</p>
    </div>
  </div>
</template>

<style scoped>
.detail-head-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.head-titles {
  flex: 1;
  min-width: 0;
}
.head-sub {
  font-size: 13px;
}
.head-actions {
  display: flex;
  gap: 8px;
}
.head-delete {
  color: var(--danger);
}

.bed-hero-img {
  width: 100%;
  height: 160px;
  border-radius: var(--radius-l);
  object-fit: cover;
  box-shadow: var(--shadow-card);
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
  color: var(--danger);
  font-weight: 600;
}

.comp-list .comp-good {
  color: var(--accent-strong);
  font-weight: 600;
}

.notes {
  margin: 0;
  white-space: pre-wrap;
  font-size: 14px;
  color: var(--text-2);
}

.section-title {
  margin-bottom: 12px;
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
  font-size: 13px;
  color: var(--text-3);
  margin: 12px 0 6px;
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
