import { useState, useEffect } from 'preact/hooks'
import { useParams, Link } from 'wouter-preact'
import style from './_form.module.css'

const LANGS = ['javascript', 'html', 'css', 'python', 'sql', 'shell', 'json', 'text']

export default function NoteForm({ mode }) {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [codes, setCodes] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode === 'edit' && id && id !== ':id') {
      fetch(`/api/note?id=${encodeURIComponent(id)}`)
        .then((r) => r.json())
        .then((n) => {
          if (n && n.id) {
            setTitle(n.title || '')
            setCategory(n.category || '')
            setContent(n.content || '')
            setCodes(n.codes || [])
          }
        })
        .catch(() => {})
    }
  }, [mode, id])

  const addCode = () => setCodes([...codes, { lang: 'javascript', title: '', code: '' }])
  const updateCode = (i, patch) => setCodes(codes.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const removeCode = (i) => setCodes(codes.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!title.trim()) { setError('请输入标题'); return }
    setSaving(true)
    setError('')
    const payload = { title, category, content, codes }
    if (mode === 'edit') payload.id = id
    try {
      const r = await fetch('/api/note', {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || '保存失败'); setSaving(false); return }
      window.location.href = `/note/detail/${encodeURIComponent(d.id)}`
    } catch (e) {
      setError('网络错误，请稍后重试')
      setSaving(false)
    }
  }

  return (
    <div className={style.page}>
      <div className={style.bar}>
        <Link href="/note" className={style.back}>← 返回</Link>
        <h1 className={style.title}>{mode === 'edit' ? '编辑笔记' : '新增笔记'}</h1>
      </div>

      <label className={style.label}>标题</label>
      <input className={style.input} value={title} onInput={(e) => setTitle(e.target.value)} placeholder="笔记标题" />

      <label className={style.label}>分类（可选）</label>
      <input className={style.input} value={category} onInput={(e) => setCategory(e.target.value)} placeholder="如：前端 / 后端 / 工具" />

      <label className={style.label}>正文（可选，支持换行）</label>
      <textarea className={style.textarea} value={content} onInput={(e) => setContent(e.target.value)} rows={5} placeholder="记录笔记正文…" />

      <div className={style.codesHeader}>
        <span className={style.label}>代码块</span>
        <button className={style.addCodeBtn} onClick={addCode}>＋ 添加代码</button>
      </div>

      {codes.length === 0 && <div className={style.hint}>还没有代码块，点「＋ 添加代码」加入</div>}

      {codes.map((c, i) => (
        <div key={i} className={style.codeBlock}>
          <div className={style.codeBlockBar}>
            <select className={style.langSelect} value={c.lang} onChange={(e) => updateCode(i, { lang: e.target.value })}>
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <input
              className={style.codeTitle}
              value={c.title}
              onInput={(e) => updateCode(i, { title: e.target.value })}
              placeholder="代码片段说明（可选）"
            />
            <button className={style.removeBtn} onClick={() => removeCode(i)}>删除</button>
          </div>
          <textarea
            className={style.codeArea}
            value={c.code}
            onInput={(e) => updateCode(i, { code: e.target.value })}
            rows={8}
            placeholder="粘贴代码…"
            spellcheck={false}
          />
        </div>
      ))}

      {error && <div className={style.error}>{error}</div>}

      <button className={style.saveBtn} onClick={save} disabled={saving}>
        {saving ? '保存中…' : '保存笔记'}
      </button>
    </div>
  )
}
