<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getPostById, editPost, getPostsByAuthor, getAllUsers } from '@/services/api'
import { useImageUrls } from '@/composables/useImageUrls'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const postId = computed(() => route.params.id as string)
const caption = ref('')
const images = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

// Resolve viewer ID for signed URLs
const viewer = ref<string>(auth.user?.username || '')
onMounted(async () => {
  try {
    const id = await auth.getCurrentUserId()
    if (id) viewer.value = id
  } catch (e) {
    // ignore
  }
})

const { urls: imageUrls } = useImageUrls(() => images.value || [], () => viewer.value)
const displayItems = computed(() => {
  const ids = images.value || []
  const urls = imageUrls.value || []
  // Show placeholders even when URL resolution failed so user can still see image IDs
  return ids.map((id, idx) => ({ id, url: urls[idx] || '' }))
})

function extractCaption(input: any): string {
  try {
    if (!input) return ''
    // Prefer direct fields on the unwrapped post
    const direct = input.caption || input.text || input.message || input.description
    if (typeof direct === 'string' && direct.length) return direct
    // Look into common wrappers just in case
    const fromDetails = input.postDetails?.caption || input.postDetails?.text
    if (typeof fromDetails === 'string' && fromDetails.length) return fromDetails
    const fromPost = input.post?.caption || input.post?.text
    if (typeof fromPost === 'string' && fromPost.length) return fromPost
    return ''
  } catch {
    return ''
  }
}

function normalizeImagesFromPost(post: any): string[] {
  try {
    if (!post || typeof post !== 'object') return []
    // Try a variety of common shapes
    const candidates: any[] =
      (Array.isArray(post.images) && post.images) ||
      (Array.isArray(post.imageIds) && post.imageIds) ||
      (Array.isArray(post.files) && post.files) ||
      (Array.isArray(post.photos) && post.photos) ||
      (Array.isArray(post.pictures) && post.pictures) ||
      (Array.isArray(post.media) && post.media) ||
      (typeof post.image === 'string' ? [post.image] : []) ||
      []

    // Map objects -> string IDs/URLs in best-effort order
    const mapped = candidates
      .map((item: any) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          return (
            item.file ||
            item._id ||
            item.id ||
            item.object ||
            item.image ||
            ''
          )
        }
        return ''
      })
      .filter((x: any): x is string => typeof x === 'string' && x.length > 0)

    // De-duplicate while preserving order
    const seen = new Set<string>()
    const unique = mapped.filter((x) => (seen.has(x) ? false : (seen.add(x), true)))
    return unique
  } catch {
    return []
  }
}

function deepExtractImageIds(input: any, limit = 500): string[] {
  // Best-effort recursive scan for image identifiers if usual fields are missing
  const out: string[] = []
  const seen = new Set<any>()
  let count = 0
  const keysPriority = new Set(['images','imageIds','files','photos','pictures','media','entries'])

  function add(val: any) {
    if (typeof val === 'string' && val.length > 0) {
      // Avoid obviously wrong strings like long JSON
      if (val.length < 512) out.push(val)
    }
  }

  function pickFromObject(obj: any) {
    return (
      obj?.file || obj?._id || obj?.id || obj?.object || obj?.image || null
    )
  }

  function walk(node: any) {
    if (count > limit) return
    if (!node || typeof node !== 'object') return
    if (seen.has(node)) return
    seen.add(node)

    if (Array.isArray(node)) {
      for (const it of node) {
        if (count > limit) break
        if (typeof it === 'string') { add(it); count++; continue }
        if (it && typeof it === 'object') {
          const pick = pickFromObject(it)
          if (pick) { add(pick); count++; }
          walk(it)
        }
      }
      return
    }

    // Prefer scanning priority keys first
    for (const k of Object.keys(node).sort((a,b) => Number(keysPriority.has(b)) - Number(keysPriority.has(a)))) {
      if (count > limit) break
      const v = (node as any)[k]
      if (Array.isArray(v)) {
        for (const it of v) {
          if (count > limit) break
          if (typeof it === 'string') { add(it); count++; continue }
          if (it && typeof it === 'object') {
            const pick = pickFromObject(it)
            if (pick) { add(pick); count++; }
            walk(it)
          }
        }
      } else if (v && typeof v === 'object') {
        walk(v)
      }
    }
  }

  try { walk(input) } catch { /* ignore */ }
  // Deduplicate preserve order
  const uniqSeen = new Set<string>()
  return out.filter((x) => (uniqSeen.has(x) ? false : (uniqSeen.add(x), true)))
}

