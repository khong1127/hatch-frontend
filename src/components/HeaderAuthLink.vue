<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const isAuthed = computed(() => !!auth.user)

function goAuth() {
  router.push('/auth')
}

function signOut() {
  auth.signOut()
  router.push('/auth')
}

</script>

<template>
  <div class="header-auth">
    <template v-if="isAuthed">
      <span class="username">{{ auth.user!.username }}</span>
      <button class="signout-btn" @click="signOut">Sign Out</button>
    </template>
    <template v-else>
      <button @click="goAuth">Sign In / Register</button>
    </template>
  </div>
</template>

<style scoped>
.header-auth { display: flex; align-items: center; gap: 1rem; }
.username { font-style: italic; }
.signout-btn {
  padding: 0.28rem 0.7rem;
  border: 1px solid #8b6a45; /* lighter brown */
  background: #8b6a45; /* lighter brown */
  color: #ffffff;
  border-radius: 9999px; /* pill */
  cursor: pointer;
  font-weight: 400; /* no bold */
  transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease;
  line-height: 1;
}
.signout-btn:hover { background: #7a5c3c; }
.signout-btn:active { transform: translateY(1px); }
.signout-btn:focus { outline: none; box-shadow: 0 0 0 3px rgba(139, 106, 69, 0.25); }
</style>
