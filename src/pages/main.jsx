import { render } from "preact";
import App from "./app.jsx";
import { supabase } from "../lib/supabase";

// 登录系统：统一为 /api/* 请求注入 Supabase 会话 token
// （非白名单接口都需要 Authorization，这里全局自动加上）
let currentToken = null
// 初始化时读取当前会话
supabase.auth.getSession().then(({ data }) => {
  currentToken = data?.session?.access_token || null
}).catch(() => {})
// 登录/登出/刷新时同步 token
supabase.auth.onAuthStateChange((_event, session) => {
  currentToken = session?.access_token || null
})

const __origFetch = window.fetch.bind(window)
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input && input.url) || ''
  if (url.startsWith('/api/')) {
    if (currentToken) {
      const headers = new Headers(init.headers || {})
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${currentToken}`)
      }
      init = { ...init, headers }
    }
  }
  return __origFetch(input, init)
}

render(<App />, document.getElementById("app"));