async function loadPost() {
  if (!postId.value) {
    router.push('/profile')
    return
  }
  
  loading.value = true
  error.value = ''
  try {
    const res = await getPostById(postId.value)
    console.log('[EditPostView] Raw response from getPostById:', JSON.stringify(res, null, 2))
    console.log('[EditPostView] Response type:', typeof res, 'Is array?', Array.isArray(res))
    
    let post: any = null
    
    // Handle all possible response shapes
    if (res) {
      // Direct response could be the post object itself
      post = res
      
      // Or it could be wrapped in postDetails
      if ((res as any).postDetails) {
        post = (res as any).postDetails
        console.log('[EditPostView] Found postDetails wrapper')
      }
      // Or it could be wrapped in post
      else if ((res as any).post) {
        post = (res as any).post
        console.log('[EditPostView] Found post wrapper')
      }
      // Or it could be an array
      else if (Array.isArray(res) && res.length > 0) {
        const item = res[0]
        post = item?.postDetails || item?.post || item
        console.log('[EditPostView] Extracted from array')
      }
      
      console.log('[EditPostView] Final post object:', JSON.stringify(post, null, 2))
      console.log('[EditPostView] Post keys:', post ? Object.keys(post) : 'null')
    }
    
    // Very lenient check - accept anything with any field and normalize images
    if (post && typeof post === 'object' && Object.keys(post).length > 0) {
      // Robustly extract caption using multiple possible fields/wrappers
      caption.value = extractCaption(post) || extractCaption(res) || ''
      let normalized = normalizeImagesFromPost(post)
      if (!normalized.length) {
        // Fallback: try a deep extraction for legacy/mismatched shapes
        normalized = deepExtractImageIds(post)
      }
      // Exclude obvious non-file identifiers like post id or author id
      const exclude = new Set<string>([
        (post as any)?._id,
        (post as any)?.id,
        (post as any)?.post,
        (post as any)?.author,
        postId.value
      ].filter(Boolean))
      normalized = normalized.filter((x) => !exclude.has(x))
      images.value = normalized
      console.log('[EditPostView] Successfully set caption:', caption.value, 'images:', images.value)
      error.value = '' // Clear error

      // Fallback: if caption still empty, try to locate via author posts listing
      if (!caption.value || images.value.length === 0) {
        try {
          // Try to determine author id/name from the post or fall back to current user
          const authorFromPost = (post as any)?.author || (post as any)?.postDetails?.author || (post as any)?.post?.author || ''
          let authorToQuery: string = authorFromPost || auth.user?.username || ''
          // If we only have username, try to resolve to userId for better match
          if (authorToQuery && authorToQuery === auth.user?.username) {
            try {
              const users = await getAllUsers()
              const match = Array.isArray(users) ? users.find((u: any) => u?.username === authorToQuery) : null
              authorToQuery = (match?._id || authorToQuery)
            } catch { /* ignore */ }
          }

          const resRaw: any = await getPostsByAuthor(authorToQuery)
          const arr = Array.isArray(resRaw) ? resRaw : (Array.isArray(resRaw?.posts) ? resRaw.posts : [])
          // Normalize items: unwrap postDetails/post or objects directly
          const items = arr.map((it: any) => it?.postDetails || it?.post || it)
          const found = items.find((it: any) => (it?._id || it?.id) === postId.value)
          if (found) {
            const cap = extractCaption(found)
            if (cap && !caption.value) caption.value = cap
            // If we still have no images, attempt extraction from found
            if (images.value.length === 0) {
              let ids = normalizeImagesFromPost(found)
              if (!ids.length) ids = deepExtractImageIds(found)
              // Exclude non-image ids as before
              const exclude2 = new Set<string>([
                (found as any)?._id,
                (found as any)?.id,
                (found as any)?.post,
                (found as any)?.author,
                postId.value
              ].filter(Boolean))
              ids = ids.filter((x) => !exclude2.has(x))
              if (ids.length) images.value = ids
            }
          }
        } catch { /* ignore */ }
      }
    } else {
      console.error('[EditPostView] Post object is invalid or empty:', post)
      // Do not surface an error yet; try to recover via fallback first
      await fallbackLoadFromAuthor()
      // If still nothing meaningful, then show an error
      if (!caption.value && images.value.length === 0) {
        error.value = `Post not found or invalid response. Got: ${JSON.stringify(res)}`
      } else {
        error.value = ''
      }
    }
  } catch (e: any) {
    console.error('[EditPostView] Failed to load post:', e)
    // Do not show a transient timeout error; try fallback first
    await fallbackLoadFromAuthor()
    if (!caption.value && images.value.length === 0) {
      error.value = e.message || 'Failed to load post'
    } else {
      error.value = ''
    }
  } finally {
    loading.value = false
  }
}

