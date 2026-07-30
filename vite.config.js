import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 저장소: github.com/syleedmc-byte/blog-dashboard
// (Netlify/Vercel로 옮기게 되면 VITE_BASE_PATH=/ 로 두거나 base를 '/'로 바꾸면 됩니다)
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/blog-dashboard/',
})
