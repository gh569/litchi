// 本地预览服务器（Node）
// 直接复用 functions/ 的 Cloudflare Pages 函数逻辑，用 Node 的 fetch 访问外网，
// 绕开 wrangler dev 本地 workerd 的出站网络限制。
// 用法：node preview-server.mjs  然后浏览器打开 http://localhost:5173
import http from 'node:http'
import https from 'node:https'
import dns from 'node:dns'
import { readFile } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { onRequestGet as quoteGet } from './functions/api/stock/[quote].js'
import { onRequestGet as klineGet } from './functions/api/stock/[kline].js'

// 强制走 IPv4 的 fetch 实现。
// 原因：Node 默认 fetch（undici）走 Happy Eyeballs，常优先 IPv6；
// 东方财富 push2 的 IPv6 节点会直接重置连接（表现为"封 IP"）。
// Python requests 默认走 IPv4 所以稳定。这里让 Node 也强制 IPv4。
function ipv4Fetch(input, init = {}) {
  const url = typeof input === 'string' ? new URL(input) : new URL(input.url)
  const isHttps = url.protocol === 'https:'
  const mod = isHttps ? https : http
  const headers = { ...(init.headers || {}) }
  const signal = init.signal
  return new Promise((resolve, reject) => {
    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: init.method || 'GET',
        headers,
        lookup: (host, opts, cb) => dns.lookup(host, { ...opts, family: 4 }, cb),
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const body = Buffer.concat(chunks)
          resolve(new Response(new Uint8Array(body), { status: res.statusCode, headers: res.headers }))
        })
      }
    )
    req.on('error', reject)
    if (signal) {
      if (signal.aborted) { req.destroy(); reject(new Error('aborted')); return }
      signal.addEventListener('abort', () => req.destroy(new Error('aborted')))
    }
    if (init.body) req.write(init.body)
    req.end()
  })
}
globalThis.fetch = ipv4Fetch

// 可用端口参数覆盖：node preview-server.mjs [端口]，默认 5173
const PORT = Number(process.argv[2]) || 5173
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
}

async function callFn(fn, req) {
  const buf = await fn({ request: req }).then((r) => r.arrayBuffer())
  return { buf, status: 200 }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  try {
    // ---- API 路由：直接调用 functions 逻辑 ----
    if (url.pathname === '/api/stock/quote' || url.pathname === '/api/stock/kline') {
      const fn = url.pathname.endsWith('quote') ? quoteGet : klineGet
      const upReq = new Request('http://localhost' + url.pathname + url.search, { method: 'GET' })
      const fnRes = await fn({ request: upReq })
      const buf = Buffer.from(await fnRes.arrayBuffer())
      res.writeHead(fnRes.status, { 'Content-Type': 'application/json' })
      res.end(buf)
      return
    }

    // ---- 静态文件（构建产物 dist/）----
    const rel = url.pathname === '/' ? '/index.html' : url.pathname
    const file = normalize(join('dist', rel))
    if (!file.startsWith(normalize(join('dist')))) {
      res.writeHead(403); res.end('Forbidden'); return
    }
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
})

server.listen(PORT, () => {
  console.log(`本地预览已启动: http://localhost:${PORT}`)
})
