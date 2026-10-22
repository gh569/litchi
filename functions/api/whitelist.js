// 读取页面白名单（无需登录即可访问的页面路径）
// 默认：登录页 + 文件预览页 doc-viewer
// 可在 KV "whitelist" 配置覆盖，如 ["/login", "/contractor/doc-viewer"]
export async function onRequestGet({ env }) {
  const DEFAULT_WHITELIST = ['/login', '/contractor/doc-viewer']
  let list = DEFAULT_WHITELIST
  try {
    const raw = await env.WPS_KV.get('whitelist')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) list = arr
    }
  } catch (e) { /* 忽略 */ }
  return new Response(JSON.stringify({ whitelist: list }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
