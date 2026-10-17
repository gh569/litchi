import { useEffect, useRef, useState } from 'preact/hooks'
import * as echarts from 'echarts/core'
import { CandlestickChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  TitleComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  CandlestickChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  TitleComponent,
  CanvasRenderer
])

export default function StockKline({ code }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code || !containerRef.current) return

    let disposed = false
    setLoading(true)
    setError('')

    async function load() {
      try {
        const res = await fetch(`/api/stock/kline?code=${encodeURIComponent(code)}&klt=101&lmt=120`)
        const json = await res.json()

        if (disposed) return

        if (json.code !== 200 || !json.data?.length) {
          setError(json.message || '未获取到K线数据')
          return
        }

        const data = json.data

        const dates = data.map((d) => d.date)
        const values = data.map((d) => [d.open, d.close, d.low, d.high])
        const ma5 = calcMA(data, 5)
        const ma10 = calcMA(data, 10)
        const ma20 = calcMA(data, 20)

        if (!chartRef.current) {
          chartRef.current = echarts.init(containerRef.current)
        }

        chartRef.current.setOption({
          title: { text: `${code} 日K` },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: dates },
          yAxis: { scale: true },
          dataZoom: [{ type: 'inside' }, { type: 'slider' }],
          series: [
            {
              type: 'candlestick',
              data: values
            },
            {
              type: 'line',
              name: 'MA5',
              data: ma5,
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 1 }
            },
            {
              type: 'line',
              name: 'MA10',
              data: ma10,
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 1 }
            },
            {
              type: 'line',
              name: 'MA20',
              data: ma20,
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 1 }
            }
          ]
        })
      } catch {
        if (!disposed) setError('K线数据请求失败')
      } finally {
        if (!disposed) setLoading(false)
      }
    }

    load()

    return () => {
      disposed = true
      if (chartRef.current) {
        chartRef.current.dispose()
        chartRef.current = null
      }
    }
  }, [code])

  return (
    <div>
      {loading && <p>K线加载中...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div
        ref={containerRef}
        style={{ width: '100%', height: 420 }}
      />
    </div>
  )
}

function calcMA(data, n) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) {
      result.push(null)
      continue
    }
    let sum = 0
    for (let j = 0; j < n; j++) {
      sum += data[i - j].close
    }
    result.push(+(sum / n).toFixed(2))
  }
  return result
}