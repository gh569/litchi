import { Router, Route, Switch, useLocation, Redirect } from 'wouter-preact'
import { useEffect, useState } from 'preact/hooks'
import { supabase } from '../lib/supabase'

// history 文件路由（类似 Next.js pages 约定）：
// src/pages/**/index.jsx 每个文件 = 一个路由，文件夹路径即 URL。
//   pages/index.jsx        -> /
//   pages/stock/index.jsx  -> /stock
//   pages/data/index.jsx   -> /data
// 新增页面：在 pages/ 下建一个文件夹放 index.jsx 即可，无需改路由。
// 入口 app.jsx / main.jsx 不是 index.jsx，自然不被匹配。

const pages = import.meta.glob('./**/index.jsx', { eager: true, import: 'default' })

const routes = Object.entries(pages).map(([file, Comp]) => {
  const rel = file.replace('./', '')
  const dir = rel.replace(/\/?index\.jsx$/, '')
  // __id 之类文件夹转成动态参数 :id（wouter 动态路由）
  const path = dir === '' ? '/' : ('/' + dir).replace(/__(\w+)/g, ':$1')
  return { path, Comp }
})

// 登录守卫：未登录且不在白名单内的页面，跳转到 /login
// 登录态由 Supabase 会话判断（supabase-js 持久化到 localStorage）
// 白名单从 /api/auth/whitelist 读取（默认 /login + /contractor/doc-viewer，可在 KV "whitelist" 配置）
function AuthGuard({ children }) {
  const [location] = useLocation()
  const [state, setState] = useState(null) // { checked, loggedIn, whitelist }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let whitelist = ['/login']
      try {
        const r = await fetch('/api/auth/whitelist')
        if (r.ok) {
          const d = await r.json()
          if (Array.isArray(d.whitelist) && d.whitelist.length) whitelist = d.whitelist
        }
      } catch (e) { /* 忽略 */ }

      let loggedIn = false
      try {
        const { data } = await supabase.auth.getSession()
        loggedIn = !!data.session
      } catch (e) { loggedIn = false }
      if (!cancelled) setState({ checked: true, loggedIn, whitelist })
    })()
    return () => { cancelled = true }
  }, [])

  if (!state || !state.checked) return null

  // 找回密码恢复中：邮件链接带 recovery 令牌（已抢收存 sessionStorage），放行让改密页消费
  const isRecovery = (() => {
    try {
      if (window.location.hash.includes("type=recovery")) return true
      return !!sessionStorage.getItem("supabase_recovery")
    } catch (e) { return false }
  })()
  if (isRecovery) return children

  // 取纯路径（去掉 query/hash）
  const path = (() => {
    try { return new URL(location, window.location.origin).pathname }
    catch (e) { return location }
  })()

  if (path === '/login') return children
  const isWhitelisted = state.whitelist.some((w) => path === w || path.startsWith(w + '/'))
  if (!state.loggedIn && !isWhitelisted) {
    return <Redirect to={`/login?from=${encodeURIComponent(location)}`} />
  }
  return children
}

export default function App() {
  return (
    <Router>
      <AuthGuard>
        <Switch>
          {routes.map(({ path, Comp }) => (
            <Route key={path} path={path} component={Comp} />
          ))}
          <Route>404 页面不存在</Route>
        </Switch>
      </AuthGuard>
    </Router>
  )
}
