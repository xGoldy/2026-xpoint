import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The project-local Podman store holds container files; never watch it.
  server: { watch: { ignored: ['**/.supabase/**'] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
