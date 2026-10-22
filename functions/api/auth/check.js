// 校验登录态：前端路由守卫启动时调用
import { verify, getToken } from '../../_lib/auth-utils.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const token = getToken(request, url)
  const payload = token ? await verify(token, env) : null
  if (!payload) {
    return json({ ok: false }, 401)
  }
  return json({ ok: true, username: payload.u })
}
