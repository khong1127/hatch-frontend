import { getToken } from '@/services/authToken'

// In dev, use relative URLs so Vite's proxy handles /api requests (avoids CORS).
// In prod, use the configured base URL.
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '')

// Build an image URL for legacy file serving (/api/images/:id). If given a data: or http(s) URL, return as-is.
export function getImageUrl(idOrUrl: string): string {
  if (!idOrUrl) return ''
  if (/^(data:|https?:\/\/)/i.test(idOrUrl)) return idOrUrl
  if (/^\/api\/images\//.test(idOrUrl)) return `${API_BASE_URL}${idOrUrl}`
  return `${API_BASE_URL}/api/images/${encodeURIComponent(idOrUrl)}`
}

// The updated API spec expects user fields as simple strings (typically user IDs or usernames depending on backend).
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  })
  const raw = await res.text()
  if (!res.ok) {
    let message = res.statusText
    try {
      const parsed = raw ? JSON.parse(raw) : null
      message = (parsed && (parsed.error || parsed.message)) || message
    } catch {
      // keep default message
    }
    throw new Error(message || 'API error')
  }
  if (!raw) return {} as T
  try {
    return JSON.parse(raw) as T
  } catch {
    // Not JSON (e.g., plain text/empty). Return as any.
    return (raw as unknown) as T
  }
}
// ---------- PasswordAuthentication Queries ----------
export function getUserByUsername(username: string) {
  return apiRequest<Array<{ user: { _id: string; username: string; password: string } }>>(
    '/api/PasswordAuthentication/_getUserByUsername',
    {
      method: 'POST',
      body: JSON.stringify({ username })
    }
  )
}

export function getUserById(id: string) {
  return apiRequest<Array<{ user: { _id: string; username: string; password: string } }>>(
    '/api/PasswordAuthentication/_getUserById',
    {
      method: 'POST',
      body: JSON.stringify({ id })
    }
  )
}

export async function getAllUsers(): Promise<Array<{ _id: string; username: string; password: string }>> {
  const res = await apiRequest<any>(
    '/api/PasswordAuthentication/_getAllUsers',
    { method: 'POST', body: JSON.stringify({}) }
  )
  // Normalize across possible backend shapes:
  // 1) { users: [ { _id, username, password } | { user: {...} } ] }
  // 2) [ { _id, username, password } | { user: {...} } ]
  // 3) legacy: [ { user: {...} } ] or even { user: [ {...}, ... ] }
  const toFlat = (arr: any[]): any[] =>
    arr
      .map((item: any) => (item && typeof item === 'object' && 'user' in item ? (item as any).user : item))
      .filter((u: any) => u && typeof u === 'object')

  if (Array.isArray(res)) {
    return toFlat(res)
  }
  if (res && typeof res === 'object') {
    if (Array.isArray((res as any).users)) {
      return toFlat((res as any).users)
    }
    if (Array.isArray((res as any).user)) {
      return toFlat((res as any).user)
    }
  }
  return []
}

export function userExistsById(user: string) {
  return apiRequest<Array<{ exists: boolean }>>('/api/PasswordAuthentication/_userExistsById', {
    method: 'POST',
    body: JSON.stringify({ user })
  })
}

export function userExistsByUsername(username: string) {
  return apiRequest<Array<{ exists: boolean }>>(
    '/api/PasswordAuthentication/_userExistsByUsername',
    {
      method: 'POST',
      body: JSON.stringify({ username })
    }
  )
}

// SessionLogging API methods
export function startSession(user: string) {
  return apiRequest<{ session: string }>('/api/SessionLogging/startSession', {
    method: 'POST',
    body: JSON.stringify({ user })
  })
}

export function addEntry(user: string, session: string, image: string) {
  return apiRequest<{}>('/api/SessionLogging/addEntry', {
    method: 'POST',
    body: JSON.stringify({ user, session, image })
  })
}

