<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getPostById, editPost } from '@/services/api'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const postId = computed(() => route.params.id as string)
const caption = ref('')
const images = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

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
    
    // Very lenient check - accept anything with any field
    if (post && typeof post === 'object' && Object.keys(post).length > 0) {
      caption.value = post.caption || ''
      images.value = post.images || []
      console.log('[EditPostView] Successfully set caption:', caption.value, 'images:', images.value)
      error.value = '' // Clear error
    } else {
      console.error('[EditPostView] Post object is invalid or empty:', post)
      error.value = `Post not found or invalid response. Got: ${JSON.stringify(res)}`
    }
  } catch (e: any) {
    console.error('[EditPostView] Failed to load post:', e)
    error.value = e.message || 'Failed to load post'
  } finally {
    loading.value = false
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
      <div class="entries-grid" v-if="images.length">
        <div v-for="img in images" :key="img" class="entry-card">
          <div class="placeholder">{{ img }}</div>
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
.entry-card { aspect-ratio: 1; border: 1px solid var(--color-border); border-radius: 4px; overflow: hidden; }
.placeholder { display: grid; place-items: center; height: 100%; opacity: 0.6; font-size: 0.8rem; }
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
