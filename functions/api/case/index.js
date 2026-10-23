// functions/api/case/index.js
// 案例数据查询（读 KV「案例」，由 /api/sync 从 WPS 同步）
//   GET /api/case?page=1&pageSize=20         案例列表（updateTime 倒序，过滤 isDeleted）
//   GET /api/case?q=关键词                     按 context 搜索
//   GET /api/case?id=xxx                       案例详情
//   GET /api/case?trash=1                     回收站（isDeleted=true，deletedAt 倒序）
const SHEET = "案例";
const CT = { "Content-Type": "application/json" };

const getKV = async (env, key) => {
  const raw = await env.WPS_KV.get(key);
  return raw ? JSON.parse(raw) : [];
};

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const id = url.searchParams.get("id");
  const trash = url.searchParams.get("trash");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10));

  let list = await getKV(env, SHEET);

  // 回收站：只取 isDeleted=true
  if (trash !== null) {
    list = list.filter((c) => c.isDeleted === true);
    list.sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
    return new Response(JSON.stringify(list), { headers: CT });
  }

  // 正常列表：过滤已删除
  list = list.filter((c) => c.isDeleted !== true);

  // 按 context 搜索
  if (q) {
    const kw = String(q).toLowerCase();
    list = list.filter((c) => String(c.context || "").toLowerCase().includes(kw));
    list.sort((a, b) => (b.updateTime ?? 0) - (a.updateTime ?? 0));
    return new Response(JSON.stringify(list), { headers: CT });
  }

  // 详情
  if (id) {
    const sid = String(id);
    const item = list.find((c) => String(c.id) === sid || String(c._id) === sid);
    if (!item) {
      return new Response(JSON.stringify({ error: "未找到该案例" }), {
        status: 404,
        headers: CT,
      });
    }
    return new Response(JSON.stringify(item), { headers: CT });
  }

  // 分页列表
  list.sort((a, b) => (b.updateTime ?? 0) - (a.updateTime ?? 0));
  const start = (page - 1) * pageSize;
  const data = list.slice(start, start + pageSize);
  const hasMore = start + pageSize < list.length;

  return new Response(
    JSON.stringify({ data, hasMore, page, pageSize, total: list.length }),
    { headers: CT }
  );
}