export function endSession(user: string, session: string) {
  return apiRequest<{}>('/api/SessionLogging/endSession', {
    method: 'POST',
    body: JSON.stringify({ user, session })
  })
}

// SessionLogging Queries
// Attempts to retrieve entries for a given session. Normalizes various backend shapes into string[] of image IDs.
export async function getEntriesInSession(user: string, session: string): Promise<string[]> {
  const res = await apiRequest<any>('/api/SessionLogging/_getEntriesInSession', {
    method: 'POST',
    body: JSON.stringify({ user, session })
  })
  // Normalize response into an array of string IDs
  try {
    if (!res) return []
    if (Array.isArray(res)) {
      // Could be ["img1", "img2"] or [{ entry: "img1" }, { image: "img2" }]
      return res
        .map((item: any) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') {
            return item.entry || item.image || item.id || null
          }
          return null
        })
        .filter((x: any): x is string => typeof x === 'string')
    }
    if (typeof res === 'object') {
      // Could be { entries: ["img1", ...] } or { session: { entries: [...] } }
      const entries = res.entries || res.session?.entries
      if (Array.isArray(entries)) {
        return entries
          .map((item: any) => (typeof item === 'string' ? item : item?.entry || item?.image || item?.id))
          .filter((x: any): x is string => typeof x === 'string')
      }
    }
  } catch {
    // fallthrough to empty
  }
  return []
}

// ---------- Posting Actions ----------
export function createPost(user: string, images: string[], caption: string) {
  return apiRequest<{ post: string }>('/api/Posting/create', {
    method: 'POST',
    body: JSON.stringify({ user, images, caption })
  })
}

export function deletePost(user: string, post: string) {
  return apiRequest<{}>('/api/Posting/delete', {
    method: 'POST',
    body: JSON.stringify({ user, post })
  })
}

export function editPost(user: string, post: string, new_caption: string) {
  return apiRequest<{}>('/api/Posting/edit', {
    method: 'POST',
    body: JSON.stringify({ user, post, new_caption })
  })
}

// ---------- Posting Queries ----------
export function getPostById(post: string) {
  return apiRequest<{ postDetails?: { _id: string; caption: string; images: string[]; author: string; createdAt: string }; error?: string }>(
    '/api/Posting/_getPostById',
    { method: 'POST', body: JSON.stringify({ post }) }
  )
}

export function getPostsByAuthor(user: string) {
  return apiRequest<{ posts?: Array<{ _id: string; caption: string; images: string[]; author: string; createdAt: string }>; error?: string }>(
    '/api/Posting/_getPostsByAuthor',
    { method: 'POST', body: JSON.stringify({ user }) }
  )
}

