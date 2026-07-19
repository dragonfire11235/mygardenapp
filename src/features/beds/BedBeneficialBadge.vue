<script setup lang="ts">
import { computed } from 'vue'
import { scoreLabel } from '../plants/beneficials'
import { useBedBeneficials } from './useBedBeneficials'

const props = defineProps<{ bedId: string }>()
const { forBed } = useBedBeneficials()
const value = computed(() => forBed(props.bedId))
</script>

<template>
  <span
    v-if="value"
    class="ben-badge"
    :title="`Nützlings-Score ${value.score}/5 (aus den Pflanzen im Beet, Schätzung)`"
  >
    <span v-for="g in value.groups" :key="g.group.key">{{ g.group.icon }}</span>
    <span class="ben-txt">Nützlinge {{ value.score }}/5 · {{ scoreLabel(value.score) }}</span>
  </span>
</template>

<style scoped>
.ben-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  background: var(--bg-app);
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
}

.ben-txt {
  color: var(--text-2);
  font-size: 0.76rem;
}
</style>
