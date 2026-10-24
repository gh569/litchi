import { useState, useEffect } from 'preact/hooks'
import { Link } from 'wouter-preact'
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

  const hardDel = async (n) => {
    if (!window.confirm(`彻底删除「${n.title}」？此操作不可恢复`)) return
    try {
      await fetch(`/api/note?id=${encodeURIComponent(n.id)}&hard=1`, { method: 'DELETE' })
      load()
    } catch (e) { alert('删除失败') }
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
                <button className={style.hardBtn} onClick={() => hardDel(n)}>彻底删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