// PasswordAuthentication API methods
export function register(username: string, password: string) {
  return apiRequest<{ user: unknown }>('/api/PasswordAuthentication/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
}

export function authenticate(username: string, password: string) {
  return apiRequest<{ user: unknown }>('/api/PasswordAuthentication/authenticate', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
}

// ---------- Friending Actions ----------
export function sendFriendRequest(sender: string, receiver: string) {
  return apiRequest<{ request: string }>('/api/Friending/sendRequest', {
    method: 'POST',
    body: JSON.stringify({ sender, receiver })
  })
}

export function acceptFriendRequest(sender: string, receiver: string) {
  return apiRequest<{}>('/api/Friending/acceptRequest', {
    method: 'POST',
    body: JSON.stringify({ sender, receiver })
  })
}

export function denyFriendRequest(sender: string, receiver: string) {
  return apiRequest<{}>('/api/Friending/denyRequest', {
    method: 'POST',
    body: JSON.stringify({ sender, receiver })
  })
}

export function removeFriend(user: string, to_be_removed_friend: string) {
  return apiRequest<{}>('/api/Friending/removeFriend', {
    method: 'POST',
    body: JSON.stringify({ user, to_be_removed_friend })
  })
}

// ---------- Friending Queries ----------
export function isFriends(user1: string, user2: string) {
  return apiRequest<Array<{ areFriends: boolean }>>('/api/Friending/_isFriends', {
    method: 'POST',
    body: JSON.stringify({ user1, user2 })
  })
}

export async function getFriends(user: string): Promise<{ friends: string[] }> {
  const res = await apiRequest<any>('/api/Friending/_getFriends', {
    method: 'POST',
    body: JSON.stringify({ user })
  })
  
  // Handle multiple response formats:
  // 1. Backend may return { friends: ["alice", "bob"] } (flat array of usernames/IDs)
  // 2. Backend may return [{ friend: "alice" }, { friend: "bob" }] (array of objects per spec)
  // 3. Backend may return ["alice", "bob"] (flat array directly)
  
  let friends: string[] = []
  
  if (res && typeof res === 'object' && 'friends' in res && Array.isArray(res.friends)) {
    // Format 1: { friends: [...] }
    friends = res.friends.filter((v: any) => typeof v === 'string')
  } else if (Array.isArray(res)) {
    // Format 2 or 3: array (either of objects or strings)
    friends = res
      .map((it: any) => (typeof it === 'string' ? it : it?.friend))
      .filter((v: any): v is string => typeof v === 'string')
  }
  
  return { friends }
}

export async function getSentFriendRequests(sender: string): Promise<{ sentRequests: string[] }> {
  const res = await apiRequest<any>('/api/Friending/_getSentFriendRequests', {
    method: 'POST',
    body: JSON.stringify({ sender })
  })
  // Handle multiple response formats:
  // 1. { sentRequests: [...] } or similar property
  // 2. [{ receiver: "alice" }, ...] (array of objects per spec)
  // 3. ["alice", "bob"] (flat array)
  
  let sentRequests: string[] = []
  
  if (res && typeof res === 'object' && !Array.isArray(res)) {
    // Object format - check for common property names
    const prop = res.sentRequests || res.requests || res.receivers
    if (Array.isArray(prop)) {
      sentRequests = prop.filter((v: any) => typeof v === 'string')
    }
  } else if (Array.isArray(res)) {
    sentRequests = res
      .map((it: any) => (typeof it === 'string' ? it : it?.receiver))
      .filter((v: any): v is string => typeof v === 'string')
  }
  
  return { sentRequests }
}

export async function getReceivedFriendRequests(receiver: string): Promise<{ receivedRequests: string[] }> {
  const res = await apiRequest<any>(
    '/api/Friending/_getReceivedFriendRequests',
    { method: 'POST', body: JSON.stringify({ receiver }) }
  )
  // Handle multiple response formats:
  // 1. { receivedRequests: [...] } or similar property
  // 2. [{ sender: "alice" }, ...] (array of objects per spec)
  // 3. ["alice", "bob"] (flat array)
  
  let receivedRequests: string[] = []
  
  if (res && typeof res === 'object' && !Array.isArray(res)) {
    // Object format - check for common property names
    const prop = res.receivedRequests || res.requests || res.senders
    if (Array.isArray(prop)) {
      receivedRequests = prop.filter((v: any) => typeof v === 'string')
    }
  } else if (Array.isArray(res)) {
    receivedRequests = res
      .map((it: any) => (typeof it === 'string' ? it : it?.sender))
      .filter((v: any): v is string => typeof v === 'string')
  }
  
  return { receivedRequests }
}

// ---------- Posting Feed (new in updated spec) ----------
export function getFeedForUser(user: string) {
  return apiRequest<{ posts: Array<{ _id: string; author: string; caption: string; images: string[]; createdAt: string }> }>(
    '/api/Posting/getFeedForUser',
    { method: 'POST', body: JSON.stringify({ user }) }
  )
}

// ---------- Commenting Actions ----------
export function addComment(author: string, post: string, content: string) {
  return apiRequest<{ comment: unknown }>('/api/Commenting/addComment', {
    method: 'POST',
    body: JSON.stringify({ author, content, post })
  })
}

export function deleteComment(user: string, comment: string) {
  return apiRequest<{}>('/api/Commenting/deleteComment', {
    method: 'POST',
    body: JSON.stringify({ user, comment })
  })
}

export function editComment(user: string, comment: string, new_content: string) {
  return apiRequest<{}>('/api/Commenting/editComment', {
    method: 'POST',
    body: JSON.stringify({ user, comment, new_content })
  })
}

// ---------- Commenting Queries ----------
export function getComment(comment: string) {
  return apiRequest<Array<{ comment: { _id: string; author: string; content: string; post: string; createdAt: string } }>>(
    '/api/Commenting/_getComment',
    { method: 'POST', body: JSON.stringify({ comment }) }
  )
}

export function getCommentsForPost(post: string) {
  return apiRequest<
    | Array<{ comment: { _id: string; author: string; content: string; post: string; createdAt: string } }>
    | { comments?: Array<{ _id: string; author: string; content: string; post: string; createdAt: string }>; error?: string }
  >(
    '/api/Commenting/_getCommentsForPost',
    { method: 'POST', body: JSON.stringify({ post }) }
  )
}

export function getCommentsByAuthor(author: string) {
  return apiRequest<Array<{ comment: { _id: string; author: string; content: string; post: string; createdAt: string } }>>(
    '/api/Commenting/_getCommentsByAuthor',
    { method: 'POST', body: JSON.stringify({ author }) }
  )
}

// ---------- File Concept (GCS) ----------
export function requestUploadUrl(user: string, filename: string, contentType: string, expiresInSeconds = 900) {
  return apiRequest<{ uploadUrl: string; bucket: string; object: string }>(
    '/api/File/requestUploadUrl',
    { method: 'POST', body: JSON.stringify({ user, filename, contentType, expiresInSeconds }) }
  )
}

export function confirmUpload(user: string, object: string, contentType: string, size: number) {
  return apiRequest<{ file: string; url: string }>(
    '/api/File/confirmUpload',
    { method: 'POST', body: JSON.stringify({ user, object, contentType, size }) }
  )
}

export function getViewUrl(user: string, object: string, expiresInSeconds = 3600) {
  return apiRequest<{ url: string }>(
    '/api/File/getViewUrl',
    { method: 'POST', body: JSON.stringify({ user, object, expiresInSeconds }) }
  )
}

export function getFileById(file: string) {
  return apiRequest<Array<{ file: { _id: string; owner: string; bucket: string; object: string; contentType: string; size: number; createdAt: string } }>>(
    '/api/File/_getFileById',
    { method: 'POST', body: JSON.stringify({ file }) }
  )
}

// =========================
// New sync-spec compliant APIs (session-based bodies)
// These mirror endpoints defined in api_specs/syncspec.md and include the `session`
// token in the request body as required by the updated spec.
// =========================

function postWithSession<T>(endpoint: string, body: Record<string, any> = {}, session?: string) {
  const sess = session ?? getToken()
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ ...body, session: sess })
  })
}

