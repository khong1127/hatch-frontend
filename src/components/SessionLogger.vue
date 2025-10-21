<script setup lang="ts">
import { ref } from 'vue'
import { startSession, addEntry, endSession } from '@/services/api'

const user = ref('demoUser')
const sessionId = ref<string | null>(null)
const image = ref('example-image-id')
const error = ref('')
const loading = ref(false)

async function handleStartSession() {
  loading.value = true
  error.value = ''
  try {
    const result = await startSession(user.value)
    sessionId.value = result.session
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleAddEntry() {
  if (!sessionId.value) return
  loading.value = true
  error.value = ''
  try {
    await addEntry(user.value, sessionId.value, image.value)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleEndSession() {
  if (!sessionId.value) return
  loading.value = true
  error.value = ''
  try {
    await endSession(user.value, sessionId.value)
    sessionId.value = null
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2>Session Logger Example</h2>
    <div v-if="error" style="color: red">Error: {{ error }}</div>
    <div v-if="sessionId">Active Session: {{ sessionId }}</div>
    <button @click="handleStartSession" :disabled="loading || !!sessionId">Start Session</button>
    <button @click="handleAddEntry" :disabled="loading || !sessionId">Add Entry</button>
    <button @click="handleEndSession" :disabled="loading || !sessionId">End Session</button>
  </div>
</template>
