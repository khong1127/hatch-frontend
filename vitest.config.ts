import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// If the project's Vite config exports a function (common when using defineConfig with
// a mode-based factory), call it with mode 'test' to get the resolved config object.
// Support both synchronous and async factories with top-level await.
// Provide a minimal ConfigEnv expected by some Vite config factories.
const resolvedViteConfig = typeof viteConfig === 'function'
  ? await viteConfig({ command: 'serve', mode: 'test' } as any)
  : viteConfig

export default mergeConfig(
  resolvedViteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url))
    }
  })
)
