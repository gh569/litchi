import { render } from "preact";
import App from "./app.jsx";

// 登录系统：统一为 /api/* 请求注入登录 token
// （非白名单接口都需要 Authorization，这里全局自动加上）
const __origFetch = window.fetch.bind(window)
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input && input.url) || ''
  if (url.startsWith('/api/')) {
    const token = localStorage.getItem('litchi_token')
    if (token) {
      const headers = new Headers(init.headers || {})
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      init = { ...init, headers }
    }
  }
  return __origFetch(input, init)
}

render(<App />, document.getElementById("app"));
