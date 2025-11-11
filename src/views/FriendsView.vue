<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import {
  sendFriendRequest,
  acceptFriendRequest,
  denyFriendRequest,
  removeFriend,
  getFriends,
  getReceivedFriendRequests,
  getSentFriendRequests,
  getAllUsers,
  resolveUserId
} from '@/services/api'
import { friendingSendRequestSync } from '@/services/api'
import { getToken } from '@/services/authToken'

const router = useRouter()
const auth = useAuthStore()
const username = computed(() => auth.user?.username || '')

// Search tab state
const searchQuery = ref('')
const searchLoading = ref(false)
const searchError = ref('')
const searchResults = ref<Array<{ username: string }>>([])

// Requests tab state
const reqLoading = ref(false)
const reqError = ref('')
// Store both display and raw sender identifiers to avoid losing original IDs
interface ReceivedRequest { senderDisplay: string; senderRaw: string; receiver: string }
const received = ref<ReceivedRequest[]>([])

// Sent requests state
const sentLoading = ref(false)
const sent = ref<string[]>([])

// Friends tab state
const friendsLoading = ref(false)
const friendsError = ref('')
const friends = ref<Array<{ username: string }>>([])
const usersMap = ref<Record<string, string>>({}) // id -> username

function isFriend(u: string) {
  return friends.value.some(f => f.username === u)
}

function isSent(u: string) {
  return sent.value.includes(u)
}

function isReceivedFrom(u: string) {
  return received.value.some(r => r.senderDisplay === u || r.senderRaw === u)
}

async function refreshFriends() {
  if (!username.value) return
  friendsLoading.value = true
  friendsError.value = ''
  try {
    // Load user map for resolving IDs -> usernames
    let all: any[] = []
    try {
      all = await getAllUsers()
      const map: Record<string, string> = {}
      for (const u of Array.isArray(all) ? all : []) {
        if (u && (u as any)._id && (u as any).username) map[(u as any)._id] = (u as any).username
      }
      usersMap.value = map
    } catch { usersMap.value = {} }

    const selfId = (Array.isArray(all) ? all : []).find((u: any) => u?.username === username.value)?._id || username.value
    
    // Try with ID first per spec; if empty, try username as fallback
    let ids: string[] = []
    try {
      const res = await getFriends(selfId)
      const friendsList = (res as any)?.friends || []
      ids = Array.isArray(friendsList) ? friendsList.filter((v: any) => typeof v === 'string') : []
    } catch { /* ignore */ }
    if (!ids.length) {
      try {
        const res2 = await getFriends(username.value)
        const friendsList2 = (res2 as any)?.friends || []
        const ids2 = Array.isArray(friendsList2) ? friendsList2.filter((v: any) => typeof v === 'string') : []
        ids = ids2
      } catch { /* ignore */ }
    }
    
    // Map to usernames
    const names = ids.map(id => usersMap.value[id] || id)
    friends.value = names.map((n: string) => ({ username: n }))
  } catch (e: any) {
    friendsError.value = e.message || 'Failed to load friends'
  } finally {
    friendsLoading.value = false
  }
}

async function refreshRequests() {
  if (!username.value) return
  reqLoading.value = true
  reqError.value = ''
  try {
    // Ensure users map
    if (Object.keys(usersMap.value).length === 0) {
      try {
        const all = await getAllUsers()
        const map: Record<string, string> = {}
        for (const u of Array.isArray(all) ? all : []) {
          if (u && (u as any)._id && (u as any).username) map[(u as any)._id] = (u as any).username
        }
        usersMap.value = map
      } catch { /* ignore */ }
    }
    // Resolve current user to ID and try both ID and username for compatibility
    let selfId = username.value
    try {
      const all = await getAllUsers()
      const match = Array.isArray(all) ? all.find((u: any) => u?.username === username.value) : null
      selfId = match?._id || username.value
    } catch { /* ignore */ }

    let requestsList: any[] = []
    try {
      const res = await getReceivedFriendRequests(selfId)
      requestsList = (res as any)?.receivedRequests || []
    } catch { /* ignore */ }
    if (!Array.isArray(requestsList) || requestsList.length === 0) {
      try {
        const res2 = await getReceivedFriendRequests(username.value)
        requestsList = (res2 as any)?.receivedRequests || []
      } catch { /* ignore */ }
    }
    const senders = Array.isArray(requestsList) ? requestsList.filter((v: any) => typeof v === 'string') : []
    received.value = senders.map((raw: string) => ({
      senderDisplay: usersMap.value[raw] || raw,
      senderRaw: raw,
      receiver: username.value
    }))
  } catch (e: any) {
    reqError.value = e.message || 'Failed to load requests'
  } finally {
    reqLoading.value = false
  }
}

