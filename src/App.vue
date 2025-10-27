<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import HeaderAuthLink from '@/components/HeaderAuthLink.vue'
import { useAuthStore } from '@/stores/auth'
import { useSessionStore } from '@/stores/session'
import logoDefault from '@/assets/logo.svg'

const auth = useAuthStore()
const session = useSessionStore()
onMounted(() => auth.restore())
const isSessionActive = computed(() => !!session.activeSessionId)
// Allow overriding logo via VITE_LOGO_PATH (e.g., put a file in /public/logo.jpg and set VITE_LOGO_PATH="/logo.jpg").
// If not set, try /logo.jpg from public, and fall back to the default SVG.
const defaultLogo = logoDefault as string
const logoSrc = (import.meta as any).env?.VITE_LOGO_PATH || '/logo.jpg' || defaultLogo
</script>

<template>
  <header>
    <img
      alt="App logo"
      class="logo"
      :src="logoSrc"
      width="96"
      height="96"
      @error="(e: Event) => { const el = e.target as HTMLImageElement; if (el && el.src !== defaultLogo) el.src = defaultLogo; }"
    />

    <div class="wrapper">
      <nav>
        <RouterLink
          to="/"
          :class="{ disabled: isSessionActive }"
          :aria-disabled="isSessionActive ? 'true' : 'false'"
          @click.prevent="isSessionActive && $router.push('/session')"
        >Home</RouterLink>
        <RouterLink
          v-if="auth.user"
          to="/friends"
          :class="{ disabled: isSessionActive }"
          :aria-disabled="isSessionActive ? 'true' : 'false'"
          @click.prevent="isSessionActive && $router.push('/session')"
        >Friends</RouterLink>
        <RouterLink
          v-if="auth.user"
          to="/profile"
          :class="{ disabled: isSessionActive }"
          :aria-disabled="isSessionActive ? 'true' : 'false'"
          @click.prevent="isSessionActive && $router.push('/session')"
        >Profile</RouterLink>
      </nav>
    </div>
    <div class="auth-slot">
      <HeaderAuthLink />
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
  width: 80px;
  height: 80px;
  border-radius: 50%; /* make it round */
  object-fit: cover; /* keep aspect if raster */
  background: var(--color-background);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active { color: #6b4722; }

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
  color: #6b4722;
}

nav a.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: auto; /* allow click to trigger our prevent + redirect */
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    column-gap: 1rem;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  .auth-slot {
    justify-self: end;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
