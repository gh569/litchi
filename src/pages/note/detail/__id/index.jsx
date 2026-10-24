import { useState, useEffect } from 'preact/hooks'
import { useParams, Link } from 'wouter-preact'
import style from './index.module.css'

function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 可在线运行的代码类型
const RUNNABLE = ['html', 'javascript']

// 构造 JS 演示用的 iframe srcdoc：捕获 console 输出与异常到页面
function jsSrcdoc(code) {
  const safeCode = String(code).replace(/<\/script/gi, '<\\/script')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Consolas,Menlo,monospace;padding:14px;margin:0;background:#fff;color:#333;font-size:13px}
pre{white-space:pre-wrap;margin:0}
</style></head><body><pre id="out"></pre>
<script>
const out=[];
const flush=()=>{var el=document.getElementById('out'); if(el) el.textContent=out.join('\\n');};
['log','info','warn','error'].forEach(function(k){
  console[k]=function(){ out.push(Array.prototype.map.call(arguments,function(x){return (typeof x==='object')?JSON.stringify(x):String(x)}).join(' ')); flush(); };
});
window.onerror=function(m,s,l){ out.push('错误: '+m+' (行 '+l+')'); flush(); };
try { (function(){ ${safeCode} })(); } catch(e){ out.push('异常: '+e.message); flush(); }
</script></body></html>`
}

function CodeBlock({ block }) {
  const lang = block.lang || 'text'
  const [copied, setCopied] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [demoMsg, setDemoMsg] = useState('')
  const runnable = RUNNABLE.includes(lang)

  const copy = () => {
    navigator.clipboard
      .writeText(block.code || '')
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
      .catch(() => {})
  }

  const toggleDemo = () => {
    if (!runnable) { setDemoMsg('该语言暂不支持在线演示'); setShowDemo(false); return }
    setDemoMsg('')
    setShowDemo((s) => !s)
  }

  const srcdoc = lang === 'javascript' ? jsSrcdoc(block.code) : block.code

  return (
    <div className={style.codeBlock}>
      <div className={style.codeBar}>
        <span className={style.langTag}>{lang}</span>
        {block.title && <span className={style.codeTitle}>{block.title}</span>}
        <div className={style.codeActions}>
          <button className={style.actionBtn} onClick={copy}>
            {copied ? '✓ 已复制' : '复制'}
          </button>
          <button className={style.actionBtn} onClick={toggleDemo}>
            {showDemo ? '收起演示' : '演示'}
          </button>
        </div>
      </div>
      <pre className={style.code}><code>{block.code}</code></pre>
      {demoMsg && <div className={style.demoMsg}>{demoMsg}</div>}
      {showDemo && runnable && (
        <div className={style.demoBox}>
          <iframe className={style.demoFrame} sandbox="allow-scripts" srcDoc={srcdoc} title="code-demo" />
        </div>
      )}
    </div>
  )
}

export default function NoteDetail() {
  const { id } = useParams()
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || id === ':id') { setError('无效的笔记 ID'); setLoading(false); return }
    fetch(`/api/note?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.id) setNote(d)
        else setError(d.error || '笔记不存在')
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className={style.state}>加载中…</div>
  if (error || !note) return <div className={style.state}>{error || '笔记不存在'}</div>

  return (
    <div className={style.page}>
      <div className={style.bar}>
        <Link href="/note" className={style.back}>← 返回</Link>
        <div className={style.titleRow}>
          <h1 className={style.title}>{note.title}</h1>
          {note.category && <span className={style.tag}>{note.category}</span>}
        </div>
        <Link href={`/note/edit/${encodeURIComponent(note.id)}`} className={style.editBtn}>编辑</Link>
      </div>

      <div className={style.meta}>
        <span>更新时间：{fmtTime(note.updateTime)}</span>
        <span>📄 {(note.codes || []).length} 段代码</span>
      </div>

      {note.content && <div className={style.content}>{note.content}</div>}

      {(note.codes || []).length === 0 ? (
        <div className={style.state}>这条笔记没有代码块</div>
      ) : (
        <div className={style.codes}>
          {note.codes.map((c, i) => <CodeBlock key={i} block={c} />)}
        </div>
      )}
    </div>
  )
}
