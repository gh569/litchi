import { useState } from 'preact/hooks'

const STOCKS = [
  { code: '600519.SH', name: '贵州茅台' },
  { code: '000001.SZ', name: '平安银行' },
  { code: '00700.HK', name: '腾讯控股' }
]

function fmt(v, unit) {
  if (v == null || v === '-') return '-'
  if (unit) return v + unit
  return v
}

export default function StockQuote() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const fetchQuote = async (targetCode) => {
    const c = targetCode || code
    if (!c) return

    setLoading(true)
    setError('')
    setData(null)

    try {
      const res = await fetch(`/api/stock/quote?code=${encodeURIComponent(c)}`)
      const json = await res.json()

      if (json.code !== 200) {
        setError(json.message || '获取失败')
        return
      }

      setData(json.data)
    } catch (err) {
      setError('请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>东方财富行情</h2>

      <div>
        {STOCKS.map((s) => (
          <button key={s.code} onClick={() => { setCode(s.code); fetchQuote(s.code) }}>
            {s.name}
          </button>
        ))}
      </div>

      <div>
        <input
          value={code}
          onInput={(e) => setCode(e.target.value)}
          placeholder="例如 600519.SH"
        />
        <button onClick={() => fetchQuote()} disabled={loading}>
          {loading ? '查询中...' : '查询'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {data && (
        <table border="1" cellPadding="8">
          <tbody>
            <tr><td>代码</td><td>{data.code}</td></tr>
            <tr><td>名称</td><td>{data.name}</td></tr>
            <tr><td>最新价</td><td>{fmt(data.price)}</td></tr>
            <tr><td>今开</td><td>{fmt(data.open)}</td></tr>
            <tr><td>最高</td><td>{fmt(data.high)}</td></tr>
            <tr><td>最低</td><td>{fmt(data.low)}</td></tr>
            <tr><td>昨收</td><td>{fmt(data.close)}</td></tr>
            <tr><td>成交量</td><td>{fmt(data.volume)}</td></tr>
            <tr><td>成交额</td><td>{fmt(data.amount)}</td></tr>
            <tr><td>涨跌幅</td><td>{fmt(data.changePercent, '%')}</td></tr>
            <tr><td>涨跌额</td><td>{fmt(data.changeAmount)}</td></tr>
            <tr><td>换手率</td><td>{fmt(data.turnoverRate, '%')}</td></tr>
            <tr><td>市盈率</td><td>{fmt(data.pe)}</td></tr>
            <tr><td>市净率</td><td>{fmt(data.pb)}</td></tr>
            <tr><td>总市值</td><td>{fmt(data.totalMarketValue)}</td></tr>
          </tbody>
        </table>
      )}
    </div>
  )
}