export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/api/user') {
      return Response.json({
        code: 200,
        data: { id: 1, name: '张三' },
        message: '获取成功'
      })
    }

    return new Response('Not Found', { status: 404 })
  }
}