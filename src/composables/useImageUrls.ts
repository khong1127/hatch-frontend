import { ref, watchEffect } from 'vue'
import { getFileById, getViewUrl, getImageUrl } from '@/services/api'

// Simple in-memory cache to avoid repeated network calls per file ID during a session
const urlCache = new Map<string, Promise<string>>()

function extractFileMeta(resp: any): { object?: string; owner?: string } | null {
  try {
    if (!resp) return null
    // Common shape: Array<{ file: {...} }>
    if (Array.isArray(resp)) {
      const first = resp[0]
      if (first?.file && typeof first.file === 'object') return first.file
      if (first && typeof first === 'object') return first as any
    }
    // Object with file
    if (resp.file && typeof resp.file === 'object') return resp.file
    // Object with files: [...]
    if (Array.isArray(resp.files) && resp.files[0]) {
      const first = resp.files[0]
      if (first?.file && typeof first.file === 'object') return first.file
      if (typeof first === 'object') return first
    }
  } catch {
    // ignore
  }
  return null
}

// Resolve an array of image IDs to signed view URLs using File Concept APIs.
// - ids: array of image file IDs (or absolute URLs/data URIs which will be returned as-is)
// - viewer: user id or username to pass to getViewUrl (spec requires a user arg)
// Returns a ref<string[]> preserving order; entries may be empty string when resolution fails.
export function useImageUrls(
  ids: string[] | (() => string[]),
  viewer: string | (() => string)
) {
  const urls = ref<string[]>([])
  const loading = ref(false)
  const debugIdsEnv = (import.meta as any).env?.VITE_DEBUG_FILE_IDS || ''
  const DEBUG_IDS = new Set<string>(
    String(debugIdsEnv)
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
  )
  const ENABLE_LEGACY = ((import.meta as any).env?.VITE_ENABLE_LEGACY_IMAGES === '1' || (import.meta as any).env?.VITE_ENABLE_LEGACY_IMAGES === 'true')

  async function resolve() {
    const list = typeof ids === 'function' ? ids() : ids
    const user = typeof viewer === 'function' ? viewer() : viewer

    if (!Array.isArray(list) || !list.length) {
      urls.value = []
      return
    }
    loading.value = true
    try {
      const resolved = await Promise.all(
        list.map(async (id) => {
          const debug = DEBUG_IDS.has(id)
          // passthrough for absolute/data URLs
          if (/^(data:|https?:\/\/)/i.test(id)) return id
          try {
            const cached = urlCache.get(id)
            if (cached) {
              return await cached
            }
            const compute = async () => {
                // Legacy IDs like img_123 should use the legacy endpoint
                const isLegacySynthetic = /^img_\d+$/.test(id)
                if (isLegacySynthetic) {
                  if (ENABLE_LEGACY) {
                    if (debug) console.debug('[useImageUrls] Legacy synthetic ID, using /api/images:', id)
                    return getImageUrl(id)
                  }
                  if (debug) console.debug('[useImageUrls] Legacy synthetic ID, showing placeholder (legacy disabled):', id)
                  return ''
                }
                const metaResp = await getFileById(id)
                const meta = extractFileMeta(metaResp)
                const object = meta?.object
                const owner = meta?.owner
                const userForView = owner || user
                if (debug) {
                  console.debug('[useImageUrls] Resolving file ID:', id, {
                    object,
                    owner,
                    viewer: user,
                    userForView
                  })
                }
                if (object && userForView) {
                  const view = await getViewUrl(userForView, object, 3600)
                  if (debug) {
                    try {
                      const origin = view?.url ? new URL(view.url).origin : 'no-url'
                      console.debug('[useImageUrls] getViewUrl result for', id, ':', { origin, hasUrl: !!view?.url })
                    } catch {
                      console.debug('[useImageUrls] getViewUrl result for', id, ':', { url: view?.url })
                    }
                  }
                  if (view?.url) return view.url
                }
                // For non-legacy IDs where we couldn't resolve a signed URL, return empty to show placeholder
                return ''
            }
            const result = await compute()
            // Only cache successful non-empty URLs to avoid sticky placeholders
            if (result) {
              urlCache.set(id, Promise.resolve(result))
            }
            return result
          } catch (e) {
            // Network/API error: only use legacy endpoint for clearly legacy synthetic IDs; otherwise, show placeholder
            if (debug) console.warn('[useImageUrls] Error resolving ID', id, e)
            return /^img_\d+$/.test(id) ? getImageUrl(id) : ''
          }
          // Unreachable, but keep types happy
          // return ''
        })
      )
      urls.value = resolved
    } finally {
      loading.value = false
    }
  }

  watchEffect(() => { void resolve() })

  return { urls, loading }
}
