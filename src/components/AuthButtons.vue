<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const mode = ref<'signin' | 'register'>('signin')
const username = ref('')
const password = ref('')

const isAuthenticated = computed(() => !!auth.user)

async function submit() {
  if (!username.value || !password.value) return
  if (mode.value === 'signin') {
    await auth.signIn(username.value, password.value)
  } else {
    await auth.register(username.value, password.value)
  }
  // clear fields on success
  username.value = ''
  password.value = ''
}
</script>

<template>
  <div class="auth">
    <template v-if="isAuthenticated">
      <span class="welcome">Hi, {{ auth.user!.username }}</span>
      <button @click="auth.signOut" :disabled="auth.loading">Sign Out</button>
    </template>
    <template v-else>
      <div class="controls">
        <button class="link" :class="{ active: mode === 'signin' }" @click="mode = 'signin'">Sign In</button>
        <button class="link" :class="{ active: mode === 'register' }" @click="mode = 'register'">Register</button>
      </div>
      <div class="form">
        <input type="text" placeholder="Username" v-model="username" />
        <input type="password" placeholder="Password" v-model="password" />
        <button @click="submit" :disabled="auth.loading || !username || !password">
          {{ mode === 'signin' ? 'Sign In' : 'Create Account' }}
        </button>
        <div class="error" v-if="auth.error">{{ auth.error }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.auth {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.controls {
  display: flex;
  gap: 0.25rem;
}
.link {
  background: transparent;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  opacity: 0.6;
}
.link.active {
  opacity: 1;
  font-weight: 600;
}
.form {
  display: inline-flex;
  gap: 0.25rem;
}
input {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
}
button {
  padding: 0.25rem 0.5rem;
}
.welcome {
  margin-right: 0.5rem;
}
.error {
  color: red;
  margin-left: 0.5rem;
}
</style>
