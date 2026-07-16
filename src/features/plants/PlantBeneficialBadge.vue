<script setup lang="ts">
// Kompakte Nützlings-/Vogel-Icons für eine einzelne Pflanze (Katalog-Lookup
// per botanischem Namen). Muster wie BedBeneficialBadge, aber ohne
// Aggregation über mehrere Pflanzen.
import { computed, ref } from 'vue'
import type { CatalogPlant } from './catalogTypes'
import { getCatalogMapByBotanical, normalizeBotanical } from './catalogApi'
import { activeGroups, scoreLabel } from './beneficials'

const props = defineProps<{ botanicalName: string }>()

// getCatalogMapByBotanical() cached die Katalog-Map bereits modulweit —
// hier reicht ein einfacher Abruf pro Instanz.
const catalogMap = ref<Map<string, CatalogPlant> | null>(null)
getCatalogMapByBotanical().then((m) => { catalogMap.value = m }).catch(() => {})

const entry = computed(() => {
  if (!props.botanicalName.trim() || !catalogMap.value) return undefined
  return catalogMap.value.get(normalizeBotanical(props.botanicalName))
})

const groups = computed(() => activeGroups(entry.value?.beneficials))
</script>

<template>
  <span
    v-if="groups.length"
    class="ben-badge"
    :title="`Nützlinge & Vögel ${entry?.beneficialScore}/5 · ${scoreLabel(entry?.beneficialScore)} (Schätzung aus GloBI)`"
  >
    <span v-for="g in groups" :key="g.group.key" :title="g.group.label">{{ g.group.icon }}</span>
  </span>
</template>

<style scoped>
.ben-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.85rem;
}
</style>
