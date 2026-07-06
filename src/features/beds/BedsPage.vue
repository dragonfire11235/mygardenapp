<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import type { Bed } from '../../data'
import { formatDate } from '../../shared/dates'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from './bedsStore'
import BedFormDialog, { type BedDraft } from './BedFormDialog.vue'
import PlantingDialog from './PlantingDialog.vue'

const store = useBedsStore()
const plantsStore = usePlantsStore()
const confirm = useConfirm()

const bedDialogVisible = ref(false)
const plantingDialogVisible = ref(false)
const editingBed = ref<Bed | null>(null)
const plantingBedId = ref<string | null>(null)

function openNewBed() {
  editingBed.value = null
  bedDialogVisible.value = true
}

function openEditBed(bed: Bed) {
  editingBed.value = bed
  bedDialogVisible.value = true
}

function openPlanting(bedId: string) {
  plantingBedId.value = bedId
  plantingDialogVisible.value = true
}

async function saveBed(draft: BedDraft) {
  if (editingBed.value) {
    await store.updateBed({ ...editingBed.value, ...draft })
  } else {
    await store.createBed(draft)
  }
}

function removeBed() {
  const bed = editingBed.value
  if (!bed) return
  confirm.require({
    message: `„${bed.name}" wirklich löschen? Aktive Bepflanzungen werden beendet.`,
    header: 'Beet löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.removeBed(bed.id),
  })
}

async function savePlanting(data: { plantId: string; quantity: number; plantedAt: string }) {
  if (!plantingBedId.value) return
  await store.addPlanting({ ...data, bedId: plantingBedId.value, notes: '' })
}

function endPlanting(plantingId: string, plantName: string) {
  confirm.require({
    message: `„${plantName}" aus dem Beet entfernen?`,
    header: 'Bepflanzung beenden',
    icon: 'pi pi-question-circle',
    acceptProps: { label: 'Entfernen' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.endPlanting(plantingId),
  })
}

function plantName(plantId: string): string {
  return plantsStore.byId.get(plantId)?.name ?? 'Unbekannte Pflanze'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Beete</h1>
        <span class="muted">{{ store.beds.length }} angelegt</span>
      </div>
      <Button label="Neues Beet" icon="pi pi-plus" @click="openNewBed" />
    </div>

    <div v-if="store.beds.length" class="card-grid">
      <div v-for="bed in store.beds" :key="bed.id" class="card">
        <div class="bed-header">
          <div>
            <strong>{{ bed.name }}</strong>
            <div class="muted">
              {{ [bed.location, bed.sizeText].filter(Boolean).join(' · ') || ' ' }}
            </div>
          </div>
          <Button icon="pi pi-pencil" text rounded severity="secondary" aria-label="Bearbeiten" @click="openEditBed(bed)" />
        </div>

        <ul class="planting-list">
          <li
            v-for="planting in store.activePlantingsByBed.get(bed.id) ?? []"
            :key="planting.id"
            class="planting"
          >
            <span>
              🌿 {{ plantName(planting.plantId) }}
              <span v-if="planting.quantity > 1" class="muted">×{{ planting.quantity }}</span>
            </span>
            <span class="planting-right muted">
              seit {{ formatDate(planting.plantedAt) }}
              <Button
                icon="pi pi-times"
                text
                rounded
                size="small"
                severity="secondary"
                aria-label="Entfernen"
                @click="endPlanting(planting.id, plantName(planting.plantId))"
              />
            </span>
          </li>
          <li v-if="!(store.activePlantingsByBed.get(bed.id) ?? []).length" class="muted planting-empty">
            Noch nichts eingepflanzt.
          </li>
        </ul>

        <Button
          label="Pflanze einsetzen"
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          outlined
          @click="openPlanting(bed.id)"
        />
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="pi pi-table" />
      <p>Noch keine Beete. Lege dein erstes Beet oder deinen ersten Standort an.</p>
    </div>

    <BedFormDialog
      v-model:visible="bedDialogVisible"
      :initial="editingBed"
      @save="saveBed"
      @delete="removeBed"
    />
    <PlantingDialog v-model:visible="plantingDialogVisible" @save="savePlanting" />
  </div>
</template>

<style scoped>
.bed-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.planting-list {
  list-style: none;
  padding: 0;
  margin: 0.6rem 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.planting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.planting-right {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.planting-empty {
  padding: 0.25rem 0;
}
</style>
