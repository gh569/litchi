import { useState } from 'preact/hooks'
import StockQuote from '../components/stock-quote'
import StockKline from '../components/stock-kline'

export default function App() {
  const [code, setCode] = useState('600519.SH')

  return (
    <div>
      <h1>Preact + Cloudflare Workers</h1>

      <div>
        <button onClick={() => setCode('600519.SH')}>贵州茅台</button>
        <button onClick={() => setCode('000001.SZ')}>平安银行</button>
        <button onClick={() => setCode('00700.HK')}>腾讯控股</button>
      </div>

      <StockQuote />
      <StockKline code={code} />
    </div>
  )
}