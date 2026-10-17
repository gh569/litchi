import { useEffect, useState } from 'preact/hooks'

function fmt(v, unit) {
  if (v == null || v === '-') return '-'
  return (typeof v === 'number' ? Number(v).toLocaleString('zh-CN') : v) + (unit || '')
}

// 单个指标卡片：标签 + 值
function Metric({ label, value, unit, color }) {
  return (
    <div style={{ background: '#f7f8fa', borderRadius: 6, padding: '8px 10px', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: color || '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {fmt(value, unit)}
      </div>
    </div>
  )
}

export default function StockQuote({ code }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!code) return
    let disposed = false

    async function load() {
      setLoading(true)
      setError('')
      setData(null)
      try {
        const res = await fetch(`/api/stock/quote?code=${encodeURIComponent(code)}`)
        const json = await res.json()
        if (disposed) return
        if (json.code !== 200) {
          setError(json.message || '获取失败')
          return
        }
        setData(json.data)
      } catch (err) {
        if (!disposed) setError('请求失败')
      } finally {
        if (!disposed) setLoading(false)
      }
    }

    load()
    return () => { disposed = true }
  }, [code])

  // 涨跌着色：A股/港股习惯红涨绿跌
  const trend = Number(data?.changePercent)
  const trendColor = trend > 0 ? '#e03131' : trend < 0 ? '#2f9e44' : '#333'

  // 数据是否有效：核心字段（最新价/代码/名称）必须有值才算有效行情
  const hasValid = data && data.price != null && data.price !== '-' && data.code != null

  return (
    <div>
      <h2 style={{ fontSize: 18, margin: '14px 0 8px' }}>
        东方财富行情
        {data?.name ? ` · ${data.name}${data.code ? ` (${data.code})` : ''}` : ''}
      </h2>

      {loading && <p>查询中...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {data && hasValid && (
        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            数据来源：{data.source === 'tencent' ? '腾讯行情（东方财富不可用）' : '东方财富'}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 8,
          }}>
            <Metric label="最新价" value={data.price} color={trendColor} />
            <Metric label="涨跌幅" value={data.changePercent} unit="%" color={trendColor} />
            <Metric label="涨跌额" value={data.changeAmount} color={trendColor} />
            <Metric label="今开" value={data.open} />
            <Metric label="最高" value={data.high} color={trendColor} />
            <Metric label="最低" value={data.low} color={trendColor} />
            <Metric label="昨收" value={data.close} />
            <Metric label="成交量" value={data.volume} />
            <Metric label="成交额" value={data.amount} />
            <Metric label="换手率" value={data.turnoverRate} unit="%" />
            <Metric label="振幅" value={data.amplitude} unit="%" />
            <Metric label="市盈率(动)" value={data.pe} />
            <Metric label="市净率" value={data.pb} />
            <Metric label="总市值" value={data.totalMarketValue} />
            <Metric label="流通市值" value={data.circulatingMarketValue} />
          </div>
        </div>
      )}

      {data && !hasValid && <p style={{ color: '#c0392b' }}>东方财富暂无有效行情，正在切换数据源…</p>}
    </div>
  )
}
