import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import { execSync } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('./package.json');

const gitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
})();

const gitBranch = (() => {
  // CI systems (Cloudflare Workers/Pages, GitHub Actions) often use detached HEAD.
  // Check CI env vars first, then fall back to git.
  if (process.env.CF_PAGES_BRANCH) return process.env.CF_PAGES_BRANCH;
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    if (branch !== 'HEAD') return branch;
    // Detached HEAD — check if we're on a tag (release commit)
    try {
      execSync('git describe --exact-match --tags HEAD', { stdio: 'pipe' });
      return 'main'; // Tagged commit = release = main
    } catch {
      // No tag — check if commit message is a release commit (npm version creates these)
      try {
        const msg = execSync('git log -1 --format=%s').toString().trim();
        if (msg.startsWith('release: v')) return 'main';
      } catch { /* ignore */ }
      return 'dev';
    }
  } catch {
    return 'unknown';
  }
})();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__: JSON.stringify(gitHash),
    __GIT_BRANCH__: JSON.stringify(gitBranch),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tracevite-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: false, // Use public/manifest.json directly
      includeAssets: ['logo.svg'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2020',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts', 'src/main.tsx'],
    },
    css: false,
  },
});