async function refreshSent() {
  if (!username.value) return
  sentLoading.value = true
  try {
    // Ensure users map
    if (Object.keys(usersMap.value).length === 0) {
      try {
        const all = await getAllUsers()
        const map: Record<string, string> = {}
        for (const u of Array.isArray(all) ? all : []) {
          if (u && (u as any)._id && (u as any).username) map[(u as any)._id] = (u as any).username
        }
        usersMap.value = map
      } catch { /* ignore */ }
    }
    // Resolve current user to ID and try both ID and username for compatibility
    let selfId = username.value
    try {
      const all = await getAllUsers()
      const match = Array.isArray(all) ? all.find((u: any) => u?.username === username.value) : null
      selfId = match?._id || username.value
    } catch { /* ignore */ }
    let sentList: any[] = []
    try {
      const res = await getSentFriendRequests(selfId)
      sentList = (res as any)?.sentRequests || []
    } catch { /* ignore */ }
    if (!Array.isArray(sentList) || sentList.length === 0) {
      try {
        const res2 = await getSentFriendRequests(username.value)
        sentList = (res2 as any)?.sentRequests || []
      } catch { /* ignore */ }
    }
    const ids = Array.isArray(sentList) ? sentList.filter((v: any) => typeof v === 'string') : []
    sent.value = ids.map(id => usersMap.value[id] || id)
  } catch (_e: any) {
    sent.value = []
  } finally {
    sentLoading.value = false
  }
}

let searchDebounce: any
watch(searchQuery, (q) => {
  clearTimeout(searchDebounce)
  if (!q) { searchResults.value = []; return }
  searchDebounce = setTimeout(async () => {
    searchLoading.value = true
    searchError.value = ''
    try {
      // Backend _getUserByUsername returns [] (empty) even for exact match, so rely on _getAllUsers
      const resAll = await getAllUsers()
      // Backend returns flat array of user objects: [{_id, username, password}, ...]
      const all = Array.isArray(resAll) ? resAll : []
      const users = all
        .map((u: any) => u?.username)
        .filter((v: any) => typeof v === 'string') as string[]
      const qlc = q.toLowerCase()
      const foundNames = users.filter(u => u.toLowerCase().startsWith(qlc))

      searchResults.value = [...new Set(foundNames)]
        .filter(u => u !== username.value)
        .map(u => ({ username: u }))
    } catch (e: any) {
      // Treat 404 / not found as empty result set
      const msg = (e.message || '').toLowerCase()
      if (msg.includes('not found') || msg.includes('404')) {
        searchResults.value = []
        searchError.value = ''
      } else {
        searchError.value = e.message || 'Search failed'
      }
    } finally {
      searchLoading.value = false
    }
  }, 300)
})

async function doSendRequest(target: string) {
  if (!username.value) return
  if (!target) return
  try {
    const session = getToken()
    if (session) {
      // Sync-spec uses toUsername for session-authenticated send
      await friendingSendRequestSync({ toUsername: target, session })
    } else {
      await sendFriendRequest(username.value, target)
    }
    if (!sent.value.includes(target)) sent.value.push(target)
    refreshSent()
  } catch (e: any) {
    alert(e.message || 'Failed to send request')
  }
}

async function doAccept(senderOrRaw: string) {
  if (!username.value) return
  try {
    const senderId = await resolveUserId(senderOrRaw)
    const receiverId = await resolveUserId(username.value)
    const senderName = senderOrRaw
    const receiverName = username.value
    const variants = [
      // expected order: sender -> receiver
      { s: senderId, r: receiverId },
      { s: senderId, r: receiverName },
      { s: senderName, r: receiverId },
      { s: senderName, r: receiverName },
      // swapped order, in case backend expects opposite
      { s: receiverId, r: senderId },
      { s: receiverId, r: senderName },
      { s: receiverName, r: senderId },
      { s: receiverName, r: senderName }
    ]
    let success = false
    let lastErr: any = null
    for (const v of variants) {
      try {
        console.log('[FriendsView] Trying accept variant', v)
        await acceptFriendRequest(v.s, v.r)
        success = true
        break
      } catch (e: any) {
        lastErr = e
        console.warn('[FriendsView] accept variant failed', v, e?.message)
      }
    }
    if (!success) throw lastErr || new Error('Failed to accept request (all variants)')
    refreshRequests()
    refreshFriends()
  } catch (e: any) {
    alert(e.message || 'Failed to accept request')
  }
}

