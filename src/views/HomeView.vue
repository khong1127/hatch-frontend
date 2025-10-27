<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { getFriends, getPostsByAuthor, getPostById, getAllUsers } from '@/services/api'
import PostCard from '@/components/PostCard.vue'
import CommentThread from '@/components/CommentThread.vue'
import { useRoute } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const isAuthed = computed(() => !!auth.user)

type Post = { _id: string; caption: string; images: string[]; author: string; createdAt?: string }
const feed = ref<Post[]>([])
const loading = ref(false)
const error = ref('')
const route = useRoute()

function startTrip() {
  router.push('/session')
}

async function normalizePosts(raw: any): Promise<Post[]> {
  if (!Array.isArray(raw)) return []
  const items = raw.map((item: any) => item?.post || item?.postDetails || item)
  const ids = items.filter((x: any) => typeof x === 'string') as string[]
  const objs = items.filter((x: any) => x && typeof x === 'object') as Post[]
  const resolved: Post[] = [...objs]
  for (const id of ids) {
    try {
      const res = await getPostById(id)
      let detail: any = null
      // New response shape: { postDetails: {...} }
      if (res && typeof res === 'object') {
        detail = (res as any).postDetails || (res as any).post || null
      }
      if (detail && detail.author) resolved.push(detail as Post)
    } catch (e) {
      // ignore
    }
  }
  return resolved
}

async function loadFeed() {
  if (!auth.user?.username) return
  loading.value = true
  error.value = ''
  try {
    const self = auth.user.username
    console.log('[HomeView] Loading feed for user:', self)
    
    // Fetch friends list, normalize to array of usernames/ids
    const friendsRes = await getFriends(self)
    console.log('[HomeView] Raw friends response:', friendsRes)
    
    // Handle {friends: [...]} response shape
    const friendsList = (friendsRes as any)?.friends || []
    const friends = Array.isArray(friendsList) ? friendsList.filter(Boolean) : []
    console.log('[HomeView] Normalized friends:', friends)

    // Resolve all usernames to IDs if available
    let usersList: any[] = []
    try {
      const all = await getAllUsers()
      usersList = Array.isArray(all) ? all : []
    } catch (e) {
      usersList = []
    }
    const resolveId = (nameOrId: string) => {
      const match = usersList.find(u => u?.username === nameOrId)
      return match?._id || nameOrId
    }
    
    const selfId = resolveId(self)
    const friendIds = friends.map(resolveId)
    const authors = Array.from(new Set([selfId, ...friendIds]))
    console.log('[HomeView] Authors to fetch (IDs):', authors)
    
    const allPosts: Post[] = []
    // Fetch posts per author sequentially to avoid hammering backend; could be parallel if safe
    for (const author of authors) {
      try {
  const resRaw: any = await getPostsByAuthor(author)
  console.log('[HomeView] Posts for author', author, ':', resRaw)
  const res = Array.isArray(resRaw) ? resRaw : (Array.isArray(resRaw?.posts) ? resRaw.posts : [])
  const mapped: Post[] = await normalizePosts(res)
  console.log('[HomeView] Mapped posts:', mapped)
        allPosts.push(...mapped)
      } catch (e) {
        // ignore individual author errors
      }
    }
    allPosts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    feed.value = allPosts
  } catch (e: any) {
    error.value = e.message || 'Failed to load feed'
  } finally {
    loading.value = false
  }
}

onMounted(loadFeed)
onMounted(async () => {
  if (route.query.published) {
    for (let i = 0; i < 2; i++) {
      await new Promise(r => setTimeout(r, 700))
      await loadFeed()
      if (feed.value.length) break
    }
  }
})
</script>

<template>
  <main>
    <div class="wrapper">
      <h1>Welcome to Hatch</h1>
      <p v-if="isAuthed">Ready to log your bird watching adventures!</p>
      <p v-else>Sign in to start tracking your trips.</p>
      <div v-if="isAuthed" class="start-trip-section">
        <button @click="startTrip" class="start-trip-btn">
          🦜 Start Trip
        </button>
      </div>

      <section v-if="isAuthed" class="feed">
        <h2>Your Feed</h2>
        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="loading" class="loading">Loading…</div>
        <div v-else>
          <div v-if="!feed.length" class="empty">No posts yet. Publish your first post from a trip!</div>
          <div v-else class="posts">
            <div v-for="p in feed" :key="p._id" class="post-with-comments">
              <PostCard :post="p" :current-user="auth.user?.username || ''" />
              <CommentThread :post-id="p._id" />
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
main {
  padding: 2rem;
}

.wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.start-trip-section {
  display: flex;
  justify-content: center;
  margin: 1rem 0 2rem;
}

.start-trip-btn {
  padding: 1rem 3rem;
  font-size: 1.5rem;
  font-weight: bold;
  background: var(--color-background-mute);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.start-trip-btn:hover {
  background: var(--color-background-soft);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  text-align: center;
}

p {
  text-align: center;
  opacity: 0.8;
}
.feed { margin-top: 2rem; }
.posts { display: grid; gap: 1rem; }
.error { color: red; }
.loading { opacity: 0.8; }
.empty { opacity: 0.7; text-align: center; }
</style>

