import { Link } from 'wouter-preact'

// 主页 / 导航页
export default function Home() {
  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22 }}>股票工具</h1>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
        <Link
          href="/stock"
          style={{
            display: 'block',
            padding: '16px 20px',
            background: '#f0f4ff',
            borderRadius: 10,
            color: '#1f6feb',
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 600,
            border: '1px solid #d6e4ff',
          }}
        >
          股票行情与 K 线
          <span style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 400, marginTop: 4 }}>
            个股行情、K线、均线
          </span>
        </Link>
        <Link
          href="/data"
          style={{
            display: 'block',
            padding: '16px 20px',
            background: '#f0fff4',
            borderRadius: 10,
            color: '#1a7f37',
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 600,
            border: '1px solid #c6f6d5',
          }}
        >
          大数据流式加载
          <span style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 400, marginTop: 4 }}>
            5000 条数据边接收边渲染
          </span>
        </Link>
        <Link
          href="/contractor"
          style={{
            display: 'block',
            padding: '16px 20px',
            background: '#fff8f0',
            borderRadius: 10,
            color: '#b56a1a',
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 600,
            border: '1px solid #ffe0b0',
          }}
        >
          查找施工方
          <span style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 400, marginTop: 4 }}>
            搜索施工方、详情、报价与客户
          </span>
        </Link>
        <Link
          href="/sync"
          style={{
            display: 'block',
            padding: '16px 20px',
            background: '#f0f4ff',
            borderRadius: 10,
            color: '#1f6feb',
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 600,
            border: '1px solid #d6e4ff',
          }}
        >
          数据同步
          <span style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 400, marginTop: 4 }}>
            从 WPS 更新施工方/客户/报价数据
          </span>
        </Link>
      </nav>
    </div>
  )
}
