// 全局中间件：保护 /api/*（白名单放行，其他需登录 token）
import { verify, getToken } from './_lib/auth-utils.js'

// API 白名单（无需登录即可访问）
//  - auth/login: 登录接口本身
//  - auth/whitelist: 前端守卫需要读取白名单（未登录也要读）
//  - auth/check: 前端守卫校验登录态（未登录也要能问出 401）
//  - contractor/file: 文件预览页(doc-viewer)是免登录白名单页，需代理拉取文件
const API_WHITELIST = [
  '/api/auth/login', '/api/auth/whitelist', '/api/auth/check', '/api/contractor/file',
]

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export async function onRequest(context) {
  const { request, next, env } = context
  const url = new URL(request.url)
  const path = url.pathname

  // 仅保护 /api/*，静态资源与页面由前端守卫控制
  if (!path.startsWith('/api/')) return next()

  // 白名单 API 直接放行
  if (API_WHITELIST.some((w) => path === w || path.startsWith(w + '/'))) {
    return next()
  }

  // 其余 API 校验 token
  const token = getToken(request, url)
  if (!token) {
    return json({ error: '未登录' }, 401)
  }
  const payload = await verify(token, env)
  if (!payload) {
    return json({ error: '登录已过期，请重新登录' }, 401)
  }
  return next()
}
