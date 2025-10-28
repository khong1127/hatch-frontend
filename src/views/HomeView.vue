<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
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

// Lock each post box height to the height of the left column (image + nav) at initial render,
// including the container's vertical padding and borders so the outer box visually matches the left.
const boxHeights = ref<Record<string, number>>({})
const heightObservers = new Map<string, ResizeObserver>()
function lockBoxHeight(id: string, el: any) {
  if (!el) return
  if (boxHeights.value[id]) return
  const container = el as HTMLElement
  // Wait for the left column to exist and render
  const left = container.querySelector('.box-left') as HTMLElement | null
  if (!left) {
    requestAnimationFrame(() => lockBoxHeight(id, el))
    return
  }
  // Helper to compute and set height from the left column immediately
  const computeAndSet = () => {
    const rect = left.getBoundingClientRect()
    let h = Math.ceil(rect.height)
    if (h <= 0) return false
    const cs = getComputedStyle(container)
    const padTop = parseFloat(cs.paddingTop || '0')
    const padBottom = parseFloat(cs.paddingBottom || '0')
    const borderTop = parseFloat(cs.borderTopWidth || '0')
    const borderBottom = parseFloat(cs.borderBottomWidth || '0')
    h += padTop + padBottom + borderTop + borderBottom
    if (h > 0) {
      boxHeights.value = { ...boxHeights.value, [id]: h }
      return true
    }
    return false
  }

  // Try immediate measurement first; if not ready, observe for first non-zero size
  if (computeAndSet()) return

  // Observe left column size until we get a non-zero height, then lock and disconnect
  const ro = new ResizeObserver(() => {
    if (computeAndSet()) {
      ro.disconnect()
      heightObservers.delete(id)
    }
  })
  ro.observe(left)
  heightObservers.set(id, ro)
}
onBeforeUnmount(() => {
  heightObservers.forEach(ro => ro.disconnect())
  heightObservers.clear()
})

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
        <button @click="startTrip" class="btn btn-brown btn-lg">
          Start Trip
        </button>
      </div>

      <section v-if="isAuthed" class="feed">
        <h2>Your Feed</h2>
        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="loading" class="loading">Loading…</div>
        <div v-else>
          <div v-if="!feed.length" class="empty">No posts yet. Publish your first post from a trip!</div>
          <div v-else class="posts">
            <div
              v-for="p in feed"
              :key="p._id"
              class="post-box"
              :style="boxHeights[p._id] ? { height: boxHeights[p._id] + 'px' } : undefined"
              :ref="(el) => lockBoxHeight(p._id, el)"
            >
              <div class="box-left" style="--postcard-img-size: 100%">
                <PostCard 
                  :post="p" 
                  :current-user="auth.user?.username || ''"
                  :hide-author="true"
                  :hide-meta="true"
                  :hide-caption="true"
                  :show-actions="false"
                />
              </div>
              <div class="box-right">
                <div class="caption-right" v-if="p.caption">{{ p.caption }}</div>
                <div class="post-meta" v-if="p.createdAt">
                  {{ new Date(p.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }}
                </div>
                <h3 class="comments-title">Comments</h3>
                <div class="comments-pane">
                  <CommentThread :post-id="p._id" />
                </div>
              </div>
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

/* Start Trip now uses global .btn styles */

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
.post-box {
  --left-col: 420px;
  --nav-h: 36px;
  display: grid;
  grid-template-columns: var(--left-col) 1fr;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background);
  align-items: stretch;
  overflow: hidden;
  position: relative;
}
.box-left { display: grid; align-content: start; }
.box-left .post-card { border: 0; padding: 0; background: transparent; border-radius: 0; }
.box-right { display: grid; grid-template-rows: auto auto auto 1fr; gap: 0.5rem; min-height: 0; }
.caption-right { 
  text-align: left; 
  font-size: 1.05rem; 
  font-weight: 600; 
  margin: 0.25rem 0 0; 
  padding: 0; /* ensure no visual indent */
  white-space: pre-wrap; 
  overflow-wrap: anywhere; 
  word-break: break-word; 
  /* Prevent very long captions from squeezing the comments area */
  max-height: 6.5rem; 
  overflow: auto; 
  /* Reserve gutter only on the scrollbar side (right in LTR) so left edge aligns */
  scrollbar-gutter: stable;
}
/* Tasteful visible scrollbar for long captions (WebKit) */
.caption-right::-webkit-scrollbar { width: 10px; }
.caption-right::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 8px; }
.caption-right::-webkit-scrollbar-thumb { background: rgba(139, 106, 69, 0.6); border-radius: 8px; }
.caption-right::-webkit-scrollbar-thumb:hover { background: rgba(122, 92, 60, 0.8); }
.post-meta { text-align: left; font-size: 0.9rem; opacity: 0.7; margin-top: -0.25rem; }
.comments-title { font-size: 0.95rem; font-weight: 600; margin: 0; text-align: left; opacity: 0.85; }
.comments-pane {
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem;
  background: var(--color-background-soft);
  min-height: 0;
  scrollbar-gutter: stable both-edges;
}
/* Make scrollbar visible and tasteful (WebKit) */
.comments-pane::-webkit-scrollbar { width: 10px; }
.comments-pane::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 8px; }
.comments-pane::-webkit-scrollbar-thumb { background: rgba(139, 106, 69, 0.6); border-radius: 8px; }
.comments-pane::-webkit-scrollbar-thumb:hover { background: rgba(122, 92, 60, 0.8); }
@media (max-width: 1000px) {
  .post-box { grid-template-columns: 1fr; }
  .box-right { grid-template-rows: auto auto auto; }
}
.error { color: red; }
.loading { opacity: 0.8; }
.empty { opacity: 0.7; text-align: center; }
</style>

