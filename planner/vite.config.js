import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Built files live at derrickdemars.org/planner/; at home (npm run dev) the planner still runs at /
  base: command === 'build' ? '/planner/' : '/',
  server: {
    port: Number(process.env.PORT) || 5180,
    host: true
  }
}))
