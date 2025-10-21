<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getPostsByAuthor, getPostById, getAllUsers, deletePost } from '@/services/api'
import { useRoute, useRouter } from 'vue-router'
import PostCard from '@/components/PostCard.vue'

const auth = useAuthStore()
const username = computed(() => auth.user?.username || 'Unknown')
const route = useRoute()
const router = useRouter()

type Post = { _id: string; caption: string; images: string[]; author: string; createdAt?: string }
const loading = ref(false)
const error = ref('')
const posts = ref<Post[]>([])

async function normalizePosts(raw: any): Promise<Post[]> {
  // Handle responses as either post objects or arrays of post IDs
  if (!Array.isArray(raw)) return []
  const items = raw.map((item: any) => item?.post || item?.postDetails || item)
  const ids = items.filter((x: any) => typeof x === 'string') as string[]
  const objs = items.filter((x: any) => x && typeof x === 'object') as Post[]
  const resolved: Post[] = [...objs]
  for (const id of ids) {
    try {
      const res = await getPostById(id)
      console.log('[ProfileView] getPostById response for', id, ':', res)
      let detail: any = null
      // New response shape: { postDetails: {...} }
      if (res && typeof res === 'object') {
        detail = (res as any).postDetails || (res as any).post || null
      }
      if (detail && detail.author) resolved.push(detail as Post)
    } catch (e) {
      // ignore resolution errors per post id
    }
  }
  return resolved
}

async function load() {
  const user = auth.user?.username
  if (!user) return
  loading.value = true
  error.value = ''
  try {
    // Resolve username to userId for backend queries
    let userId: string | null = null
    try {
      const users = await getAllUsers()
      console.log('[ProfileView] All users:', users)
      if (Array.isArray(users)) {
        const match = users.find((u: any) => u?.username === user)
        userId = match?._id || null
        console.log('[ProfileView] Resolved user ID for', user, ':', userId)
      }
    } catch (e) {
      console.error('[ProfileView] Failed to resolve user ID:', e)
    }

    console.log('[ProfileView] Fetching posts for user ID:', userId || user)
    const resRaw: any = await getPostsByAuthor(userId || user)
    console.log('[ProfileView] Raw response from getPostsByAuthor:', resRaw)
    
    // Support object shape { posts: [...] } or array
    const res = Array.isArray(resRaw) ? resRaw : (Array.isArray(resRaw?.posts) ? resRaw.posts : [])
    console.log('[ProfileView] Normalized response:', res)
    
    const mapped: Post[] = await normalizePosts(res)
    console.log('[ProfileView] Mapped posts:', mapped)
    
    // Sort newest first by createdAt if present
    mapped.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    posts.value = mapped
  } catch (e: any) {
    console.error('[ProfileView] Error loading posts:', e)
    error.value = e.message || 'Failed to load posts'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => auth.user?.username, () => load())

// If redirected after publishing, briefly retry in case the backend is eventually consistent
onMounted(async () => {
  if (route.query.published) {
    // Try a couple of quick refetches
    for (let i = 0; i < 2; i++) {
      await new Promise(r => setTimeout(r, 700))
      await load()
      if (posts.value.length) break
    }
  }
})

function handleEdit(postId: string) {
  router.push(`/edit-post/${postId}`)
}

async function handleDelete(postId: string) {
  if (!confirm('Are you sure you want to delete this post?')) {
    return
  }
  
  try {
    const userId = await auth.getCurrentUserId()
    const userIdOrName = userId || auth.user?.username || ''
    console.log('[ProfileView] Deleting post:', postId, 'by user:', userIdOrName)
    await deletePost(userIdOrName, postId)
    // Reload posts after deletion
    await load()
  } catch (e: any) {
    console.error('[ProfileView] Failed to delete post:', e)
    error.value = e.message || 'Failed to delete post'
  }
}
</script>

<template>
  <main class="profile">
    <h1>{{ username }}'s Profile</h1>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="loading">Loading posts…</div>
    <div v-else>
      <div v-if="!posts.length" class="empty">No posts yet.</div>
      <div class="posts" v-else>
        <PostCard 
          v-for="p in posts" 
          :key="p._id" 
          :post="p" 
          :current-user="auth.user?.username || ''" 
          :hide-author="true"
          :show-actions="true"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
.profile { padding: 2rem; display: grid; gap: 1rem; }
.posts { display: grid; gap: 1rem; }
.empty { opacity: 0.7; }
.error { color: red; }
.loading { opacity: 0.8; }
</style>
