<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { startSession, addEntry, endSession, getEntriesInSession, requestUploadUrl, confirmUpload, getFileById, getViewUrl } from '@/services/api'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const auth = useAuthStore()
const username = computed(() => auth.user?.username || '')

const sessionId = ref<string | null>(null)
const loading = ref(false)
const entries = ref<Array<{ id: string; image: string }>>([])
const error = ref('')
const sessionStore = useSessionStore()

// Dev toggles for upload behavior
const FORCE_OCTET = (import.meta as any).env?.VITE_UPLOAD_FORCE_OCTET_STREAM === '1' || (import.meta as any).env?.VITE_UPLOAD_FORCE_OCTET_STREAM === 'true'
const DEV_NO_CORS = (import.meta as any).env?.VITE_UPLOAD_NO_CORS === '1' || (import.meta as any).env?.VITE_UPLOAD_NO_CORS === 'true'

async function loadEntriesFromBackend(id: string) {
  if (!username.value) return
  try {
    const ids = await getEntriesInSession(username.value, id)
    // Merge with any existing store entries to preserve image previews where available
    const existingMap = new Map(sessionStore.entries.map(e => [e.id, e.imageData]))
    const normalized = ids.map(imgId => ({ id: imgId, image: existingMap.get(imgId) || '' }))
    entries.value = normalized

    // Resolve signed view URLs for those without local previews
    const viewer = await auth.getCurrentUserId().catch(() => '')
    if (viewer) {
      const urls = await Promise.all(
        normalized.map(async (e) => {
          if (e.image) return e.image
          try {
            const metaArr = await getFileById(e.id)
            const meta = Array.isArray(metaArr) && metaArr[0]?.file ? metaArr[0].file : null
            const object = meta?.object
            if (object) {
              const view = await getViewUrl(viewer, object, 3600)
              if (view?.url) return view.url
            }
          } catch (err) {
            // ignore; will return empty string
          }
          return ''
        })
      )
      entries.value = entries.value.map((e, i) => ({ ...e, image: e.image || urls[i] }))
    }
    // Also reflect in store (keep existing imageData if present)
    sessionStore.entries.splice(0, sessionStore.entries.length, ...ids.map(id => ({ id, imageData: existingMap.get(id) })))
  } catch (e: any) {
    // Don't block UI; just show no entries if fetch fails
    console.warn('Failed to load session entries', e)
  }
}

async function initSession() {
  if (!username.value) {
    router.push('/auth')
    return
  }
  loading.value = true
  error.value = ''
  try {
    // Get user ID for backend calls
    const userId = await auth.getCurrentUserId()
    const userIdOrName = userId || username.value
    console.log('[SessionView] User ID:', userIdOrName)

    // Try restore existing session first
    sessionStore.restore()
    if (sessionStore.activeSessionId) {
      sessionId.value = sessionStore.activeSessionId
    }
    if (!sessionId.value) {
      const res = await startSession(userIdOrName)
      sessionId.value = res.session
      sessionStore.start(res.session)
    }
    if (sessionId.value) {
      await loadEntriesFromBackend(sessionId.value)
    }
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
      const userId = await auth.getCurrentUserId()
      const userIdOrName = userId || username.value
      const contentType = FORCE_OCTET ? 'application/octet-stream' : (file.type || 'application/octet-stream')

      // 1) Get a signed upload URL
      const { uploadUrl, object } = await requestUploadUrl(
        userIdOrName,
        file.name || `image-${Date.now()}`,
        contentType,
        900
      )
      console.debug('[SessionView] Signed upload URL origin:', (() => { try { return new URL(uploadUrl).origin } catch { return 'unknown' } })(), 'CT:', contentType, 'forceOctet?', FORCE_OCTET, 'noCors?', DEV_NO_CORS)
      // 2) Upload the file via PUT (with fallback to avoid dev CORS preflight issues)
      let uploaded = false
      if (!DEV_NO_CORS) {
        try {
          const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: file
          })
          uploaded = putRes.ok
          if (!uploaded) {
            const text = await putRes.text().catch(() => '')
            console.warn('[SessionView] Upload not OK:', putRes.status, putRes.statusText, text)
          }
        } catch (err) {
          console.warn('[SessionView] Upload error (likely CORS or network). Retrying with no-cors...', err)
        }
      }
      if (!uploaded) {
        try {
          await fetch(uploadUrl, { method: 'PUT', body: file, mode: 'no-cors' as RequestMode })
          uploaded = true
        } catch (err2) {
          console.error('[SessionView] Upload failed even with no-cors', err2)
          uploaded = false
        }
      }
      if (!uploaded) throw new Error('Upload failed. Check bucket CORS for PUT from your dev origin and matching Content-Type.')
      // 3) Confirm upload to obtain File ID
      const confirmed = await confirmUpload(
        userIdOrName,
        object,
        contentType,
        file.size
      )
      const fileId = confirmed.file
      // 4) Associate the image with the session
      await addEntry(userIdOrName, sessionId.value!, fileId)
      // 5) Add a local preview from the selected file
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        entries.value.push({ id: fileId, image: base64 })
        sessionStore.addEntry(fileId, base64)
      }
      reader.readAsDataURL(file)
    } catch (e: any) {
      const msg = e?.message || 'Failed to log entry'
      error.value = msg
      if (msg.includes('Upload failed')) {
        console.error('[SessionView] Hint: Configure GCS bucket CORS to allow PUT with Content-Type from http://localhost:5173 (and 127.0.0.1).')
      }
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
    const userId = await auth.getCurrentUserId()
    const userIdOrName = userId || username.value
    const hasEntries = entries.value.length > 0
    if (!hasEntries) {
      const proceed = confirm("You haven't logged any birds yet. Are you sure you want to end the session?")
      if (!proceed) {
        return
      }
    }

    await endSession(userIdOrName, sessionId.value)

    if (hasEntries) {
      // Go to Publish view only when there are entries to caption
      router.push('/publish')
    } else {
      // No entries: clear local session and return to Home
      sessionStore.clear()
      // No entries: return to Home
      router.push('/')
    }
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
        Log a Bird
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
