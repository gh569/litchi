// 前端 Supabase 客户端（uni-preact 迁移：URL + public anon key）
// URL 与 anon key 从环境变量读取：
//  - 本地开发：.env（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）
//  - 线上构建：Cloudflare Pages → Settings → Environment variables（同名变量）
// anon key 仅 public 权限，可安全放前端；登录会话由 supabase-js 持久化到 localStorage
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[supabase] 缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，请配置 .env 或 Cloudflare 环境变量')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
