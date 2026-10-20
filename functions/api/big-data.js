// 大数据流式接口：NDJSON 分批返回 5000 条记录，演示"边接收边渲染"
// 访问：/api/big-data
// 数据量很大时，若一次性返回，前端要等全部 parse + 一次性渲染，会白屏卡顿；
// 这里分批 enqueue（每批 250 条，间隔 40ms），前端可边收边渲染，列表实时增长。

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const TOTAL = 5000
const BATCH = 250

export async function onRequestGet() {
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < TOTAL; i += BATCH) {
        let chunk = ''
        for (let j = 0; j < BATCH && i + j < TOTAL; j++) {
          const idx = i + j
          chunk +=
            JSON.stringify({
              idx,
              code: String(600000 + (idx % 2000)),
              name: '样例股' + idx,
              close: +(10 + Math.random() * 90).toFixed(2),
              vol: Math.floor(Math.random() * 10000),
            }) + '\n' // 每行一条，NDJSON
        }
        controller.enqueue(enc.encode(chunk))
        await sleep(40)
      }
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}
