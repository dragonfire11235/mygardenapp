<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { getPhotoUrl } from './photos'

const props = defineProps<{ photoId: string }>()

const url = ref<string | null>(null)

watchEffect(async () => {
  url.value = await getPhotoUrl(props.photoId)
})
</script>

<template>
  <img v-if="url" :src="url" alt="" class="photo-img" loading="lazy" />
</template>

<style scoped>
.photo-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 10px;
}
</style>
