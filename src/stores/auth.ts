import { ref } from 'vue'
import { defineStore } from 'pinia'
import { authenticate, register as apiRegister, userExistsByUsername, getAllUsers } from '@/services/api'
import { setToken, getToken, setUser, getUser, clearAuth } from '@/services/authToken'

export type AuthUser = {
  username: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loading = ref(false)
  const error = ref('')

  function extractUsernameFromResponse(res: any): string | null {
    const u = res?.user
    if (typeof u === 'string') return u
    if (u && typeof u.username === 'string') return u.username
    return null
  }

  async function resolveIdToUsername(id: string): Promise<string> {
    // getUserById returns [], so fetch all users and find by _id
    try {
      const allUsers = await getAllUsers()
      // Backend returns flat array: [{_id, username, password}, ...]
      const all = Array.isArray(allUsers) ? allUsers : []
      const match = all.find((u: any) => u?._id === id)
      if (match && typeof match.username === 'string') {
        return match.username
      }
    } catch {
      // fallback: return the ID
    }
    return id
  }

  async function signIn(username: string, password: string) {
    loading.value = true
    error.value = ''
    try {
      const res = await authenticate(username, password)
      if ((res as any)?.error) {
        throw new Error((res as any).error)
      }
      let uname = extractUsernameFromResponse(res)
      if (!uname) {
        throw new Error('invalid username or password')
      }
      // If backend returned an ID (UUID or MongoDB ObjectID), resolve to username
      const isId = uname.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i) || uname.match(/^[a-f0-9]{24}$/i)
      if (isId) {
        uname = await resolveIdToUsername(uname)
      }
      user.value = { username: uname }
      // If backend returns token, set it. Otherwise, you may compute one.
      const token = (res as any).token ?? null
      if (token) setToken(token)
      setUser(user.value)
    } catch (e: any) {
      error.value = e.message || 'Failed to sign in'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register(username: string, password: string) {
    loading.value = true
    error.value = ''
    try {
      // Preflight: check if username already exists to provide clear UX
      let exists = false
      try {
        const existsArr = await userExistsByUsername(username)
        exists = Array.isArray(existsArr)
          ? existsArr.some((x: any) =>
              typeof x === 'boolean' ? x : (typeof x?.exists === 'boolean' ? x.exists : false)
            )
          : false
      } catch (_checkErr: any) {
        // If preflight fails (e.g., endpoint not available), continue and rely on backend error
        exists = false
      }
      if (exists) {
        const msg = 'username already taken. please register with a different username'
        error.value = msg
        throw new Error(msg)
      }
  const res = await apiRegister(username, password)
  if ((res as any)?.error) {
    throw new Error((res as any).error)
  }
  let uname = extractUsernameFromResponse(res)
  if (!uname) {
    throw new Error('registration failed')
  }
  const isId = uname.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i) || uname.match(/^[a-f0-9]{24}$/i)
  if (isId) {
    uname = await resolveIdToUsername(uname)
  }
  user.value = { username: uname }
  const token = (res as any).token ?? null
  if (token) setToken(token)
  setUser(user.value)
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('exists') || msg.includes('taken') || msg.includes('already')) {
        error.value = 'username already taken. please register with a different username'
      } else {
        error.value = e.message || 'Failed to register'
      }
      throw e
    } finally {
      loading.value = false
    }
  }

  function signOut() {
    user.value = null
    clearAuth()
  }

  function restore() {
    const savedUser = getUser()
    const savedToken = getToken()
    if (savedUser && savedToken !== undefined) {
      user.value = savedUser
    }
  }

  async function getCurrentUserId(): Promise<string | null> {
    if (!user.value?.username) return null
    try {
      const allUsers = await getAllUsers()
      const all = Array.isArray(allUsers) ? allUsers : []
      const match = all.find((u: any) => u?.username === user.value?.username)
      return match?._id || null
    } catch {
      return null
    }
  }

  return { user, loading, error, signIn, register, signOut, restore, getCurrentUserId }
})
