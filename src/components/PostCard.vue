<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { getAllUsers } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useImageUrls } from '@/composables/useImageUrls'

type Post = {
  _id: string
  caption: string
  images: string[]
  author: string
  createdAt?: string
}

const props = defineProps<{ 
  post: Post
  currentUser?: string
  hideAuthor?: boolean
  showActions?: boolean
}>()

const emit = defineEmits<{
  edit: [postId: string]
  delete: [postId: string]
}>()

const authorUsername = ref<string>('')
const auth = useAuthStore()
const viewer = ref<string>(auth.user?.username || '')
onMounted(async () => {
  try {
    const id = await auth.getCurrentUserId()
    if (id) viewer.value = id
  } catch (e) {
    // ignore ID resolution errors; will use username fallback
  }
})

const { urls: imageUrls } = useImageUrls(() => props.post.images || [], () => viewer.value)
const page = ref(1)
const pageLength = computed(() => props.post.images?.length || 0)
const currentUrl = computed(() => (imageUrls.value || [])[page.value - 1] || '')
const currentId = computed(() => props.post.images?.[page.value - 1] || '')
// no-op placeholder (previously used for v-pagination total-visible)

function prev() {
  if (page.value > 1) page.value--
}
function next() {
  if (page.value < pageLength.value) page.value++
}

watch(pageLength, (len) => {
  if (len < 1) page.value = 1
  else if (page.value > len) page.value = len
})

const createdLabel = computed(() => {
  const d = props.post.createdAt ? new Date(props.post.createdAt) : null
  return d && !isNaN(d.getTime()) ? d.toLocaleString() : ''
})

const authorLabel = computed(() => {
  if (props.hideAuthor) return ''
  if (props.currentUser && props.post.author === props.currentUser) return 'You'
  return authorUsername.value || props.post.author
})

async function resolveAuthor() {
  if (props.hideAuthor) return
  try {
    const users = await getAllUsers()
    if (Array.isArray(users)) {
      const match = users.find((u: any) => u?._id === props.post.author)
      if (match?.username) {
        authorUsername.value = match.username
      }
    }
  } catch (e) {
    // If resolution fails, will show the ID
  }
}

onMounted(() => {
  resolveAuthor()
})
</script>

<template>
  <article class="post-card">
    <header class="post-header" v-if="!hideAuthor || createdLabel">
      <div class="author" v-if="!hideAuthor">{{ authorLabel }}</div>
      <div class="timestamp" v-if="createdLabel">{{ createdLabel }}</div>
    </header>
    <div class="images" v-if="post.images?.length">
      <div class="img-tile">
        <img
          v-if="currentUrl"
          class="tile-img"
          :src="currentUrl"
          :alt="`Image ${currentId}`"
          @error="(e: Event) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; (el.nextElementSibling as HTMLElement)?.classList.add('show'); }"
        />
        <div class="placeholder" :class="{ show: !currentUrl }" aria-hidden="true">{{ currentId }}</div>
      </div>
      <div class="img-nav" v-if="pageLength > 1">
        <button class="nav-btn" @click="prev" :disabled="page <= 1" aria-label="Previous image">‹</button>
        <span class="page-indicator">{{ page }} / {{ pageLength }}</span>
        <button class="nav-btn" @click="next" :disabled="page >= pageLength" aria-label="Next image">›</button>
      </div>
    </div>
    <p class="caption" v-if="post.caption">{{ post.caption }}</p>
    <div class="actions" v-if="showActions">
      <button @click="emit('edit', post._id)" class="action-btn edit-btn">Edit</button>
      <button @click="emit('delete', post._id)" class="action-btn delete-btn">Delete</button>
    </div>
  </article>
  
</template>

<style scoped>
.post-card { border: 1px solid var(--color-border); border-radius: 8px; padding: 0.75rem; display: grid; gap: 0.5rem; }
.post-header { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
.author { font-weight: 600; }
.timestamp { opacity: 0.7; font-size: 0.85rem; }
.images { display: grid; gap: 0.5rem; justify-items: center; }
.img-tile { position: relative; width: min(100%, 360px); aspect-ratio: 1; border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
.tile-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.placeholder { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 0.8rem; opacity: 0.7; border: 1px dashed var(--color-border); border-radius: 6px; }
.placeholder.show { display: flex; }
.img-pagination { justify-self: center; }
.img-nav { display: flex; align-items: center; gap: 0.5rem; justify-content: center; }
.nav-btn { padding: 0.25rem 0.6rem; border: 1px solid var(--color-border); background: var(--color-background); border-radius: 6px; cursor: pointer; }
.nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-indicator { font-size: 0.9rem; opacity: 0.8; }
.caption { margin: 0.25rem 0 0; text-align: center; }
.actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
.action-btn { padding: 0.4rem 0.8rem; font-size: 0.9rem; border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer; background: var(--color-background); }
.action-btn:hover { background: var(--color-background-soft); }
.edit-btn { color: var(--color-text); }
.delete-btn { color: #dc2626; border-color: #dc2626; }
.delete-btn:hover { background: #fef2f2; }
</style>