// Commenting
export function commentingAddCommentSync(params: { content: string; post: string; session?: string }) {
  const { content, post, session } = params
  return postWithSession<{ comment: string }>(
    '/api/Commenting/addComment',
    { content, post },
    session
  )
}

export function commentingDeleteCommentSync(params: { comment: string; session?: string }) {
  const { comment, session } = params
  return postWithSession<{ status: 'success' }>(
    '/api/Commenting/deleteComment',
    { comment },
    session
  )
}

// Friending
export function friendingSendRequestSync(params: { toUsername: string; session?: string }) {
  const { toUsername, session } = params
  return postWithSession<{ friendRequest: string }>(
    '/api/Friending/sendRequest',
    { toUsername },
    session
  )
}

// Posting
export function postingCreateSync(params: { content: string; session?: string }) {
  const { content, session } = params
  return postWithSession<{ post: string }>(
    '/api/Posting/create',
    { content },
    session
  )
}

export function postingDeleteSync(params: { post: string; session?: string }) {
  const { post, session } = params
  return postWithSession<{ status: 'success' }>(
    '/api/Posting/delete',
    { post },
    session
  )
}

// File
export function fileRequestUploadUrlSync(params: { filename: string; contentType: string; session?: string }) {
  const { filename, contentType, session } = params
  return postWithSession<{ fileId: string; uploadUrl: string }>(
    '/api/File/requestUploadUrl',
    { filename, contentType },
    session
  )
}

