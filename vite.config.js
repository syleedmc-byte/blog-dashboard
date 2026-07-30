import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포 시 저장소 이름에 맞춰 base 값을 바꿔주세요.
// 예: 저장소 주소가 https://github.com/USER/blog-stats-dashboard 라면
// base: '/blog-stats-dashboard/'
// (Netlify/Vercel은 보통 '/' 그대로 두면 됩니다)
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
})
