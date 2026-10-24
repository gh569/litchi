import { useState, useEffect } from 'preact/hooks'
import { Link } from 'wouter-preact'
import style from './index.module.css'

const pageSize = 50

function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function NoteList() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = async (keyword) => {
    setLoading(true)
    try {
      const url = '/api/note?page=1&pageSize=' + pageSize + (keyword ? '&q=' + encodeURIComponent(keyword) : '')
      const r = await fetch(url)
      const d = await r.json()
      setList(keyword ? d : (d.data || []))
    } catch (e) {
      setList([])
    }
    setLoading(false)
  }

  useEffect(() => { load('') }, [])

  const doSearch = (e) => { e.preventDefault(); load(q.trim()) }

  const del = async (n, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`删除笔记「${n.title}」？可在回收站找回`)) return
    try {
      await fetch(`/api/note?id=${encodeURIComponent(n.id)}`, { method: 'DELETE' })
      load(q.trim())
    } catch (err) {
      alert('删除失败，请稍后重试')
    }
  }

  return (
    <div className={style.page}>
      <div className={style.header}>
        <h1 className={style.title}>编程笔记</h1>
        <div className={style.headerRight}>
          <Link href="/note/recycle-bin" className={style.trashBtn}>🗑 回收站</Link>
          <form className={style.search} onSubmit={doSearch}>
            <input
              className={style.searchInput}
              value={q}
              onInput={(e) => setQ(e.target.value)}
              placeholder="搜索标题/正文/代码…"
            />
            <button className={style.searchBtn} type="submit">搜索</button>
          </form>
          <Link href="/note/new" className={style.addBtn}>＋ 新增</Link>
        </div>
      </div>

      {loading ? (
        <div className={style.empty}>加载中…</div>
      ) : list.length === 0 ? (
        <div className={style.empty}>还没有笔记，点右上角「＋ 新增」记录一条吧</div>
      ) : (
        <div className={style.list}>
          {list.map((n) => (
            <div key={n.id} className={style.card}>
              <Link href={`/note/detail/${encodeURIComponent(n.id)}`} className={style.cardMain}>
                <div className={style.cardTitle}>
                  {n.title}
                  {n.category && <span className={style.tag}>{n.category}</span>}
                </div>
                {n.content && <div className={style.cardDesc}>{n.content.slice(0, 80)}</div>}
                <div className={style.cardMeta}>
                  <span>📄 {(n.codes || []).length} 段代码</span>
                  <span>{fmtTime(n.updateTime)}</span>
                </div>
              </Link>
              <button className={style.delBtn} title="删除" onClick={(e) => del(n, e)}>删除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
