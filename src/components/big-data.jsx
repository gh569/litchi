import { useRef, useState } from 'preact/hooks'

// 大数据边接收边渲染示例：流式拉取 5000 条 NDJSON，
// 每收到一批就追加渲染一批到列表（不等全部返回），并实时显示进度。
// 相比"一次性返回再渲染"：不会白屏、不阻塞主线程，列表随接收实时增长。
export default function BigDataStream() {
  const [rows, setRows] = useState([]) // 已渲染的行
  const [received, setReceived] = useState(0) // 已渲染条数
  const [running, setRunning] = useState(false)
  const listRef = useRef(null)

  const TOTAL = 5000

  const start = async () => {
    if (running) return
    setRows([])
    setReceived(0)
    setRunning(true)
    let count = 0
    const pending = [] // 待渲染缓冲

    // 每 16ms 从缓冲取 300 条渲染一次，避免一次渲染 5000 条 DOM 阻塞主线程
    const timer = setInterval(() => {
      if (!pending.length) return
      const batch = pending.splice(0, 300)
      setRows((prev) => prev.concat(batch))
      setReceived((n) => n + batch.length)
      // 自动滚到底部，让"增长"可见
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    }, 16)

    try {
      const res = await fetch('/api/big-data')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        // 按换行切出完整行，逐条 parse 进缓冲
        let nl
        while ((nl = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, nl).trim()
          buf = buf.slice(nl + 1)
          if (!line) continue
          pending.push(JSON.parse(line))
          count++
        }
      }
      // 等定时器把剩余缓冲放完
      while (pending.length) await new Promise((r) => setTimeout(r, 16))
    } catch (e) {
      setRows((prev) => prev.concat([{ name: '请求失败：' + (e && e.message) }]))
    } finally {
      clearInterval(timer)
      setRunning(false)
    }
  }

  return (
    <div style={{ marginTop: 28, borderTop: '1px solid #eee', paddingTop: 20 }}>
      <h3>大数据流式渲染示例（边接收边渲染，共 {TOTAL} 条）</h3>
      <div style={{ marginBottom: 8 }}>
        <button onClick={start} disabled={running}>
          {running ? '加载中…' : '开始加载'}
        </button>
        <span style={{ marginLeft: 12 }}>
          已渲染：{received} / {TOTAL}
        </span>
      </div>
      <div
        ref={listRef}
        style={{
          height: 360,
          overflowY: 'auto',
          background: '#f7f7f7',
          borderRadius: 8,
          border: '1px solid #eee',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#eef1f5' }}>
            <tr>
              <th style={th}>#</th>
              <th style={th}>代码</th>
              <th style={th}>名称</th>
              <th style={th}>最新价</th>
              <th style={th}>成交量</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.idx}>
                <td style={td}>{r.idx}</td>
                <td style={td}>{r.code}</td>
                <td style={td}>{r.name}</td>
                <td style={td}>{r.close}</td>
                <td style={td}>{r.vol}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div style={{ padding: 16, color: '#888' }}>点击按钮，数据会一边接收一边逐批出现…</div>}
      </div>
    </div>
  )
}

const th = { border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left' }
const td = { border: '1px solid #eee', padding: '4px 10px' }
