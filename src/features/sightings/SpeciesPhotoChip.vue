<script setup lang="ts">
// Chip für eine noch nicht entdeckte Art: zeigt bei Hover (Desktop) oder
// Antippen (Handy) ein Referenzfoto, damit man weiß, wonach man Ausschau
// halten muss. Foto kommt aus speciesPhotos.ts (Wikidata, per Build-Script).
//
// Hover läuft rein über CSS (:hover), Tap unabhängig über den `tapped`-State —
// sonst würde ein Klick auf Desktop den durch mouseenter bereits geöffneten
// Preview im selben Moment wieder zuklappen.
import { onBeforeUnmount, ref } from 'vue'
import type { CuratedSpecies } from './speciesCatalog'
import { loadSpeciesPhotos } from './speciesPhotos'

const props = defineProps<{ species: CuratedSpecies }>()

const photoUrl = ref<string | null>(null)
const loaded = ref(false)
loadSpeciesPhotos().then((photos) => {
  photoUrl.value = photos[props.species.scientificName] ?? null
  loaded.value = true
})

const tapped = ref(false)
const rootEl = ref<HTMLElement | null>(null)

function onDocumentClick(event: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) tapped.value = false
}

function toggle() {
  tapped.value = !tapped.value
  if (tapped.value) document.addEventListener('click', onDocumentClick)
  else document.removeEventListener('click', onDocumentClick)
}

onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <span
    ref="rootEl"
    class="chip"
    :class="{ 'chip-open': tapped }"
    tabindex="0"
    :title="species.hint"
    @click.stop="toggle"
  >
    {{ species.name }}
    <div class="preview" :class="{ 'preview-tapped': tapped }" @click.stop>
      <img v-if="photoUrl" :src="photoUrl" :alt="species.name" loading="lazy" />
      <p v-else-if="loaded" class="preview-empty muted">Kein Foto verfügbar.</p>
      <p class="preview-caption">{{ species.name }}</p>
      <p class="preview-hint muted">{{ species.hint }}</p>
    </div>
  </span>
</template>

<style scoped>
.chip {
  position: relative;
  background: var(--app-surface-muted, rgba(100, 116, 139, 0.12));
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.chip-open {
  background: var(--app-accent-soft, rgba(22, 163, 74, 0.15));
}

.preview {
  display: none;
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  left: 0;
  width: 160px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  padding: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  cursor: default;
  white-space: normal;
}

/* Desktop: reines CSS-Hover, unabhängig vom Tap-State */
.chip:hover .preview,
.preview-tapped {
  display: block;
}

.preview img {
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}

.preview-empty {
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.75rem;
}

.preview-caption {
  margin: 0.4rem 0 0;
  font-weight: 600;
  font-size: 0.8rem;
}

.preview-hint {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
}
</style>
