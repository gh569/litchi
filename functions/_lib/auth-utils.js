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
// Supabase 项目 JWT secret（HS256 签名密钥，用于本地验签 access_token，零网络往返）
const DEFAULT_SUPABASE_JWT_SECRET =
  'OVl5p0VRF6fLoEpCQSZ09JbfooOIiVXfd2yOQ+nROJ+7b2wha5MNqp9WL69CVCnjtuGcSO4F5d6b3/XxW9ZMDw=='

// base64url -> 字节
function b64urlToBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const bin = atob(str)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

// 本地验签 Supabase JWT（HS256，secret 为 UTF-8 原始字符串），有效返回 payload，否则 null
async function verifyLocal(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  let header, payload
  try {
    header = JSON.parse(b64urlDecode(h))
    payload = JSON.parse(b64urlDecode(p))
  } catch (e) { return null }
  if (header.alg !== 'HS256') return null
  const signingInput = h + '.' + p
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  )
  const valid = await crypto.subtle.verify('HMAC', key, b64urlToBytes(s), new TextEncoder().encode(signingInput))
  if (!valid) return null
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null
  return payload
}

// 校验 Supabase access token：优先本地 HS256 验签，无 secret 时回退调 Supabase /auth/v1/user
export async function verifySupabaseToken(token, env) {
  if (!token) return null
  const secret = env?.SUPABASE_JWT_SECRET || DEFAULT_SUPABASE_JWT_SECRET
  if (secret) {
    return verifyLocal(token, secret)
  }
  // 回退：调 Supabase Auth 验证
  const url = (env?.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '')
  const anonKey = env?.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
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
