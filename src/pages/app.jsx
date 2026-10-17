import { useState } from 'preact/hooks'
import StockQuote from '../components/stock-quote'
import StockKline from '../components/stock-kline'

const STOCKS = [
  { code: '600519.SH', name: '贵州茅台' },
  { code: '000001.SZ', name: '平安银行' },
  { code: '00700.HK', name: '腾讯控股' }
]

export default function App() {
  // 统一由 App 维护当前选中的股票代码，行情和 K 线共用一份
  const [code, setCode] = useState('600519.SH')
  const [input, setInput] = useState('')

  const select = (c) => {
    const t = String(c || '').trim().toUpperCase()
    if (!t) return
    setCode(t)
    setInput('')
  }

  return (
    <div>
      <h1>股票</h1>

      <div>
        {STOCKS.map((s) => (
          <button key={s.code} onClick={() => select(s.code)}>
            {s.name}
          </button>
        ))}
      </div>

      <div>
        <input
          value={input}
          onInput={(e) => setInput(e.target.value)}
          placeholder="例如 600519.SH / 00700.HK"
        />
        <button onClick={() => select(input)}>查询</button>
      </div>

      <StockQuote code={code} />
      <StockKline code={code} />
    </div>
  )
}
