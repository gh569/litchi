import { Link } from 'wouter-preact'
import { useEffect, useState } from 'preact/hooks'
import { supabase } from '../lib/supabase'
import style from './index.module.css'

// 账号入口：根据登录态显示「登录」或「账号邮箱 + 登出」
function AccountEntry() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let sub = null
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null)
    }).catch(() => {})
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => { sub?.unsubscribe?.() }
  }, [])

  const logout = async () => {
    try { await supabase.auth.signOut() } catch (e) { /* 忽略 */ }
    window.location.href = '/'
  }

  if (user) {
    return (
      <div className={style['account-card']}>
        {user.email}
        <span className={style['card-desc']}>已登录 · <a className={style['logout-link']} href="#" onClick={(e) => { e.preventDefault(); logout() }}>退出登录</a></span>
      </div>
    )
  }
  return (
    <Link href="/login" className={style['account-card']}>
      登录
      <span className={style['card-desc']}>登录后使用完整功能</span>
    </Link>
  )
}

// 主页 / 导航页
export default function Home() {
  return (
    <div className={style.page}>
      <h1 className={style.title}>股票工具</h1>
      <nav className={style.nav}>
       
        <Link href="/contractor" className={`${style.card} ${style['card-contractor']}`}>
          查找施工方
          <span className={style['card-desc']}>搜索施工方、详情、报价与客户</span>
        </Link>
        <Link href="/case" className={`${style.card} ${style['card-case']}`}>
          案例模块
          <span className={style['card-desc']}>案例列表、搜索、我的资料、回收站</span>
        </Link>
        <Link href="/note" className={`${style.card} ${style['card-note']}`}>
          编程笔记
          <span className={style['card-desc']}>记录编程技巧，复制与演示代码</span>
        </Link>
        <Link href="/sync-center" className={`${style.card} ${style['card-sync']}`}>
          数据同步中心
          <span className={style['card-desc']}>从 WPS 更新案例/客户/施工方/报价数据</span>
        </Link>
				<Link href="/stock" className={`${style.card} ${style['card-stock']}`}>
				  股票行情与 K 线
				  <span className={style['card-desc']}>个股行情、K线、均线</span>
				</Link>
				<Link href="/data" className={`${style.card} ${style['card-data']}`}>
				  大数据流式加载
				  <span className={style['card-desc']}>5000 条数据边接收边渲染</span>
				</Link>
        <AccountEntry />
      </nav>
    </div>
  )
}
