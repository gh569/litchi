// 行情接口：东方财富为主源，失败自动回退腾讯（qt.gtimg.cn）
// 为降低被东财限流/封禁的概率，模仿 Python 脚本的行为：
//   1) 用反爬较松的 push2delay（延迟行情）为主源，push2 实时兜底
//   2) 通过 Cloudflare Cache API 缓存结果（同一股票 20 秒内只回源一次，天然降频）
//   3) 补全浏览器请求头
//   4) 带超时 + 重试退避
//   5) 最终腾讯兜底，保证有数据

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Referer': 'https://quote.eastmoney.com/',
  'Origin': 'https://quote.eastmoney.com',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
};

// 带超时 + 重试退避的 fetch：返回原始字节（ArrayBuffer），由调用方决定编码解码
async function fetchWithRetry(urls, headers, { timeout = 8000, retries = 2 } = {}) {
  for (const url of urls) {
    for (let i = 0; i <= retries; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      try {
        const res = await fetch(url, { headers, signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        return await res.arrayBuffer();
      } catch (_) {
        clearTimeout(timer);
        if (i < retries) await new Promise((r) => setTimeout(r, 300 * (i + 1))); // 退避
      }
    }
  }
  return null;
}

// ---------- 东方财富 ----------
// 字段（qt/stock/get, fltt=2）：f57代码 f58名称 f43最新价 f46今开 f44最高 f45最低 f60昨收
//   f47成交量 f48成交额 f168换手率 f169涨跌额 f170涨跌幅 f171振幅 f162市盈率(动) f167市净率 f116总市值 f117流通市值
const EM_FIELDS = 'f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f117,f162,f167,f168,f169,f170,f171';
// 域名策略：push2his 是历史K线域名，对数据中心/Cloudflare IP 宽容（K线已验证能通），
// 因此行情也优先走它；push2delay 延迟行情次之；push2 实时接口最后兜底。
const EM_HOSTS = ['push2his.eastmoney.com', 'push2delay.eastmoney.com', 'push2.eastmoney.com'];

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
  const urls = EM_HOSTS.map((h) => `https://${h}/api/qt/stock/get?secid=${secid}&fields=${EM_FIELDS}&fltt=2&invt=2`);
  const buf = await fetchWithRetry(urls, BROWSER_HEADERS);
  if (buf == null) return null;
  let j;
  try { j = JSON.parse(new TextDecoder('utf-8').decode(buf)); } catch (_) { return null; }
  if (!j || !j.data) return null;
  const d = j.data;
  // 东财限流/停牌/异常时可能返回 data 存在但字段为空，此时视为无效，交给腾讯兜底
  if (d.f43 == null || d.f43 === '-' || d.f57 == null) return null;
  return {
    code: d.f57, name: d.f58, price: d.f43, open: d.f46, high: d.f44, low: d.f45, close: d.f60,
    volume: d.f47, amount: d.f48, changePercent: d.f170, changeAmount: d.f169,
    turnoverRate: d.f168, amplitude: d.f171, pe: d.f162, pb: d.f167,
    totalMarketValue: d.f116, circulatingMarketValue: d.f117,
  };
}

// ---------- 腾讯兜底 ----------
// 接口 qt.gtimg.cn/q=前缀+代码，返回 GBK 编码 "v_xxx=\"...\""，字段用 ~ 分隔
// 索引：1名称 2代码 3最新价 4昨收 5今开 6成交量 31涨跌额 32涨跌幅 33最高 34最低 37成交额(万) 38换手率 39市盈率 43振幅 44流通市值(亿) 45总市值(亿) 46市净率
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
  const urls = [`https://qt.gtimg.cn/q=${q}`];
  const buf = await fetchWithRetry(urls, {
    'User-Agent': BROWSER_HEADERS['User-Agent'],
    'Referer': 'https://gu.qq.com/',
  }, { timeout: 6000, retries: 1 });
  if (buf == null) return null;
  // 腾讯返回 GBK，用 gbk 解码；若结果出现乱码符 U+FFFD 则退回 UTF-8
  let text;
  try {
    text = new TextDecoder('gbk').decode(buf);
    if (text.includes('\uFFFD')) throw new Error('gbk-bad');
  } catch (_) {
    text = new TextDecoder('utf-8').decode(buf);
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
}

// 缓存工具：Cloudflare 环境用 Cache API 降频；本地 Node 无 caches 则跳过
const CACHE_TTL = 20; // 秒
function getCache() {
  try {
    return typeof caches !== 'undefined' ? caches.default : null;
  } catch (_) {
    return null;
  }
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  const cache = getCache();
  const cacheKey = cache ? new Request(`https://stock.local/api/quote?code=${encodeURIComponent(code)}`) : null;
  if (cache && cacheKey) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        return new Response(hit.body, { headers: { 'Content-Type': 'application/json' } });
      }
    } catch (_) { /* 缓存失败不影响主流程 */ }
  }

  const secid = toEastmoneySecid(code);
  const tcode = toTencentCode(code);
  if (!secid && !tcode) {
    const r = new Response(JSON.stringify({ code: 400, message: 'code 不支持，示例：600519.SH / 000001.SZ / 00700.HK' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    return r;
  }

  let body, source;

  // 东方财富主源
  if (secid) {
    const d = await fromEastmoney(secid);
    if (d) {
      body = { code: 200, source: 'eastmoney', data: { ...d, secid } };
      source = 'eastmoney';
    }
  }

  // 腾讯兜底
  if (!body) {
    const td = await fromTencent(code);
    if (td) {
      body = { code: 200, source: 'tencent', data: td };
      source = 'tencent';
    }
  }

  if (!body) {
    return new Response(JSON.stringify({ code: 502, message: '东方财富与腾讯行情均请求失败' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  const resp = new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_TTL}` },
  });

  // 回源成功后写入缓存，降低后续请求频率（模拟 Python 的低频行为）
  if (cache && cacheKey) {
    try { await cache.put(cacheKey, resp.clone()); } catch (_) { /* 忽略 */ }
  }
  return resp;
}
