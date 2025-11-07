<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getPostById, getPostsByAuthor, getAllUsers } from '@/services/api'
import PostCard from '@/components/PostCard.vue'
import CommentThread from '@/components/CommentThread.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const postId = computed(() => route.params.id as string)

// Minimal Post type expected by PostCard
interface Post { _id: string; caption: string; images: string[]; author: string; createdAt?: string }
const post = ref<Post | null>(null)
const loading = ref(false)
const error = ref('')

// Resolve viewer for signed URLs
const viewer = ref<string>(auth.user?.username || '')
onMounted(async () => {
  try {
    const id = await auth.getCurrentUserId?.()
    if (id) viewer.value = id
  } catch { /* ignore */ }
})

function extractPost(res: any): any {
  if (!res) return null
  if (Array.isArray(res)) {
    const it = res[0]
    return it?.postDetails || it?.post || it
  }
  return res.postDetails || res.post || res
}

function normalizeImagesFromPost(p: any): string[] {
  try {
    if (!p || typeof p !== 'object') return []
    const candidates: any[] =
      (Array.isArray(p.images) && p.images) ||
      (Array.isArray(p.imageIds) && p.imageIds) ||
      (Array.isArray(p.files) && p.files) ||
      (Array.isArray(p.photos) && p.photos) ||
      (Array.isArray(p.pictures) && p.pictures) ||
      (Array.isArray(p.media) && p.media) ||
      (typeof p.image === 'string' ? [p.image] : []) ||
      []
    const mapped = candidates
      .map((item: any) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') return item.file || item._id || item.id || item.object || item.image || ''
        return ''
      })
      .filter((x: any): x is string => typeof x === 'string' && x.length > 0)
    const seen = new Set<string>()
    return mapped.filter((x) => (seen.has(x) ? false : (seen.add(x), true)))
  } catch {
    return []
  }
}

async function load() {
  if (!postId.value) { router.back(); return }
  loading.value = true
  error.value = ''
  try {
    // Start a non-blocking fetch by ID and race with a short timeout to avoid visible timeouts
    const byIdPromise = getPostById(postId.value).catch(() => null)
    const res = await Promise.race<any>([
      byIdPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 1800))
    ])
    const raw = res ? extractPost(res) : null
    if (raw && typeof raw === 'object') {
      const img = normalizeImagesFromPost(raw)
      const p: Post = {
        _id: raw._id || postId.value,
        caption: raw.caption || raw.text || raw.message || raw.description || '',
        images: Array.isArray(raw.images) && raw.images.length ? raw.images : img,
        author: raw.author || auth.user?.username || '',
        createdAt: raw.createdAt
      }
      post.value = p

      // Fallback: if images still empty, try author feed and match id
      if (!post.value.images?.length) {
        try {
          let authorToQuery: string = p.author || auth.user?.username || ''
          if (authorToQuery && authorToQuery === auth.user?.username) {
            try {
              const users = await getAllUsers()
              const match = Array.isArray(users) ? users.find((u: any) => u?.username === authorToQuery) : null
              authorToQuery = (match?._id || authorToQuery)
            } catch { /* ignore */ }
          }
          const resRaw: any = await getPostsByAuthor(authorToQuery)
          const arr = Array.isArray(resRaw) ? resRaw : (Array.isArray(resRaw?.posts) ? resRaw.posts : [])
          const items = arr.map((it: any) => it?.postDetails || it?.post || it)
          const found = items.find((it: any) => (it?._id || it?.id) === postId.value)
          if (found) {
            const cap = found.caption || found.text || found.message || found.description || ''
            const imgs = normalizeImagesFromPost(found)
            post.value = { ...p, caption: p.caption || cap, images: (found.images && found.images.length ? found.images : imgs) || p.images }
          }
        } catch { /* ignore */ }
      }
    } else {
      // Fallback quickly via author posts without showing a timeout error
      try {
        let authorToQuery: string = auth.user?.username || ''
        if (authorToQuery && authorToQuery === auth.user?.username) {
          try {
            const users = await getAllUsers()
            const match = Array.isArray(users) ? users.find((u: any) => u?.username === authorToQuery) : null
            authorToQuery = (match?._id || authorToQuery)
          } catch { /* ignore */ }
        }
        const resRaw: any = await getPostsByAuthor(authorToQuery)
        const arr = Array.isArray(resRaw) ? resRaw : (Array.isArray(resRaw?.posts) ? resRaw.posts : [])
        const items = arr.map((it: any) => it?.postDetails || it?.post || it)
        const found = items.find((it: any) => (it?._id || it?.id) === postId.value)
        if (found) {
          const imgs = normalizeImagesFromPost(found)
          post.value = {
            _id: found._id || postId.value,
            caption: found.caption || found.text || found.message || found.description || '',
            images: Array.isArray(found.images) && found.images.length ? found.images : imgs,
            author: found.author || auth.user?.username || '',
            createdAt: found.createdAt
          }
          error.value = ''
        } else {
          // As a last resort, create a minimal shell so CommentThread can still load
          post.value = { _id: postId.value, caption: '', images: [], author: auth.user?.username || '' }
          error.value = ''
        }
      } catch {
        // Create minimal shell and keep UI interactive
        post.value = { _id: postId.value, caption: '', images: [], author: auth.user?.username || '' }
        error.value = ''
      }
    }
  } catch (e: any) {
    // Do not surface fetch timeouts aggressively; keep page interactive
    error.value = ''
    if (!post.value) {
      post.value = { _id: postId.value, caption: '', images: [], author: auth.user?.username || '' }
    }
  } finally {
    loading.value = false
  }
}

function goBack() { router.back() }

onMounted(load)
</script>

<template>
  <main class="post-detail">
    <button class="btn btn-brown back-btn" @click="goBack">← Go back</button>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="loading" class="loading">Loading post…</div>

    <section v-else-if="post" class="content">
      <PostCard :post="post" :current-user="auth.user?.username || ''" :hide-author="true" :hide-meta="false" :hide-caption="false" :show-actions="false" />
      <h3 class="comments-title">Comments</h3>
      <div class="comments">
        <CommentThread :post-id="post._id" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.post-detail { padding: 1rem; display: grid; gap: 1rem; max-width: 900px; margin: 0 auto; }
.back-btn { align-self: start; width: fit-content; }
.content { display: grid; gap: 0.75rem; }
/* Caption now rendered inside PostCard */
.comments-title { font-size: 1rem; font-weight: 600; margin: 0.25rem 0; }
.comments { border: 1px solid var(--color-border); border-radius: 8px; padding: 0.5rem; background: var(--color-background-soft); }
.error { color: red; }
.loading { opacity: 0.8; }
</style>
