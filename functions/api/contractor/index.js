// functions/api/contractor.js
// find-contractor 数据查询（读 KV 同步的数据）
//   /api/contractor?q=关键词        搜索施工方（按名称模糊）
//   /api/contractor?id=xxx          施工方详情
//   /api/contractor?id=xxx&rel=clients   该施工方的客户列表（signedTime 倒序）
//   /api/contractor?id=xxx&rel=contracts 该施工方的报价列表（updateTime 倒序）
const SHEETS = { builders: "施工方", clients: "客户", contracts: "报价" };

const getKV = async (env, key) => {
  const raw = await env.WPS_KV.get(key);
  return raw ? JSON.parse(raw) : [];
};

// builder 字段可能是数组(如 ["9r"]) 或字符串，统一按是否包含指定 id 判断
const matchBuilder = (rec, sid) => {
  const b = rec?.builder;
  if (Array.isArray(b)) return b.some((x) => String(x) === sid);
  return String(b) === sid;
};

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const id = url.searchParams.get("id");
  const rel = url.searchParams.get("rel");

  // 搜索施工方
  if (q) {
    const builders = await getKV(env, SHEETS.builders);
    const kw = String(q).toLowerCase();
    const list = builders.filter((b) =>
      String(b.builder || "").toLowerCase().includes(kw)
    );
    return new Response(JSON.stringify(list), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 按 id 查询
  if (id) {
    const builders = await getKV(env, SHEETS.builders);
    const sid = String(id);
    const builder = builders.find(
      (b) => String(b.id) === sid || String(b._id) === sid
    );
    if (!builder) {
      return new Response(JSON.stringify({ error: "未找到该施工方" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 该施工方的客户列表
    if (rel === "clients") {
      const clients = await getKV(env, SHEETS.clients);
      const list = clients.filter((c) => matchBuilder(c, sid));
      list.sort((a, b) => (b.signedTime ?? 0) - (a.signedTime ?? 0));
      return new Response(JSON.stringify(list), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 该施工方的报价列表
    if (rel === "contracts") {
      const contracts = await getKV(env, SHEETS.contracts);
      const list = contracts.filter((c) => matchBuilder(c, sid));
      list.sort((a, b) => (b.updateTime ?? 0) - (a.updateTime ?? 0));
      return new Response(JSON.stringify(list), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(builder), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "需要 q 或 id 参数" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
