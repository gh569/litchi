import { useEffect, useState } from 'preact/hooks'

function fmt(v, unit) {
  if (v == null || v === '-') return '-'
  return (typeof v === 'number' ? Number(v).toLocaleString('zh-CN') : v) + (unit || '')
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

  return (
    <div>
      <h2>东方财富行情 {data ? `· ${data.name} (${data.code})` : ''}</h2>

      {loading && <p>查询中...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {data && (
        <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
          数据来源：{data.source === 'tencent' ? '腾讯行情（东方财富不可用）' : '东方财富'}
        </div>
      )}

      {data && (
        <table border="1" cellPadding="8">
          <tbody>
            <tr><td>最新价</td><td style={{ color: trendColor, fontWeight: 'bold' }}>{fmt(data.price)}</td></tr>
            <tr>
              <td>涨跌幅</td>
              <td style={{ color: trendColor }}>
                {fmt(data.changePercent, '%')}（{data.changeAmount != null && Number(data.changeAmount) > 0 ? '+' : ''}{fmt(data.changeAmount)}）
              </td>
            </tr>
            <tr><td>今开</td><td>{fmt(data.open)}</td></tr>
            <tr><td>最高</td><td>{fmt(data.high)}</td></tr>
            <tr><td>最低</td><td>{fmt(data.low)}</td></tr>
            <tr><td>昨收</td><td>{fmt(data.close)}</td></tr>
            <tr><td>成交量</td><td>{fmt(data.volume)}</td></tr>
            <tr><td>成交额</td><td>{fmt(data.amount)}</td></tr>
            <tr><td>换手率</td><td>{fmt(data.turnoverRate, '%')}</td></tr>
            <tr><td>振幅</td><td>{fmt(data.amplitude, '%')}</td></tr>
            <tr><td>市盈率(动)</td><td>{fmt(data.pe)}</td></tr>
            <tr><td>市净率</td><td>{fmt(data.pb)}</td></tr>
            <tr><td>总市值</td><td>{fmt(data.totalMarketValue)}</td></tr>
            <tr><td>流通市值</td><td>{fmt(data.circulatingMarketValue)}</td></tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
