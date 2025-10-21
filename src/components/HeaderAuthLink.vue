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
    <span class="welcome">Hi, {{ auth.user!.username }}</span>
    <button @click="signOut">Sign Out</button>
    </template>
    <template v-else>
      <button @click="goAuth">Sign In / Register</button>
    </template>
  </div>
</template>

<style scoped>
.header-auth { display: flex; align-items: center; gap: 0.5rem; }
.welcome { opacity: 0.8; }
</style>