async function doDeny(senderOrRaw: string) {
  if (!username.value) return
  try {
    const senderId = await resolveUserId(senderOrRaw)
    const receiverId = await resolveUserId(username.value)
    const senderName = senderOrRaw
    const receiverName = username.value
    const variants = [
      // expected order: sender -> receiver
      { s: senderId, r: receiverId },
      { s: senderId, r: receiverName },
      { s: senderName, r: receiverId },
      { s: senderName, r: receiverName },
      // swapped order fallback
      { s: receiverId, r: senderId },
      { s: receiverId, r: senderName },
      { s: receiverName, r: senderId },
      { s: receiverName, r: senderName }
    ]
    let success = false
    let lastErr: any = null
    for (const v of variants) {
      try {
        console.log('[FriendsView] Trying deny variant', v)
        await denyFriendRequest(v.s, v.r)
        success = true
        break
      } catch (e: any) {
        lastErr = e
        console.warn('[FriendsView] deny variant failed', v, e?.message)
      }
    }
    if (!success) throw lastErr || new Error('Failed to deny request (all variants)')
    refreshRequests()
  } catch (e: any) {
    alert(e.message || 'Failed to deny request')
  }
}

async function doRemoveFriend(friendUsername: string) {
  if (!username.value) return
  if (!confirm(`Are you sure you want to remove ${friendUsername} from your friends?`)) {
    return
  }
  try {
    await removeFriend(username.value, friendUsername)
    refreshFriends()
  } catch (e: any) {
    alert(e.message || 'Failed to remove friend')
  }
}

function ensureAuthed() {
  if (!username.value) router.push('/auth')
}

// Preload all sections since we now show a single combined view
ensureAuthed()
refreshFriends()
refreshSent()
refreshRequests()
</script>

<template>
  <main class="friends">
    <h1>Friends</h1>
    <!-- Search at top -->
    <section class="panel search-panel">
      <input v-model="searchQuery" placeholder="Search usernames" />
      <div v-if="searchLoading">Searching…</div>
      <div v-if="searchError" class="error">{{ searchError }}</div>
      <ul v-if="searchResults.length">
        <li v-for="u in searchResults" :key="u.username" class="row">
          <span>{{ u.username }}</span>
          <button v-if="isFriend(u.username)" disabled class="pill">Friend</button>
          <button v-else-if="isSent(u.username)" disabled class="pill">Sent</button>
          <button v-else-if="isReceivedFrom(u.username)" disabled class="pill">Request received</button>
          <button v-else @click="doSendRequest(u.username)" class="btn btn-brown">Send friend request</button>
        </li>
      </ul>
      <div v-else-if="!searchLoading && searchQuery" class="muted">No users found</div>
    </section>
    
    <!-- Requests section -->
    <section class="panel requests-panel">
      <h2 class="section-title">Requests</h2>
      <div class="section-divider" aria-hidden="true"></div>
      <div v-if="reqLoading">Loading requests…</div>
      <div v-if="reqError" class="error">{{ reqError }}</div>
      <ul v-if="received.length">
        <li v-for="r in received" :key="r.senderRaw + '->' + r.receiver" class="row">
          <span>{{ r.senderDisplay }}</span>
          <div class="actions">
            <button @click="doAccept(r.senderRaw)" class="btn btn-brown">Accept</button>
            <button @click="doDeny(r.senderRaw)" class="btn btn-red">Decline</button>
          </div>
        </li>
      </ul>
      <div v-else-if="!reqLoading" class="muted">No friend requests at the moment</div>
    </section>
    
    <!-- Friends section -->
    <section class="panel">
      <h2 class="section-title">Friends</h2>
      <div class="section-divider" aria-hidden="true"></div>
      <div v-if="friendsLoading">Loading friends…</div>
      <div v-if="friendsError" class="error">{{ friendsError }}</div>
      <ul v-if="friends.length">
        <li v-for="f in friends" :key="f.username" class="row">
          <span>{{ f.username }}</span>
          <button @click="doRemoveFriend(f.username)" class="btn btn-red">Remove</button>
        </li>
      </ul>
      <div v-else-if="!friendsLoading" class="muted">No friends yet. Search up your friends' usernames to get started!</div>
    </section>
  </main>
</template>

<style scoped>
.friends { padding: 2rem; display: grid; gap: 1rem; }
.panel { display: grid; gap: 0.5rem; }
.search-panel { margin-bottom: 1rem; }
.section-title { font-size: 1.1rem; font-weight: 600; }
.section-divider { height: 1px; background: var(--color-border); margin: 0.25rem 0 0.5rem; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; }
.actions { display: flex; gap: 0.5rem; }
.pill { opacity: 0.7; font-size: 0.9em; }
.error { color: red; }
.muted { opacity: 0.8; }
.inline { display: flex; gap: 0.5rem; align-items: center; }
input { max-width: 300px; padding: 0.25rem 0.5rem; border: 1px solid var(--color-border); }
.requests-panel { margin-bottom: 1.5rem; }
/* Removed local button variants in favor of global .btn classes */
</style>
