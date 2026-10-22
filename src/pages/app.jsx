import { Router, Route, Switch } from 'wouter-preact'

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

export default function App() {
  return (
    <Router >
      <Switch>
        {routes.map(({ path, Comp }) => (
          <Route key={path} path={path} component={Comp} />
        ))}
        <Route>404 页面不存在</Route>
      </Switch>
    </Router>
  )
}
