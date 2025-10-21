<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { getAllUsers } from '@/services/api'

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
      <div v-for="img in post.images" :key="img" class="img-tile">
        <!-- TODO: Replace placeholder with real image URLs when backend provides them -->
        <div class="placeholder">{{ img }}</div>
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
.images { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.5rem; }
.img-tile { aspect-ratio: 1; border: 1px dashed var(--color-border); border-radius: 6px; display: grid; place-items: center; font-size: 0.8rem; opacity: 0.8; }
.caption { margin: 0.25rem 0 0; }
.actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
.action-btn { padding: 0.4rem 0.8rem; font-size: 0.9rem; border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer; background: var(--color-background); }
.action-btn:hover { background: var(--color-background-soft); }
.edit-btn { color: var(--color-text); }
.delete-btn { color: #dc2626; border-color: #dc2626; }
.delete-btn:hover { background: #fef2f2; }
</style>
