<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useDiaryStore } from './diaryStore'

const props = defineProps<{ photoId: string }>()

const store = useDiaryStore()
const url = ref<string | null>(null)

watchEffect(async () => {
  url.value = await store.photoUrl(props.photoId)
})
</script>

<template>
  <img v-if="url" :src="url" alt="" class="diary-photo" loading="lazy" />
</template>

<style scoped>
.diary-photo {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 10px;
}
</style>
