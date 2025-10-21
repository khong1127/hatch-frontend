<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import {
  sendFriendRequest,
  acceptFriendRequest,
  denyFriendRequest,
  getFriends,
  getReceivedFriendRequests,
  getAllUsers
} from '@/services/api'

const router = useRouter()
const auth = useAuthStore()
const username = computed(() => auth.user?.username || '')

// Tabs: 'search' | 'requests' | 'friends'
const tab = ref<'search' | 'requests' | 'friends'>('search')

// Search tab state
const searchQuery = ref('')
const searchLoading = ref(false)
const searchError = ref('')
const searchResults = ref<Array<{ username: string }>>([])
const directTarget = ref('')

// Requests tab state
const reqLoading = ref(false)
const reqError = ref('')
const received = ref<Array<{ sender: string; receiver: string }>>([])

// Friends tab state
const friendsLoading = ref(false)
const friendsError = ref('')
const friends = ref<Array<{ username: string }>>([])

function isFriend(u: string) {
  return friends.value.some(f => f.username === u)
}

async function refreshFriends() {
  if (!username.value) return
  friendsLoading.value = true
  friendsError.value = ''
  try {
    const res = await getFriends(username.value)
    // Spec returns Array<{ friends: string }>, where each element has a username/id string
    const items = Array.isArray(res) ? res : []
    const names = items
      .map((r: any) => r?.friends)
      .filter((v: any) => typeof v === 'string') as string[]
    friends.value = names.map(n => ({ username: n }))
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
    // Spec returns Array<{ receivedRequests: string }> as usernames/ids of senders
    const items = Array.isArray(res) ? res : []
    received.value = items
      .map((r: any) => r?.receivedRequests)
      .filter((v: any) => typeof v === 'string')
      .map((sender: string) => ({ sender, receiver: username.value }))
  } catch (e: any) {
    reqError.value = e.message || 'Failed to load requests'
  } finally {
    reqLoading.value = false
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
      const foundNames = users.filter(u => u.toLowerCase().includes(qlc))

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
    // Optionally refresh requests
    refreshRequests()
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

function ensureAuthed() {
  if (!username.value) router.push('/auth')
}

// Initial loads when entering tabs
watch(tab, (t) => {
  ensureAuthed()
  if (t === 'friends') refreshFriends()
  if (t === 'requests') refreshRequests()
})

// Default: preload friends (used by isFriend in search)
refreshFriends()
</script>

<template>
  <main class="friends">
    <h1>Friends</h1>

    <div class="tabs">
      <button :class="{ active: tab === 'search' }" @click="tab = 'search'">Search</button>
      <button :class="{ active: tab === 'requests' }" @click="tab = 'requests'">Requests</button>
      <button :class="{ active: tab === 'friends' }" @click="tab = 'friends'">Friends</button>
    </div>

    <!-- Search tab -->
    <section v-if="tab === 'search'" class="panel">
      <input v-model="searchQuery" placeholder="Search usernames" />
      <div class="inline">
        <input v-model="directTarget" placeholder="Or type a username to add" />
        <button @click="doSendRequest(directTarget)">Send request</button>
      </div>
      <div v-if="searchLoading">Searching…</div>
      <div v-if="searchError" class="error">{{ searchError }}</div>
      <ul v-if="searchResults.length">
        <li v-for="u in searchResults" :key="u.username" class="row">
          <span>{{ u.username }}</span>
          <button v-if="!isFriend(u.username)" @click="doSendRequest(u.username)">Send friend request</button>
          <span v-else class="pill">Friend</span>
        </li>
      </ul>
      <div v-else-if="!searchLoading && searchQuery" class="muted">No users found</div>
    </section>

    <!-- Requests tab -->
    <section v-else-if="tab === 'requests'" class="panel">
      <div v-if="reqLoading">Loading requests…</div>
      <div v-if="reqError" class="error">{{ reqError }}</div>
      <ul v-if="received.length">
        <li v-for="r in received" :key="r.sender + '->' + r.receiver" class="row">
          <span>{{ r.sender }} wants to be friends</span>
          <button @click="doAccept(r.sender)">Accept</button>
          <button @click="doDeny(r.sender)">Deny</button>
        </li>
      </ul>
      <div v-else-if="!reqLoading" class="muted">No friend requests at the moment</div>
    </section>

    <!-- Friends tab -->
    <section v-else class="panel">
      <div v-if="friendsLoading">Loading friends…</div>
      <div v-if="friendsError" class="error">{{ friendsError }}</div>
      <ul v-if="friends.length">
        <li v-for="f in friends" :key="f.username" class="row">
          <span>{{ f.username }}</span>
        </li>
      </ul>
      <div v-else-if="!friendsLoading" class="muted">No friends yet. Search up your friends' usernames to get started!</div>
    </section>
  </main>
</template>

<style scoped>
.friends { padding: 2rem; display: grid; gap: 1rem; }
.tabs { display: flex; gap: 0.5rem; }
.tabs button { border: 1px solid var(--color-border); background: transparent; padding: 0.25rem 0.5rem; }
.tabs .active { background: var(--color-background-mute); }
.panel { display: grid; gap: 0.5rem; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; }
.pill { opacity: 0.7; font-size: 0.9em; }
.error { color: red; }
.muted { opacity: 0.8; }
.inline { display: flex; gap: 0.5rem; align-items: center; }
input { max-width: 300px; padding: 0.25rem 0.5rem; border: 1px solid var(--color-border); }
</style>
