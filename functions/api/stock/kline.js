// K线接口：东方财富为主源，失败自动回退腾讯（web.ifzq.gtimg.cn）
// 统一输出：{ date, open, close, high, low, volume, amount, amplitude, changePercent, changeAmount, turnover }

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Referer': 'https://quote.eastmoney.com/',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

// 带超时 + 重试退避的 fetch：降低东财限流/连接重置导致的失败
async function fetchWithRetry(urls, headers, { timeout = 8000, retries = 2 } = {}) {
  for (const url of urls) {
    for (let i = 0; i <= retries; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      try {
        const res = await fetch(url, { headers, signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        return await res.text();
      } catch (_) {
        clearTimeout(timer);
        if (i < retries) await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }
  }
  return null;
}

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

// 代码 -> 腾讯代码
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

// 东方财富：日K(klt=101) 周K(102) 月K(103)
async function fromEastmoney(secid, klt, lmt) {
  const api = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1&lmt=${lmt}&beg=0&end=20500101`;
  const text = await fetchWithRetry([api], BROWSER_HEADERS);
  if (text == null) return null;
  let json;
  try { json = JSON.parse(text); } catch (_) { return null; }
  if (!json.data || !json.data.klines) return null;
  return json.data.klines.map((line) => {
    const [date, open, close, high, low, volume, amount, amplitude, changePercent, changeAmount, turnover] = line.split(',');
    return { date, open: Number(open), close: Number(close), high: Number(high), low: Number(low), volume: Number(volume), amount: Number(amount), amplitude: Number(amplitude), changePercent: Number(changePercent), changeAmount: Number(changeAmount), turnover: Number(turnover) };
  }).slice(-Number(lmt)); // 只保留最近 lmt 条
}

// 腾讯兜底
async function fromTencent(code, klt, lmt) {
  const q = toTencentCode(code);
  if (!q) return null;
  const period = { 101: 'day', 102: 'week', 103: 'month' }[String(klt)] || 'day';
  const api = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${q},${period},,,${lmt},qfq`;
  const text = await fetchWithRetry([api], {
    'User-Agent': BROWSER_HEADERS['User-Agent'],
    'Referer': 'https://gu.qq.com/',
  }, { timeout: 6000, retries: 1 });
  if (text == null) return null;
  let json;
  try { json = JSON.parse(text); } catch (_) { return null; }
  if (!json.data) return null;
  const node = json.data[q];
  const rows = node?.qfqday || node?.day || node?.[period];
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows
    .filter((r) => Array.isArray(r) && r.length >= 6)
    .map((r) => ({
      date: r[0],
      open: Number(r[1]), close: Number(r[2]), high: Number(r[3]), low: Number(r[4]), volume: Number(r[5]),
      amount: null, amplitude: null, changePercent: null, changeAmount: null, turnover: null,
    }));
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const klt = url.searchParams.get('klt') || '101';
  const lmt = url.searchParams.get('lmt') || '120';

  // 缓存降频：同一请求 30 秒内只回源一次，降低被东财限流的概率
  let cache = null;
  try { cache = typeof caches !== 'undefined' ? caches.default : null; } catch (_) { cache = null; }
  const cacheKey = cache ? new Request(`https://stock.local/api/kline?code=${encodeURIComponent(code)}&klt=${klt}&lmt=${lmt}`) : null;
  if (cache && cacheKey) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        return new Response(hit.body, { headers: { 'Content-Type': 'application/json' } });
      }
    } catch (_) { /* 忽略 */ }
  }

  const secid = toEastmoneySecid(code);
  const tcode = toTencentCode(code);
  if (!secid && !tcode) {
    return new Response(JSON.stringify({ code: 400, message: 'code 不支持，示例：600519.SH / 00700.HK' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let body;

  // 东方财富主源
  if (secid) {
    try {
      const klines = await fromEastmoney(secid, klt, lmt);
      if (klines) body = { code: 200, source: 'eastmoney', data: klines };
    } catch (_) { /* 回退腾讯 */ }
  }

  // 腾讯兜底
  if (!body) {
    const tk = await fromTencent(code, klt, lmt);
    if (tk) body = { code: 200, source: 'tencent', data: tk };
  }

  if (!body) {
    return new Response(JSON.stringify({ code: 502, message: '东方财富与腾讯K线均请求失败' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  const resp = new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
  });
  if (cache && cacheKey) {
    try { await cache.put(cacheKey, resp.clone()); } catch (_) { /* 忽略 */ }
  }
  return resp;
}
