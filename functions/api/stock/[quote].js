// 行情接口：东方财富为主源，失败自动回退腾讯（qt.gtimg.cn）
// 统一输出结构，source 标注数据来源

// ---------- 东方财富 ----------
// 字段（qt/stock/get, fltt=2）：f57代码 f58名称 f43最新价 f46今开 f44最高 f45最低 f60昨收
//   f47成交量 f48成交额 f168换手率 f169涨跌额 f170涨跌幅 f171振幅 f162市盈率(动) f167市净率 f116总市值 f117流通市值
const EM_FIELDS = 'f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f117,f162,f167,f168,f169,f170,f171';
const EM_HOSTS = ['push2.eastmoney.com', 'push2delay.eastmoney.com'];
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Referer': 'https://quote.eastmoney.com/',
  'Origin': 'https://quote.eastmoney.com',
  'Accept': 'application/json, text/plain, */*',
};

// 代码 -> 东方财富 secid
function toEastmoneySecid(c) {
  if (!c) return null;
  const u = String(c).toUpperCase().trim();
  if (u.endsWith('.SH')) return '1.' + u.slice(0, -3);
  if (u.endsWith('.SZ') || u.endsWith('.BJ')) return '0.' + u.slice(0, -3);
  if (u.endsWith('.HK')) return '116.' + u.slice(0, -3).padStart(5, '0');
  if (u.endsWith('.US')) return '105.' + u.slice(0, -3).padStart(5, '0');
  if (/^\d{6}$/.test(u)) return '1.' + u;
  return null;
}

async function fromEastmoney(secid) {
  for (const host of EM_HOSTS) {
    try {
      const api = `https://${host}/api/qt/stock/get?secid=${secid}&fields=${EM_FIELDS}&fltt=2&invt=2`;
      const res = await fetch(api, { headers: BROWSER_HEADERS });
      if (!res.ok) continue;
      const j = await res.json();
      if (!j.data) continue;
      const d = j.data;
      return {
        code: d.f57, name: d.f58, price: d.f43, open: d.f46, high: d.f44, low: d.f45, close: d.f60,
        volume: d.f47, amount: d.f48, changePercent: d.f170, changeAmount: d.f169,
        turnoverRate: d.f168, amplitude: d.f171, pe: d.f162, pb: d.f167,
        totalMarketValue: d.f116, circulatingMarketValue: d.f117,
      };
    } catch (_) { /* 换下一个域名 */ }
  }
  return null;
}

// ---------- 腾讯兜底 ----------
// 接口 qt.gtimg.cn/q=前缀+代码，返回 GBK 编码的 "v_xxx=\"...\""，字段用 ~ 分隔
// 字段索引：1名称 2代码 3最新价 4昨收 5今开 6成交量(手) 31涨跌额 32涨跌幅 33最高 34最低
//          37成交额(万) 38换手率 39市盈率 43振幅 44流通市值(亿) 45总市值(亿) 46市净率
function toTencentCode(c) {
  if (!c) return null;
  const u = String(c).toUpperCase().trim();
  if (u.endsWith('.SH')) return 'sh' + u.slice(0, -3);
  if (u.endsWith('.SZ')) return 'sz' + u.slice(0, -3);
  if (u.endsWith('.BJ')) return 'bj' + u.slice(0, -3);
  if (u.endsWith('.HK')) return 'hk' + u.slice(0, -3);
  if (u.endsWith('.US')) return 'us' + u.slice(0, -3);
  if (/^\d{6}$/.test(u)) return 'sh' + u;
  return null;
}

const num = (v) => {
  if (v == null || v === '' || v === '-') return null;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return Number.isNaN(n) ? null : n;
};

async function fromTencent(code) {
  const q = toTencentCode(code);
  if (!q) return null;
  try {
    const res = await fetch(`https://qt.gtimg.cn/q=${q}`, {
      headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], 'Referer': 'https://gu.qq.com/' },
    });
    if (!res.ok) return null;
    // 腾讯返回 GBK；workerd/Node 均支持 gbk，失败时退回 UTF-8
    let text;
    try {
      text = new TextDecoder('gbk').decode(await res.arrayBuffer());
    } catch (_) {
      text = await res.text();
    }
    const m = text.match(/="(.*)"/);
    if (!m) return null;
    const p = m[1].split('~');
    if (p.length < 47) return null;
    return {
      code: p[2], name: p[1], price: num(p[3]), open: num(p[5]), high: num(p[33]), low: num(p[34]), close: num(p[4]),
      volume: num(p[6]), amount: num(p[37]) != null ? num(p[37]) * 10000 : null,
      changePercent: num(p[32]), changeAmount: num(p[31]),
      turnoverRate: num(p[38]), amplitude: num(p[43]), pe: num(p[39]), pb: num(p[46]),
      totalMarketValue: num(p[45]) != null ? num(p[45]) * 1e8 : null,
      circulatingMarketValue: num(p[44]) != null ? num(p[44]) * 1e8 : null,
    };
  } catch (_) {
    return null;
  }
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  const secid = toEastmoneySecid(code);
  const tcode = toTencentCode(code);
  if (!secid && !tcode) {
    return new Response(JSON.stringify({ code: 400, message: 'code 不支持，示例：600519.SH / 000001.SZ / 00700.HK' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 东方财富主源
  if (secid) {
    const d = await fromEastmoney(secid);
    if (d) {
      return new Response(JSON.stringify({ code: 200, source: 'eastmoney', data: { ...d, secid } }), { headers: { 'Content-Type': 'application/json' } });
    }
  }

  // 腾讯兜底
  const td = await fromTencent(code);
  if (td) {
    return new Response(JSON.stringify({ code: 200, source: 'tencent', data: td }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ code: 502, message: '东方财富与腾讯行情均请求失败' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
}
