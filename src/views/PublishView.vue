<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSessionStore } from '@/stores/session'
import { createPost, getAllUsers } from '@/services/api'

const router = useRouter()
const auth = useAuthStore()
const session = useSessionStore()

const username = computed(() => auth.user?.username || '')
const caption = ref('')
const publishing = ref(false)
const error = ref('')

const previewEntries = computed(() => session.entries)

async function publish() {
  if (!username.value) { router.push('/auth'); return }
  if (!previewEntries.value.length) { error.value = 'No entries to publish'; return }
  publishing.value = true
  error.value = ''
  try {
    // Resolve username to user ID
    let userId: string | null = null
    try {
      const users = await getAllUsers()
      console.log('[PublishView] All users:', users)
      if (Array.isArray(users)) {
        const match = users.find((u: any) => u?.username === username.value)
        userId = match?._id || null
        console.log('[PublishView] Resolved user ID for', username.value, ':', userId)
      }
    } catch (e) {
      console.error('[PublishView] Failed to resolve user ID:', e)
    }

    // In real app, map session entries to actual image IDs/URLs persisted in backend
    const imageIds = previewEntries.value.map(e => e.id)
    const userIdOrName = userId || username.value
    console.log('[PublishView] Creating post with user:', userIdOrName, 'images:', imageIds, 'caption:', caption.value)
    const result = await createPost(userIdOrName, imageIds, caption.value)
    console.log('[PublishView] Create post result:', result)
  // Clear session and go to profile; include a hint to retry-fetch
  session.clear()
  router.push('/profile?published=1')
  } catch (e: any) {
    console.error('[PublishView] Failed to create post:', e)
    error.value = e.message || 'Failed to publish post'
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <main class="publish-view">
    <h1>Publish Post</h1>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="entries-grid" v-if="previewEntries.length">
      <div v-for="entry in previewEntries" :key="entry.id" class="entry-card">
        <img v-if="entry.imageData" :src="entry.imageData" :alt="entry.id" />
        <div v-else class="placeholder">Image {{ entry.id }}</div>
      </div>
    </div>

    <div class="caption-box">
      <textarea v-model="caption" placeholder="Write a caption for your post..."></textarea>
    </div>

    <div class="actions">
      <button @click="publish" :disabled="publishing || !previewEntries.length">Publish</button>
    </div>
  </main>
</template>

<style scoped>
.publish-view { padding: 1rem; display: grid; gap: 1rem; }
.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
.entry-card { aspect-ratio: 1; border: 1px solid var(--color-border); border-radius: 4px; overflow: hidden; }
.entry-card img { width: 100%; height: 100%; object-fit: cover; }
.placeholder { display: grid; place-items: center; height: 100%; opacity: 0.6; }
.caption-box textarea { width: 100%; min-height: 100px; padding: 0.5rem; border: 1px solid var(--color-border); }
.actions { display: flex; justify-content: flex-end; }
.error { color: red; }
</style>
