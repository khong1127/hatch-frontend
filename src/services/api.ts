import { getToken } from '@/services/authToken'

// In dev, use relative URLs so Vite's proxy handles /api requests (avoids CORS).
// In prod, use the configured base URL.
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '')

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

export function getAllUsers() {
  return apiRequest<Array<{ _id: string; username: string; password: string }>>(
    '/api/PasswordAuthentication/_getAllUsers',
    {
      method: 'POST',
      body: JSON.stringify({})
    }
  )
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
  return apiRequest<Array<{ postDetails: { _id: string; caption: string; images: string[]; author: string; createdAt: string } }>>(
    '/api/Posting/_getPostById',
    { method: 'POST', body: JSON.stringify({ post }) }
  )
}

export function getPostsByAuthor(user: string) {
  return apiRequest<Array<{ post: { _id: string; caption: string; images: string[]; author: string; createdAt: string } }>>(
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

export function getFriends(user: string) {
  return apiRequest<Array<{ friends: string }>>('/api/Friending/_getFriends', {
    method: 'POST',
    body: JSON.stringify({ user })
  })
}

export function getSentFriendRequests(sender: string) {
  return apiRequest<Array<{ sentRequests: string }>>('/api/Friending/_getSentFriendRequests', {
    method: 'POST',
    body: JSON.stringify({ sender })
  })
}

export function getReceivedFriendRequests(receiver: string) {
  return apiRequest<Array<{ receivedRequests: string }>>(
    '/api/Friending/_getReceivedFriendRequests',
    {
      method: 'POST',
      body: JSON.stringify({ receiver })
    }
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
  return apiRequest<Array<{ comment: { _id: string; author: string; content: string; post: string; createdAt: string } }>>(
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
