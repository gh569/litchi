// 登录接口：校验账号密码，签发 token
import { sign } from '../../_lib/auth-utils.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

// 读取账号配置：
//   1) KV "login"：数组 [{ username, password }]
//   2) 环境变量 LOGIN_USER / LOGIN_PASS（单账号）
async function getAccounts(env) {
  try {
    const raw = await env.WPS_KV.get('login')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) return arr
    }
  } catch (e) { /* 忽略 */ }
  if (env.LOGIN_USER && env.LOGIN_PASS) {
    return [{ username: env.LOGIN_USER, password: env.LOGIN_PASS }]
  }
  return []
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const username = (body.username || '').trim()
    const password = body.password || ''
    if (!username || !password) {
      return json({ error: '请输入账号和密码' }, 400)
    }
    const accounts = await getAccounts(env)
    if (!accounts.length) {
      return json({ error: '服务端尚未配置账号' }, 500)
    }
    const account = accounts.find((a) => a.username === username)
    if (!account || account.password !== password) {
      return json({ error: '账号或密码错误' }, 401)
    }
    const token = await sign({ u: username }, env)
    return json({ token, username })
  } catch (e) {
    return json({ error: '请求格式错误' }, 400)
  }
}