export function fileConfirmUploadSync(params: { fileId: string; session?: string }) {
  const { fileId, session } = params
  return postWithSession<{ success: true }>(
    '/api/File/confirmUpload',
    { fileId },
    session
  )
}

export function fileGetFilesByOwnerSync(params?: { session?: string }) {
  const session = params?.session
  return postWithSession<{ files: any[] }>(
    '/api/File/_getFilesByOwner',
    {},
    session
  )
}

// SessionLogging (trip session management)
export function sessionLoggingStartSessionSync(params: { startTime: number; location: object; session?: string }) {
  const { startTime, location, session } = params
  return postWithSession<{ newSession: string }>(
    '/api/SessionLogging/startSession',
    { startTime, location },
    session
  )
}

export function sessionLoggingAddEntrySync(params: { sessionId: string; entry: object; session?: string }) {
  const { sessionId, entry, session } = params
  return postWithSession<{ newEntry: string }>(
    '/api/SessionLogging/addEntry',
    { sessionId, entry },
    session
  )
}

export function sessionLoggingEndSessionSync(params: { sessionId: string; session?: string }) {
  const { sessionId, session } = params
  return postWithSession<{ status: 'ended' }>(
    '/api/SessionLogging/endSession',
    { sessionId },
    session
  )
}

export function sessionLoggingGetSessionsByUserSync(params?: { session?: string }) {
  const session = params?.session
  return postWithSession<{ sessions: Array<{ _id: string; user: string; active: boolean }> }>(
    '/api/SessionLogging/_getSessionsByUser',
    {},
    session
  )
}

export function sessionLoggingGetSessionDetailsSync(params: { sessionId: string; session?: string }) {
  const { sessionId, session } = params
  return postWithSession<{ sessionDetails: { _id: string; user: string; active: boolean } }>(
    '/api/SessionLogging/_getSessionDetails',
    { sessionId },
    session
  )
}

export function sessionLoggingGetEntriesInSessionSync(params: { sessionId: string; session?: string }) {
  const { sessionId, session } = params
  return postWithSession<{ entries: Array<{ _id: string }> }>(
    '/api/SessionLogging/_getEntriesInSession',
    { sessionId },
    session
  )
}

export function sessionLoggingIsSessionActiveSync(params: { sessionId: string; session?: string }) {
  const { sessionId, session } = params
  return postWithSession<{ isActive: boolean }>(
    '/api/SessionLogging/_isSessionActive',
    { sessionId },
    session
  )
}

// PasswordAuthentication (queries)
export function authGetUserByIdSync(params: { id: string; session?: string }) {
  const { id, session } = params
  return postWithSession<{ user: any }>(
    '/api/PasswordAuthentication/_getUserById',
    { id },
    session
  )
}

export function authGetUserByUsernameSync(params: { username: string; session?: string }) {
  const { username, session } = params
  return postWithSession<{ user: any }>(
    '/api/PasswordAuthentication/_getUserByUsername',
    { username },
    session
  )
}

export function authGetAllUsersSync(params?: { session?: string }) {
  const session = params?.session
  return postWithSession<{ users: any[] }>(
    '/api/PasswordAuthentication/_getAllUsers',
    {},
    session
  )
}
