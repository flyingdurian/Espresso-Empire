import { defineConfig } from 'vite'
export default defineConfig({build:{rollupOptions:{input:{game:'index.html',cart:'cart.html',studio:'studio.html'}}}})
