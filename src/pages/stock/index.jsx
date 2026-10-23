import { useState } from 'preact/hooks'
import StockQuote from '../../components/stock-quote'
import StockKline from '../../components/stock-kline'
import style from './index.module.css'

const STOCKS = [
  { code: '600519.SH', name: '贵州茅台' },
  { code: '000001.SZ', name: '平安银行' },
  { code: '00700.HK', name: '腾讯控股' }
]

export default function StockPage() {
  // 由页面统一维护当前选中的股票代码，行情和 K 线共用一份
  const [code, setCode] = useState('600519.SH')
  const [input, setInput] = useState('')

  const select = (c) => {
    const t = String(c || '').trim().toUpperCase()
    if (!t) return
    setCode(t)
    setInput('')
  }

  return (
    <div className={style.page}>
      <div>
        {STOCKS.map((s) => (
          <button key={s.code} onClick={() => select(s.code)}>
            {s.name}
          </button>
        ))}
      </div>

      <div className={style.searchRow}>
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
