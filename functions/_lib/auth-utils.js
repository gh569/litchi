// 共享鉴权工具：HMAC-SHA256 无状态 token（Web Crypto）
// token 格式: base64url(payload).base64url(signature)
// payload = { u: username, exp: 过期时间戳(秒) }

function getSecret(env) {
  return env.LOGIN_SECRET || 'litchi-default-secret-2026'
}

function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

// 签发 token，默认有效期 7 天
export async function sign(payload, env, ttlSeconds = 7 * 24 * 3600) {
  const secret = getSecret(env)
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const data = JSON.stringify({ ...payload, exp })
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const sigStr = b64urlEncode(String.fromCharCode(...new Uint8Array(sig)))
  return b64urlEncode(data) + '.' + sigStr
}

// 校验 token，合法返回 payload，否则返回 null
export async function verify(token, env) {
  if (!token || !token.includes('.')) return null
  try {
    const [data, sig] = token.split('.')
    const secret = getSecret(env)
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      Uint8Array.from(b64urlDecode(sig), (c) => c.charCodeAt(0)),
      enc.encode(b64urlDecode(data))
    )
    if (!valid) return null
    const payload = JSON.parse(b64urlDecode(data))
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null
    return payload
  } catch (e) {
    return null
  }
}

// 从请求里取 token（Authorization Bearer 或 ?token=）
export function getToken(request, url) {
  const auth = request.headers.get('Authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  if (url) return url.searchParams.get('token') || ''
  return ''
}

// ---- Supabase Auth 验证 ----
// 默认值来自 uni-preact 已配置的项目（URL + public anon key），可用环境变量覆盖
const DEFAULT_SUPABASE_URL = 'https://glfaxzznirhqtyidkrew.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZmF4enpuaXJocXR5aWRrcmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQyNDQyNDgsImV4cCI6MjA0OTgyMDI0OH0.bUA-06FrERbBrtvOf7P_wahh3x-3wjkdP5Lpe061KT0'

// 校验 Supabase access token：调 Supabase /auth/v1/user 确认有效，返回 user 或 null
export async function verifySupabaseToken(token, env) {
  if (!token) return null
  const url = (env?.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '')
  const anonKey = env?.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  // 加超时，防止 Supabase 网络慢导致 API 请求挂起
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      signal: controller.signal,
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  } finally {
    clearTimeout(timer)
  }
}
