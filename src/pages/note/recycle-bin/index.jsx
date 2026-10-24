import { useState, useEffect } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { supabase } from '../../../lib/supabase'
import style from './index.module.css'

function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function RecycleBin() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)
  const [authNote, setAuthNote] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authErr, setAuthErr] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/note?recycle=1')
      setList(await r.json())
    } catch (e) {
      setList([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const restore = async (n) => {
    try {
      await fetch('/api/note', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id, restore: true }),
      })
      load()
    } catch (e) { alert('恢复失败') }
  }

  const openAuth = (n) => {
    setAuthNote(n)
    setEmail('')
    setPassword('')
    setAuthErr('')
    setAuthOpen(true)
  }

  const confirmDel = async () => {
    if (!email.trim() || !password) { setAuthErr('请输入邮箱和密码'); return }
    setDeleting(true)
    setAuthErr('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) { setAuthErr('邮箱或密码错误，无法删除'); setDeleting(false); return }
      await fetch(`/api/note?id=${encodeURIComponent(authNote.id)}&hard=1`, { method: 'DELETE' })
      setDeleting(false)
      setAuthOpen(false)
      setAuthNote(null)
      load()
    } catch (e) {
      setAuthErr('验证失败，请稍后重试')
      setDeleting(false)
    }
  }

  return (
    <div className={style.page}>
      <div className={style.bar}>
        <Link href="/note" className={style.back}>← 返回笔记</Link>
        <h1 className={style.title}>回收站</h1>
      </div>

      {loading ? (
        <div className={style.empty}>加载中…</div>
      ) : list.length === 0 ? (
        <div className={style.empty}>回收站是空的</div>
      ) : (
        <div className={style.list}>
          {list.map((n) => (
            <div key={n.id} className={style.item}>
              <div className={style.itemMain}>
                <div className={style.itemTitle}>
                  {n.title}
                  {n.category && <span className={style.tag}>{n.category}</span>}
                </div>
                <div className={style.itemMeta}>
                  <span>删除于 {fmtTime(n.deletedAt)}</span>
                  <span>📄 {(n.codes || []).length} 段代码</span>
                </div>
              </div>
              <div className={style.actions}>
                <button className={style.restoreBtn} onClick={() => restore(n)}>恢复</button>
                <button className={style.hardBtn} onClick={() => openAuth(n)}>彻底删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {authOpen && (
        <div className={style.overlay} onClick={(e) => { if (e.target === e.currentTarget && !deleting) setAuthOpen(false) }}>
          <div className={style.dialog}>
            <h3 className={style.dialogTitle}>确认彻底删除</h3>
            <p className={style.dialogDesc}>删除「{authNote && authNote.title}」将无法恢复。请输入账号密码确认。</p>
            <input
              className={style.input}
              type="email"
              value={email}
              onInput={(e) => setEmail(e.target.value)}
              placeholder="登录邮箱"
              autoComplete="username"
            />
            <input
              className={style.input}
              type="password"
              value={password}
              onInput={(e) => setPassword(e.target.value)}
              placeholder="密码"
              autoComplete="current-password"
            />
            {authErr && <div className={style.err}>{authErr}</div>}
            <div className={style.dialogBtns}>
              <button className={style.cancelBtn} onClick={() => !deleting && setAuthOpen(false)} disabled={deleting}>取消</button>
              <button className={style.confirmBtn} onClick={confirmDel} disabled={deleting}>
                {deleting ? '验证删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
