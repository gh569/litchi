import { useState } from 'preact/hooks'
import TableHeader from '@com/table-header'
import style from './sync.module.css'

export default function Sync({ sheetName, title }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const click = async () => {
    if (loading) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch(`/api/sync?sheet=${encodeURIComponent(sheetName)}`)
      const data = await res.json()
      if (data.error || !res.ok) {
        setError(data.error || ('HTTP ' + res.status))
      } else {
        setResult(data)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const counts = result ? Object.entries(result).filter(([k]) => k !== 'time') : []

  return (
    <div className={style['page-wrapper']}>
      <TableHeader title={title} showBack onBack={() => history.back()} />
      <div className={style.container}>
        <div className={style.header}>
          <div className={style['icon-box']}>☁️</div>
          <h1 className={style.title}>{title}</h1>
          <p className={style.subtitle}>一键拉取最新记录，保持云端与本地数据一致</p>
        </div>

        <div className={style.card}>
          <div className={style['action-card']}>
            <button
              className={`${style['btn-sync']} ${loading ? style['is-loading'] : ''}`}
              onClick={click}
              disabled={loading}
            >
              <span className={style['btn-content']}>
                {loading ? <span className={style.spinner}></span> : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                )}
                {loading ? '正在同步中...' : '立即同步'}
              </span>
            </button>

            <div className={style['result-area']}>
              {result && (
                <div className={style['diff-wrapper']}>
                  {counts.map(([k, v]) => (
                    <div key={k} className={style['diff-row']}>
                      <span className={style['diff-key']}>{k}</span>
                      {v.ok
                        ? <span className={style['diff-ok']}>{v.count} 条 ✓</span>
                        : <span className={style['diff-err']}>同步失败：{v.error || ''}</span>}
                    </div>
                  ))}
                </div>
              )}
              {error && (
                <div className={style['empty-state']}>
                  <p>同步失败：{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
