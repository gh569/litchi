function toEastmoneySecid(code) {
  if (!code) return null

  const upper = String(code).toUpperCase().trim()

  if (upper.endsWith('.SH')) return '1.' + upper.slice(0, -3)
  if (upper.endsWith('.SZ')) return '0.' + upper.slice(0, -3)
  if (upper.endsWith('.BJ')) return '0.' + upper.slice(0, -3)
  if (upper.endsWith('.HK')) return '116.' + upper.slice(0, -3).padStart(5, '0')
  if (upper.endsWith('.US')) return '105.' + upper.slice(0, -3)

  if (/^\d{6}$/.test(upper)) return '1.' + upper
  if (/^\d{5}$/.test(upper)) return '116.' + upper

  return null
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/stock/quote') {
      const code = url.searchParams.get('code')
      const secid = toEastmoneySecid(code)

      if (!secid) {
        return Response.json(
          { code: 400, message: 'code 不支持，例如 600519.SH、000001.SZ、00700.HK' },
          { status: 400 }
        )
      }

      const fields =
        'f43,f44,f45,f46,f47,f48,f49,f57,f58,f168,f169,f170,f105,f106,f107,f108'

      const api = new URL('https://push2.eastmoney.com/api/qt/stock/get')
      api.searchParams.set('secid', secid)
      api.searchParams.set('fields', fields)
      api.searchParams.set('fltt', '2')
      api.searchParams.set('invt', '2')

      try {
        const res = await fetch(api.toString(), {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
          }
        })

        const data = await res.json()

        if (!data.data) {
          return Response.json(
            { code: 404, message: '未找到股票数据' },
            { status: 404 }
          )
        }

        const d = data.data

        return Response.json({
          code: 200,
          data: {
            code: d.f57,
            name: d.f58,
            price: d.f43,
            open: d.f46,
            high: d.f44,
            low: d.f45,
            close: d.f60,
            volume: d.f47,
            amount: d.f48,
            changePercent: d.f169,
            changeAmount: d.f170,
            turnoverRate: d.f105,
            pe: d.f106,
            pb: d.f107,
            totalMarketValue: d.f108,
            secid
          }
        })
      } catch (err) {
        return Response.json(
          { code: 502, message: '东方财富数据请求失败', error: err.message },
          { status: 502 }
        )
      }
    }
		
		if (url.pathname === '/api/stock/kline') {
		  const code = url.searchParams.get('code')
		  const klt = url.searchParams.get('klt') || '101'
		  const lmt = url.searchParams.get('lmt') || '120'
		  const fqt = url.searchParams.get('fqt') || '1'
		
		  const secid = toEastmoneySecid(code)
		
		  if (!secid) {
		    return Response.json(
		      { code: 400, message: 'code 不支持，例如 600519.SH、000001.SZ、00700.HK' },
		      { status: 400 }
		    )
		  }
		
		  const api = new URL('https://push2his.eastmoney.com/api/qt/stock/kline/get')
		  api.searchParams.set('secid', secid)
		  api.searchParams.set('fields1', 'f1,f2,f3,f4,f5,f6')
		  api.searchParams.set('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61')
		  api.searchParams.set('klt', klt)
		  api.searchParams.set('fqt', fqt)
		  api.searchParams.set('lmt', lmt)
		  api.searchParams.set('beg', '0')
		  api.searchParams.set('end', '20500101')
		
		  try {
		    const res = await fetch(api.toString(), {
		      headers: {
		        'User-Agent':
		          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
		      }
		    })
		
		    const json = await res.json()
		
		    if (!json.data || !json.data.klines) {
		      return Response.json({ code: 404, message: '未找到K线数据' }, { status: 404 })
		    }
		
		    const klines = json.data.klines.map((line) => {
		      const [date, open, close, high, low, volume, amount, amplitude, changePercent, changeAmount, turnover] =
		        line.split(',')
		
		      return {
		        date,
		        open: Number(open),
		        close: Number(close),
		        high: Number(high),
		        low: Number(low),
		        volume: Number(volume),
		        amount: Number(amount),
		        amplitude: Number(amplitude),
		        changePercent: Number(changePercent),
		        changeAmount: Number(changeAmount),
		        turnover: Number(turnover)
		      }
		    })
		
		    return Response.json({ code: 200, data: klines })
		  } catch (err) {
		    return Response.json(
		      { code: 502, message: 'K线数据请求失败', error: err.message },
		      { status: 502 }
		    )
		  }
		}

    return new Response('Not Found', { status: 404 })
  }
}