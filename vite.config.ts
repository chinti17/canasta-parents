/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the built site is host-agnostic: it works at a
  // domain root or any sub-path, on any static host, with no rebuild.
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
  },
})
