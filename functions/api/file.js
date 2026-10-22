// functions/api/file.js
// 附件文件代理：服务端拉取 WPS 签名链接的文件字节，返回给浏览器（避免浏览器跨域 CORS 限制）
// GET /api/file?url=<encodeURIComponent(附件签名链接)>
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return new Response(JSON.stringify({ error: "缺少 url 参数" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 仅允许 WPS 相关域名，防止代理被滥用转发任意 URL
  if (!/wpscdn\.cn|kdocs\.cn|ks3-cn-beijing/.test(target)) {
    return new Response(JSON.stringify({ error: "仅允许 WPS 文件域名" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch(target);
  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: `文件下载失败: HTTP ${res.status}` }),
      { status: res.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const contentType =
    res.headers.get("Content-Type") || "application/octet-stream";
  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Content-Disposition": "inline",
    },
  });
}
