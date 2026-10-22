// functions/api/attachments.js
// 复刻 uni-preact get_url 云函数：用附件元数据(attachs) 调 WPS script 换取带签名的可访问下载链接
// POST { attachs: [ {fileName,size,type,uploadId,...}, ... ] } -> 返回带 url 的数组
const WPS_URL =
  "https://www.kdocs.cn/api/v3/ide/file/260638305066/script/V2-5IHFgW6C21ER6Oo8PrXUaV/sync_task";
const MAX_RETRIES = 3;

const CT = { "Content-Type": "application/json" };

// 判断是否为无效的固定路径（含 ksc-bj.ag.wps.cn 但无 Signature 签名 = 不可访问）
function isInvalidFixedUrl(url) {
  if (!url) return true;
  return url.includes("ksc-bj.ag.wps.cn") && !url.includes("Signature");
}

export async function onRequestPost({ env, request }) {
  const token = env.WPS_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "缺少 WPS_TOKEN 环境变量" }), {
      status: 500,
      headers: CT,
    });
  }

  const body = await request.json().catch(() => null);
  const attachs = body?.attachs;
  if (!Array.isArray(attachs) || attachs.length === 0) {
    return new Response(JSON.stringify({ error: "需要 attachs 数组" }), {
      status: 400,
      headers: CT,
    });
  }

  let lastErr = null;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      const res = await fetch(WPS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "AirScript-Token": token },
        body: JSON.stringify({ Context: { argv: { attachs } } }),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        lastErr = new Error("WPS 返回非 JSON");
        return new Response(JSON.stringify({ error: "WPS 返回非 JSON" }), {
          status: 502,
          headers: CT,
        });
      }
      const results = Array.isArray(json?.data?.result) ? json.data.result : [];

      // 检测是否存在无效固定路径（需重试换链接）
      const hasInvalid = results.some((item) => isInvalidFixedUrl(item.url));
      if (hasInvalid) {
        lastErr = new Error("获取到无效固定路径");
        if (i < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        return new Response(JSON.stringify({ error: "重试后仍为无效固定路径" }), {
          status: 502,
          headers: CT,
        });
      }

      return new Response(JSON.stringify(results), { headers: CT });
    } catch (e) {
      lastErr = e;
      if (i < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  return new Response(JSON.stringify({ error: lastErr?.message || "获取附件链接失败" }), {
    status: 500,
    headers: CT,
  });
}
