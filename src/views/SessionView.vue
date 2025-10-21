<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { startSession, addEntry, endSession } from '@/services/api'

const router = useRouter()
const auth = useAuthStore()
const username = computed(() => auth.user?.username || '')

const sessionId = ref<string | null>(null)
const loading = ref(false)
const entries = ref<Array<{ id: string; image: string }>>([])
const error = ref('')

async function initSession() {
  if (!username.value) {
    router.push('/auth')
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await startSession(username.value)
    sessionId.value = res.session
  } catch (e: any) {
    error.value = e.message || 'Failed to start session'
  } finally {
    loading.value = false
  }
}

async function logBird() {
  if (!sessionId.value || !username.value) return
  
  // Create file input for camera
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment' as any // Request camera on mobile
  
  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0]
    if (!file) return
    
    loading.value = true
    try {
      // Convert to base64 for now (TODO: upload to storage service)
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        
        // For now, use a placeholder ID (backend may require actual image IDs)
        const imageId = `img_${Date.now()}`
        
        await addEntry(username.value, sessionId.value!, imageId)
        
        // Add to local entries for display
        entries.value.push({ id: imageId, image: base64 })
      }
      reader.readAsDataURL(file)
    } catch (e: any) {
      error.value = e.message || 'Failed to log entry'
    } finally {
      loading.value = false
    }
  }
  
  input.click()
}

async function finishSession() {
  if (!sessionId.value || !username.value) return
  loading.value = true
  try {
    await endSession(username.value, sessionId.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.message || 'Failed to end session'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initSession()
})
</script>

<template>
  <main class="session-view">
    <div class="top-bar">
      <h1>Trip Session</h1>
      <button @click="finishSession" :disabled="loading || !sessionId" class="end-btn">
        End Session
      </button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading && !sessionId" class="loading">Starting session…</div>

    <div class="entries-grid" v-if="sessionId">
      <div v-if="!entries.length && !loading" class="empty-state">
        No birds logged yet. Tap "Log a Bird" below to start!
      </div>
      <div v-for="entry in entries" :key="entry.id" class="entry-card">
        <img :src="entry.image" :alt="entry.id" />
      </div>
    </div>

    <div class="bottom-bar" v-if="sessionId">
      <button @click="logBird" :disabled="loading" class="log-btn">
        📸 Log a Bird
      </button>
    </div>
  </main>
</template>

<style scoped>
.session-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 1rem;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1rem;
}

.top-bar h1 {
  margin: 0;
  font-size: 1.5rem;
}

.end-btn {
  padding: 0.5rem 1rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.end-btn:hover:not(:disabled) {
  background: var(--color-background-soft);
}

.end-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.entries-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
  overflow-y: auto;
}

.entry-card {
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.entry-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  opacity: 0.7;
}

.bottom-bar {
  position: sticky;
  bottom: 0;
  padding: 1rem 0;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
  display: flex;
  justify-content: center;
}

.log-btn {
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  cursor: pointer;
  border-radius: 4px;
}

.log-btn:hover:not(:disabled) {
  background: var(--color-background-soft);
}

.log-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: red;
  padding: 0.5rem;
  margin-bottom: 1rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  opacity: 0.7;
}
</style>
