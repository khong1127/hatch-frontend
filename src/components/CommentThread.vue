<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getCommentsForPost, addComment, editComment, deleteComment, getAllUsers } from '@/services/api'

type Comment = { _id: string; author: string; content: string; post: string; createdAt?: string }

const props = defineProps<{ postId: string }>()

const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
const comments = ref<Comment[]>([])
const usersMap = ref<Record<string, string>>({}) // id -> username

const newContent = ref('')
const posting = ref(false)
const warn = ref('')
let warnTimer: any = null

function showWarn(msg: string, ms = 2200) {
  warn.value = msg
  clearTimeout(warnTimer)
  warnTimer = setTimeout(() => { warn.value = '' }, ms)
}

const editingId = ref<string | null>(null)
const editingContent = ref('')
const savingEdit = ref(false)

const currentUsername = computed(() => auth.user?.username || '')

async function loadUsersMap() {
  try {
    const all = await getAllUsers()
    if (Array.isArray(all)) {
      const map: Record<string, string> = {}
      for (const u of all) {
        if (u && typeof (u as any)._id === 'string' && typeof (u as any).username === 'string') {
          map[(u as any)._id] = (u as any).username
        }
      }
      usersMap.value = map
    }
  } catch (e) {
    // ignore; fall back to showing raw author id
  }
}

function authorLabel(idOrName: string) {
  return usersMap.value[idOrName] || idOrName
}

async function loadComments() {
  loading.value = true
  error.value = ''
  try {
    const res = await getCommentsForPost(props.postId)
    // Support both array response and object response { comments: [...] }
    const raw = Array.isArray(res) ? res : (Array.isArray((res as any)?.comments) ? (res as any).comments : [])
    const list: Comment[] = raw
      .map((it: any) => it?.comment || it)
      .filter((c: any) => c && c._id)
    // newest first
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    comments.value = list
  } catch (e: any) {
    error.value = e.message || 'Failed to load comments'
  } finally {
    loading.value = false
  }
}

async function submitNew() {
  if (!newContent.value.trim()) {
    showWarn('Please enter a comment before posting')
    return
  }
  posting.value = true
  try {
    const userId = await auth.getCurrentUserId?.()
    const author = userId || currentUsername.value
    const content = newContent.value.trim()
    await addComment(author, props.postId, content)
    newContent.value = ''
    // Optimistic append in case reload lags
    comments.value.unshift({
      _id: `tmp_${Date.now()}`,
      author: author,
      content,
      post: props.postId,
      createdAt: new Date().toISOString()
    })
    // Then refresh from backend
    await loadComments()
  } catch (e: any) {
    error.value = e.message || 'Failed to post comment'
  } finally {
    posting.value = false
  }
}

function attemptSubmit() {
  // Gate through submitNew so we get consistent warning behavior
  void submitNew()
}