// Attempt to populate caption/images by scanning the author's posts when getPostById fails or is incomplete
async function fallbackLoadFromAuthor() {
  try {
    let authorToQuery: string = auth.user?.username || ''
    if (!authorToQuery) return
    try {
      const users = await getAllUsers()
      const match = Array.isArray(users) ? users.find((u: any) => u?.username === authorToQuery) : null
      authorToQuery = (match?._id || authorToQuery)
    } catch { /* ignore id resolution */ }

    const resRaw: any = await getPostsByAuthor(authorToQuery)
    const arr = Array.isArray(resRaw) ? resRaw : (Array.isArray(resRaw?.posts) ? resRaw.posts : [])
    const items = arr.map((it: any) => it?.postDetails || it?.post || it)
    const found = items.find((it: any) => (it?._id || it?.id) === postId.value)
    if (found && typeof found === 'object') {
      // Fill caption if missing
      const cap = extractCaption(found)
      if (cap && !caption.value) caption.value = cap
      // Fill images if missing
      if (images.value.length === 0) {
        let ids = normalizeImagesFromPost(found)
        if (!ids.length) ids = deepExtractImageIds(found)
        const exclude2 = new Set<string>([
          (found as any)?._id,
          (found as any)?.id,
          (found as any)?.post,
          (found as any)?.author,
          postId.value
        ].filter(Boolean))
        ids = ids.filter((x) => !exclude2.has(x))
        if (ids.length) images.value = ids
      }
      if (caption.value || images.value.length) {
        // We recovered something meaningful; clear the error to avoid confusing the user
        error.value = ''
      }
    }
  } catch (e) {
    // ignore fallback errors
  }
}

async function save() {
  if (!postId.value) return
  saving.value = true
  error.value = ''
  try {
    const userId = await auth.getCurrentUserId()
    const userIdOrName = userId || auth.user?.username || ''
    console.log('[EditPostView] Saving post:', postId.value, 'caption:', caption.value)
    await editPost(userIdOrName, postId.value, caption.value)
    router.push('/profile')
  } catch (e: any) {
    console.error('[EditPostView] Failed to save post:', e)
    error.value = e.message || 'Failed to save post'
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.push('/profile')
}

onMounted(() => {
  loadPost()
})
</script>

<template>
  <main class="edit-post-view">
    <h1>Edit Post</h1>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="loading">Loading post…</div>

    <div v-else class="content">
      <div class="entries-grid" v-if="displayItems.length">
        <div v-for="item in displayItems" :key="item.id" class="entry-card">
          <img class="entry-img" :src="item.url" :alt="item.id" @error="(e: Event) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; (el.nextElementSibling as HTMLElement)?.classList.add('show') }" />
          <div class="placeholder" :class="{ show: !item.url }">{{ item.id }}</div>
        </div>
      </div>

      <div class="caption-box">
        <label>Caption</label>
        <textarea v-model="caption" placeholder="Write a caption for your post..."></textarea>
      </div>

      <div class="actions">
        <button @click="cancel" class="cancel-btn" :disabled="saving">Cancel</button>
        <button @click="save" class="save-btn" :disabled="saving || loading">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.edit-post-view { padding: 1rem; display: grid; gap: 1rem; max-width: 800px; margin: 0 auto; }
.content { display: grid; gap: 1rem; }
.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
.entry-card { position: relative; aspect-ratio: 1; border: 1px solid var(--color-border); border-radius: 4px; overflow: hidden; }
.entry-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.placeholder { position: absolute; inset: 0; display: none; place-items: center; height: 100%; opacity: 0.7; font-size: 0.9rem; border: 1px dashed var(--color-border); }
.placeholder.show { display: grid; }
.caption-box { display: grid; gap: 0.5rem; }
.caption-box label { font-weight: 600; }
.caption-box textarea { width: 100%; min-height: 100px; padding: 0.5rem; border: 1px solid var(--color-border); border-radius: 4px; }
.actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.actions button { padding: 0.5rem 1.5rem; border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer; }
.cancel-btn { background: var(--color-background); }
.cancel-btn:hover:not(:disabled) { background: var(--color-background-soft); }
.save-btn { background: var(--color-background-mute); font-weight: 600; }
.save-btn:hover:not(:disabled) { background: var(--color-background-soft); }
.actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.error { color: red; padding: 0.5rem; }
.loading { text-align: center; padding: 2rem; opacity: 0.7; }
</style>
