import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'

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
      const url = '/api/wps-sync' + (sheet ? '?sheet=' + encodeURIComponent(sheet) : '')
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

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>← 返回</Link>
      <h1 style={{ fontSize: 22, margin: '12px 0 4px' }}>数据同步</h1>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>
        从 WPS(金山文档) 拉取施工方/客户/报价数据，写入 Cloudflare KV，供「查找施工方」页面使用。
        后期数据更新时，在这里手动点一次同步即可。
      </p>

      <button
        onClick={() => runSync()}
        disabled={phase === 'syncing'}
        style={{
          width: '100%', padding: '14px', fontSize: 16, fontWeight: 600, borderRadius: 10,
          border: 'none', cursor: 'pointer', background: '#1f6feb', color: '#fff',
          opacity: phase === 'syncing' ? 0.6 : 1,
        }}
      >
        {phase === 'syncing' && busy === '全部' ? '同步中…' : '同步全部数据'}
      </button>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {SHEETS.map((s) => (
          <button
            key={s.key}
            onClick={() => runSync(s.key)}
            disabled={phase === 'syncing'}
            style={{
              flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #d6e4ff',
              cursor: 'pointer', background: phase === 'syncing' && busy === s.key ? '#dbe7ff' : '#f6f9ff',
              color: '#1f6feb', fontSize: 14,
            }}
          >
            {phase === 'syncing' && busy === s.key ? '同步中…' : s.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {SHEETS.map((s) => (
          <div key={s.key} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#999' }}>{s.desc}</div>
        ))}
      </div>

      {phase === 'syncing' && (
        <div style={{ marginTop: 16, padding: 14, background: '#f0f4ff', borderRadius: 10, color: '#666', fontSize: 14 }}>
          正在同步{busy === '全部' ? '全部数据' : busy}…
        </div>
      )}

      {phase === 'done' && result && (
        <div style={{ marginTop: 16, borderRadius: 10, border: '1px solid #c6f6d5', background: '#f0fff4', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #c6f6d5', fontSize: 14, color: '#1a7f37', fontWeight: 600 }}>
            {busy === '全部' ? '全部同步完成' : `「${busy}」同步完成`}（{new Date(result.time).toLocaleString()}）
          </div>
          {counts.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #eee', fontSize: 14 }}>
              <span style={{ color: '#333' }}>{k}</span>
              {v.ok
                ? <span style={{ color: '#1a7f37', fontWeight: 600 }}>{v.count} 条 ✓</span>
                : <span style={{ color: '#d93025', fontWeight: 600 }}>同步失败</span>}
            </div>
          ))}
        </div>
      )}

      {phase === 'error' && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, border: '1px solid #f5c2c0', background: '#fff5f5', color: '#d93025', fontSize: 14 }}>
          同步失败：{error}
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            线上需先绑定 WPS_KV 并配置 WPS_TOKEN 环境变量。
          </div>
        </div>
      )}
    </div>
  )
}
