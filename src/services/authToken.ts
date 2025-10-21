let memToken: string | null = null
let memUser: { username: string } | null = null

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export function setToken(token: string | null) {
  memToken = token
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getToken(): string | null {
  if (memToken !== null) return memToken
  const t = localStorage.getItem(TOKEN_KEY)
  memToken = t
  return t
}

export function setUser(user: { username: string } | null) {
  memUser = user
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

export function getUser(): { username: string } | null {
  if (memUser !== null) return memUser
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    memUser = JSON.parse(raw)
    return memUser
  } catch {
    return null
  }
}

export function clearAuth() {
  setToken(null)
  setUser(null)
}
