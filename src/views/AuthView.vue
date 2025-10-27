<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

// Sign In form state
const siUsername = ref('')
const siPassword = ref('')
const signingIn = computed(() => auth.loading)

// Register form state
const rUsername = ref('')
const rPassword = ref('')
const rPassword2 = ref('')
const passwordsMatch = computed(() => !!rPassword.value && rPassword.value === rPassword2.value)
const canRegister = computed(() => !!rUsername.value && !!rPassword.value && !!rPassword2.value && passwordsMatch.value && !auth.loading)

async function submitSignIn() {
  if (!siUsername.value || !siPassword.value) return
  try {
    await auth.signIn(siUsername.value, siPassword.value)
    if (!auth.error) router.push('/')
  } catch (_e) {
    // error shown inline
  }
}

async function submitRegister() {
  if (!canRegister.value) return
  try {
    await auth.register(rUsername.value, rPassword.value)
    if (!auth.error) router.push('/')
  } catch (_e) {
    // error shown inline
  }
}
</script>

<template>
  <main class="auth-page">
    <div class="panes">
      <section class="pane signin">
        <h2>Sign In</h2>
        <input type="text" placeholder="Username" v-model="siUsername" />
        <input type="password" placeholder="Password" v-model="siPassword" @keyup.enter="submitSignIn" />
        <button @click="submitSignIn" :disabled="signingIn || !siUsername || !siPassword">Sign In</button>
      </section>

      <section class="pane register">
        <h2>Register</h2>
        <input type="text" placeholder="Choose a username" v-model="rUsername" />
        <input type="password" placeholder="Create a password" v-model="rPassword" />
        <input type="password" placeholder="Confirm password" v-model="rPassword2" />
        <div class="hint" v-if="rPassword && rPassword2 && !passwordsMatch">Passwords do not match.</div>
        <button @click="submitRegister" :disabled="!canRegister">Create Account</button>
      </section>
    </div>
    <div class="error" v-if="auth.error">{{ auth.error }}</div>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 60vh;
  display: grid;
  place-items: center;
}
.panes {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  width: min(800px, 100%);
}
@media (min-width: 720px) {
  .panes { grid-template-columns: 1fr 1fr; }
}
.pane {
  display: grid;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 8px;
}
.pane h2 { margin: 0 0 0.25rem; color: #6b4722; }
.pane input {
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
}
.pane button {
  margin-top: 0.25rem;
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  cursor: pointer;
}
.pane button:disabled { opacity: 0.5; cursor: not-allowed; }
.signin, .register { border-color: var(--color-border); }
.hint { color: #dc2626; font-size: 0.9rem; }
.error { color: red; }
</style>
