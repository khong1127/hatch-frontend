<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const isAuthed = computed(() => !!auth.user)

function startTrip() {
  router.push('/session')
}
</script>

<template>
  <main>
    <div class="wrapper">
      <div v-if="isAuthed" class="start-trip-section">
        <button @click="startTrip" class="start-trip-btn">
          🦜 Start Trip
        </button>
      </div>
      <h1>Welcome to Hatch</h1>
      <p v-if="isAuthed">Ready to log your bird watching adventures!</p>
      <p v-else>Sign in to start tracking your trips.</p>
    </div>
  </main>
</template>

<style scoped>
main {
  padding: 2rem;
}

.wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.start-trip-section {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.start-trip-btn {
  padding: 1rem 3rem;
  font-size: 1.5rem;
  font-weight: bold;
  background: var(--color-background-mute);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.start-trip-btn:hover {
  background: var(--color-background-soft);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  text-align: center;
}

p {
  text-align: center;
  opacity: 0.8;
}
</style>

