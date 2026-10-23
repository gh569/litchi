import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import style from './index.module.css'

const SHEETS = [
  { key: '施工方', label: '施工方', desc: '搜索、详情主表' },
  { key: '客户', label: '客户', desc: '各施工方的客户记录' },
  { key: '报价', label: '报价', desc: '报价与合同建议' },
]

export default function Sync() {
  const [phase, setPhase] = useState('idle') // idle | syncing | done | error
  const [busy, setBusy] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function runSync(sheet) {
    setBusy(sheet || '全部')
    setPhase('syncing')
    setError(null)
    setResult(null)
    try {
      const url = '/api/sync' + (sheet ? '?sheet=' + encodeURIComponent(sheet) : '')
      const res = await fetch(url)
      const data = await res.json()
      if (data.error || !res.ok) {
        setPhase('error')
        setError(data.error || 'HTTP ' + res.status)
        return
      }
      setResult(data)
      setPhase('done')
    } catch (e) {
      setPhase('error')
      setError(e.message)
    }
  }

  const counts = result ? Object.entries(result).filter(([k]) => k !== 'time') : []
  const isSyncing = phase === 'syncing'

  return (
    <div className={style.page}>
      <Link href="/" className={style.back}>← 返回</Link>
      <h1 className={style.title}>数据同步</h1>
      <p className={style.desc}>
        从 WPS(金山文档) 拉取施工方/客户/报价数据，写入 Cloudflare KV，供「查找施工方」页面使用。
        后期数据更新时，在这里手动点一次同步即可。
      </p>

      <button
        onClick={() => runSync()}
        disabled={isSyncing}
        className={`${style['btn-all']} ${isSyncing ? style['btn-disabled'] : ''}`}
      >
        {isSyncing && busy === '全部' ? '同步中…' : '同步全部数据'}
      </button>

      <div className={style['btn-row']}>
        {SHEETS.map((s) => (
          <button
            key={s.key}
            onClick={() => runSync(s.key)}
            disabled={isSyncing}
            className={`${style['btn-sheet']} ${isSyncing && busy === s.key ? style['btn-sheet-active'] : ''}`}
          >
            {isSyncing && busy === s.key ? '同步中…' : s.label}
          </button>
        ))}
      </div>
      <div className={style['desc-row']}>
        {SHEETS.map((s) => (
          <div key={s.key} className={style['sheet-desc']}>{s.desc}</div>
        ))}
      </div>

      {isSyncing && (
        <div className={style['syncing-banner']}>
          正在同步{busy === '全部' ? '全部数据' : busy}…
        </div>
      )}

      {phase === 'done' && result && (
        <div className={style['result-box']}>
          <div className={style['result-header']}>
            {busy === '全部' ? '全部同步完成' : `「${busy}」同步完成`}（{new Date(result.time).toLocaleString()}）
          </div>
          {counts.map(([k, v]) => (
            <div key={k} className={style['result-row']}>
              <span className={style['result-key']}>{k}</span>
              {v.ok
                ? <span className={style['result-ok']}>{v.count} 条 ✓</span>
                : <span className={style['result-fail']}>同步失败</span>}
            </div>
          ))}
        </div>
      )}

      {phase === 'error' && (
        <div className={style['error-box']}>
          同步失败：{error}
          <div className={style['error-hint']}>
            线上需先绑定 WPS_KV 并配置 WPS_TOKEN 环境变量。
          </div>
        </div>
      )}
    </div>
  )
}
