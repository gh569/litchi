// 前端 Supabase 客户端（uni-preact 迁移：URL + public anon key）
// URL 与 anon key 优先从 .env 读取（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）
// 缺失时回退到内置默认值，避免 Cloudflare 等 CI 构建读不到 .env 时整页崩溃
// anon key 仅 public 权限，可安全放前端；登录会话由 supabase-js 持久化到 localStorage
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://glfaxzznirhqtyidkrew.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZmF4enpuaXJocXR5aWRrcmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQyNDQyNDgsImV4cCI6MjA0OTgyMDI0OH0.bUA-06FrERbBrtvOf7P_wahh3x-3wjkdP5Lpe061KT0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
