<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const mode = ref<'signin' | 'register'>('signin')
const username = ref('')
const password = ref('')

async function submit() {
  if (!username.value || !password.value) return
  try {
    if (mode.value === 'signin') {
      await auth.signIn(username.value, password.value)
    } else {
      await auth.register(username.value, password.value)
    }
    // Only navigate on success (no error message present)
    if (!auth.error) router.push('/')
  } catch (_e) {
    // Error is displayed inline via auth.error; keep user on page
  }
}
</script>

<template>
  <main class="auth-page">
    <div class="card">
      <h1>{{ mode === 'signin' ? 'Sign In' : 'Register' }}</h1>
      <div class="tabs">
        <button :class="{ active: mode === 'signin' }" @click="mode = 'signin'">Sign In</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Register</button>
      </div>
      <input type="text" placeholder="Username" v-model="username" />
      <input type="password" placeholder="Password" v-model="password" />
      <button @click="submit" :disabled="auth.loading || !username || !password">
        {{ mode === 'signin' ? 'Sign In' : 'Create Account' }}
      </button>
      <div class="error" v-if="auth.error">{{ auth.error }}</div>
    </div>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 60vh;
  display: grid;
  place-items: center;
}
.card {
  display: grid;
  gap: 0.75rem;
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  min-width: 280px;
}
.tabs {
  display: flex;
  gap: 0.5rem;
}
.tabs button {
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 0.25rem 0.5rem;
}
.tabs .active {
  background: var(--color-background-mute);
}
.error { color: red; }
</style>
