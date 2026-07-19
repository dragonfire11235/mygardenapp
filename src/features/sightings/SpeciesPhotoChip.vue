<script setup lang="ts">
// Chip für eine noch nicht entdeckte Art: zeigt bei Hover (Desktop) oder
// Antippen (Handy) ein Referenzfoto, damit man weiß, wonach man Ausschau
// halten muss. Foto kommt aus speciesPhotos.ts (Wikidata, per Build-Script).
//
// Das Preview wird per Teleport nach <body> gerendert und dort per fester
// Position (getBoundingClientRect) platziert. Grund: Karten mit aktivem
// Hintergrundbild bekommen backdrop-filter (siehe style.css), und das
// erzeugt einen eigenen Stacking-Context je Karte — dadurch würde ein
// simples position:absolute + z-index vom Preview von der NÄCHSTEN Karte
// überdeckt statt darüber zu liegen.
import { computed, onBeforeUnmount, ref } from 'vue'
import type { CuratedSpecies } from './speciesCatalog'
import { loadSpeciesPhotos } from './speciesPhotos'

const props = defineProps<{ species: CuratedSpecies }>()

const photoUrl = ref<string | null>(null)
const loaded = ref(false)
loadSpeciesPhotos().then((photos) => {
  photoUrl.value = photos[props.species.scientificName] ?? null
  loaded.value = true
})

const PREVIEW_WIDTH = 170
const MARGIN = 8

const hovering = ref(false)
const tapped = ref(false)
const visible = computed(() => hovering.value || tapped.value)

const chipEl = ref<HTMLElement | null>(null)
const previewEl = ref<HTMLElement | null>(null)
const position = ref({ top: '0px', left: '0px' })

function updatePosition() {
  const rect = chipEl.value?.getBoundingClientRect()
  if (!rect) return
  const left = Math.min(rect.left, window.innerWidth - PREVIEW_WIDTH - MARGIN)
  position.value = { top: `${rect.bottom + 6}px`, left: `${Math.max(MARGIN, left)}px` }
}

function onEnter() {
  updatePosition()
  hovering.value = true
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (chipEl.value?.contains(target) || previewEl.value?.contains(target)) return
  tapped.value = false
}

function closeTapped() {
  tapped.value = false
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('scroll', closeTapped, true)
  window.removeEventListener('resize', closeTapped)
}

function toggle() {
  if (tapped.value) {
    closeTapped()
    return
  }
  updatePosition()
  tapped.value = true
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('scroll', closeTapped, true)
  window.addEventListener('resize', closeTapped)
}

onBeforeUnmount(closeTapped)
</script>

<template>
  <span
    ref="chipEl"
    class="chip"
    :class="{ 'chip-open': visible }"
    tabindex="0"
    @mouseenter="onEnter"
    @mouseleave="hovering = false"
    @click.stop="toggle"
  >
    {{ species.name }}
  </span>
  <Teleport to="body">
    <div v-if="visible" ref="previewEl" class="species-photo-preview" :style="position" @click.stop>
      <img v-if="photoUrl" :src="photoUrl" :alt="species.name" loading="lazy" />
      <p v-else-if="loaded" class="preview-empty muted">Kein Foto verfügbar.</p>
      <p class="preview-caption">{{ species.name }}</p>
      <p class="preview-hint muted">{{ species.hint }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.chip {
  background: var(--surface-tint);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.chip-open {
  background: var(--accent-soft);
}
</style>

<style>
/* Nicht scoped: das Preview lebt per Teleport außerhalb dieser Komponente in <body>. */
.species-photo-preview {
  position: fixed;
  z-index: 1000;
  width: 170px;
  background: var(--surface-card-solid);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-m);
  padding: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
  cursor: default;
}

.species-photo-preview img {
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}

.species-photo-preview .preview-empty {
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.75rem;
}

.species-photo-preview .preview-caption {
  margin: 0.4rem 0 0;
  font-weight: 600;
  font-size: 0.8rem;
}

.species-photo-preview .preview-hint {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
}
</style>
