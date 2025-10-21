<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const username = computed(() => auth.user?.username || 'Unknown')
</script>

<template>
  <main class="profile">
    <h1>{{ username }}'s Profile</h1>
    <p>Posts will appear here soon.</p>
  </main>
</template>

<style scoped>
.profile { padding: 2rem; display: grid; gap: 1rem; }
</style>