function startEdit(c: Comment) {
  editingId.value = c._id
  editingContent.value = c.content
  // Focus the input after DOM updates
  nextTick(() => {
    const el = document.getElementById(`edit-${c._id}`) as HTMLInputElement | null
    if (el) {
      el.focus()
      // Place cursor at end
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  })
}

function cancelEdit() {
  editingId.value = null
  editingContent.value = ''
}

async function saveEdit() {
  if (!editingId.value) return
  savingEdit.value = true
  try {
    const userId = await auth.getCurrentUserId?.()
    const user = userId || currentUsername.value
    await editComment(user, editingId.value, editingContent.value)
    editingId.value = null
    editingContent.value = ''
    await loadComments()
  } catch (e: any) {
    error.value = e.message || 'Failed to edit comment'
  } finally {
    savingEdit.value = false
  }
}

async function remove(c: Comment) {
  const ok = confirm('Are you sure you want to delete this comment?')
  if (!ok) return
  try {
    const userId = await auth.getCurrentUserId?.()
    const user = userId || currentUsername.value
    await deleteComment(user, c._id)
    await loadComments()
  } catch (e: any) {
    error.value = e.message || 'Failed to delete comment'
  }
}

const canEdit = (c: Comment) => c.author === currentUsername.value || usersMap.value[c.author] === currentUsername.value

onMounted(async () => {
  await loadUsersMap()
  await loadComments()
})
</script>

<template>
  <section class="comments">
    <div class="new-comment">
      <input
        v-model="newContent"
        placeholder="Type a comment"
        @keyup.enter="attemptSubmit"
        :class="{ invalid: !!warn }"
      />
      <button @click="attemptSubmit" :disabled="posting">Post</button>
    </div>
    <div v-if="warn" class="warn" role="status" aria-live="polite">{{ warn }}</div>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="loading">Loading comments…</div>

    <ul v-if="comments.length" class="list">
      <li v-for="c in comments" :key="c._id" class="item">
        <div class="meta">
          <span class="author">{{ authorLabel(c.author) }}</span>
          <span class="time" v-if="c.createdAt">{{ new Date(c.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }}</span>
        </div>

        <div v-if="editingId === c._id" class="edit-row">
          <input
            :id="`edit-${c._id}`"
            v-model="editingContent"
            class="edit-input"
            placeholder="Edit your comment"
          />
          <div class="edit-actions">
            <button class="save-btn" @click="saveEdit" :disabled="savingEdit || !editingContent.trim()">Save</button>
            <button class="cancel-btn" @click="cancelEdit" :disabled="savingEdit">Cancel</button>
          </div>
        </div>
        <div v-else class="content-row">
          <p class="content">{{ c.content }}</p>
          <div class="actions" v-if="canEdit(c)">
            <button @click="startEdit(c)">Edit</button>
            <button @click="remove(c)" class="danger">Delete</button>
          </div>
        </div>
      </li>
    </ul>
    <div v-else-if="!loading" class="muted">No comments yet.</div>
  </section>
</template>

<style scoped>
.comments { display: grid; gap: 0.5rem; }
.new-comment { display: flex; gap: 0.5rem; }
.new-comment input { flex: 1; padding: 0.4rem 0.6rem; border: 1px solid var(--color-border); border-radius: 4px; }
.new-comment button { padding: 0.4rem 0.8rem; border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer; }
.new-comment input.invalid { border-color: #b65959; box-shadow: 0 0 0 3px rgba(182, 89, 89, 0.15); }
.warn { color: #a14b4b; font-size: 0.9rem; }
.list { display: grid; gap: 0.5rem; list-style: none; padding: 0; margin: 0; }
.item { border: 1px solid var(--color-border); border-radius: 6px; padding: 0.5rem; display: grid; gap: 0.25rem; }
.meta { display: flex; gap: 0.5rem; align-items: baseline; }
.author { font-weight: 600; }
.time { opacity: 0.7; font-size: 0.85rem; }
.edit-row { display: grid; gap: 0.5rem; }
.edit-input { width: 100%; padding: 0.5rem 0.6rem; border: 2px solid var(--color-border); border-radius: 6px; background: var(--color-background); }
.edit-input:focus { outline: none; border-color: var(--color-border-hover); box-shadow: 0 0 0 3px rgba(125, 125, 125, 0.1); }
.edit-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.save-btn { padding: 0.4rem 0.8rem; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-background); cursor: pointer; }
.save-btn:hover:not(:disabled) { background: var(--color-background-soft); }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cancel-btn { padding: 0.4rem 0.8rem; border: 1px solid #dc2626; color: #dc2626; border-radius: 6px; background: var(--color-background); cursor: pointer; }
.cancel-btn:hover:not(:disabled) { background: #fef2f2; }
.cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.content-row { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.content { margin: 0; }
.actions { display: flex; gap: 0.5rem; }
.danger { color: #dc2626; border-color: #dc2626; }
.error { color: red; }
.muted { opacity: 0.7; }
</style>
