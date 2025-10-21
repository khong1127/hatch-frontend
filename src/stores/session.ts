import { ref } from 'vue'
import { defineStore } from 'pinia'

export type SessionEntry = {
  id: string
  imageData?: string // base64 or URL for preview
}

export const useSessionStore = defineStore('session', () => {
  const activeSessionId = ref<string | null>(null)
  const entries = ref<SessionEntry[]>([])

  function start(id: string) {
    activeSessionId.value = id
    entries.value = []
    try {
      localStorage.setItem('activeSessionId', id)
    } catch (e) {
      // ignore storage errors
    }
  }

  function addEntry(id: string, imageData?: string) {
    entries.value.push({ id, imageData })
  }

  function clear() {
    activeSessionId.value = null
    entries.value = []
    try {
      localStorage.removeItem('activeSessionId')
    } catch (e) {
      // ignore storage errors
    }
  }

  function restore() {
    try {
      const id = localStorage.getItem('activeSessionId')
      if (id) {
        activeSessionId.value = id
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  return { activeSessionId, entries, start, addEntry, clear, restore }
})
