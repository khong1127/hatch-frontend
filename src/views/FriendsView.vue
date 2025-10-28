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
  getAllUsers
} from '@/services/api'

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
const received = ref<Array<{ sender: string; receiver: string }>>([])

// Sent requests state
const sentLoading = ref(false)
const sent = ref<string[]>([])

// Friends tab state
const friendsLoading = ref(false)
const friendsError = ref('')
const friends = ref<Array<{ username: string }>>([])

function isFriend(u: string) {
  return friends.value.some(f => f.username === u)
}

function isSent(u: string) {
  return sent.value.includes(u)
}

function isReceivedFrom(u: string) {
  return received.value.some(r => r.sender === u)
}

async function refreshFriends() {
  if (!username.value) return
  friendsLoading.value = true
  friendsError.value = ''
  try {
    const res = await getFriends(username.value)
    // Backend returns {friends: [...]}, not array of objects
    const friendsList = (res as any)?.friends || []
    const names = Array.isArray(friendsList) ? friendsList : []
    friends.value = names.filter((v: any) => typeof v === 'string').map((n: string) => ({ username: n }))
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
    const res = await getReceivedFriendRequests(username.value)
    // Backend returns {receivedRequests: ["alice", "bob"]}
    const requestsList = (res as any)?.receivedRequests || []
    const senders = Array.isArray(requestsList) ? requestsList : []
    received.value = senders
      .filter((v: any) => typeof v === 'string')
      .map((sender: string) => ({ sender, receiver: username.value }))
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
    const res = await getSentFriendRequests(username.value)
    // Backend likely returns {sentRequests: ["alice", "bob"]}
    const sentList = (res as any)?.sentRequests || []
    sent.value = Array.isArray(sentList) ? sentList.filter((v: any) => typeof v === 'string') : []
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
    await sendFriendRequest(username.value, target)
    // Add to sent list immediately for instant UI feedback
    if (!sent.value.includes(target)) sent.value.push(target)
    refreshSent()
  } catch (e: any) {
    alert(e.message || 'Failed to send request')
  }
}

async function doAccept(sender: string) {
  if (!username.value) return
  try {
    await acceptFriendRequest(sender, username.value)
    refreshRequests()
    refreshFriends()
  } catch (e: any) {
    alert(e.message || 'Failed to accept request')
  }
}

async function doDeny(sender: string) {
  if (!username.value) return
  try {
    await denyFriendRequest(sender, username.value)
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
        <li v-for="r in received" :key="r.sender + '->' + r.receiver" class="row">
          <span>{{ r.sender }}</span>
          <div class="actions">
            <button @click="doAccept(r.sender)" class="btn btn-brown">Accept</button>
            <button @click="doDeny(r.sender)" class="btn btn-red">Decline</button>
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
.pill { opacity: 0.7; font-size: 0.9em; }
.error { color: red; }
.muted { opacity: 0.8; }
.inline { display: flex; gap: 0.5rem; align-items: center; }
input { max-width: 300px; padding: 0.25rem 0.5rem; border: 1px solid var(--color-border); }
.requests-panel { margin-bottom: 1.5rem; }
/* Removed local button variants in favor of global .btn classes */
</style>
