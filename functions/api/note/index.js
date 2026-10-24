// functions/api/note/index.js
// 编程笔记：手动录入，存 KV「编程笔记」，支持增删改查
//   GET    /api/note?page=1&pageSize=20   列表（updateTime 倒序，过滤 isDeleted）
//   GET    /api/note?q=关键词             搜索（标题/正文/代码）
//   GET    /api/note?id=xxx              详情
//   POST   /api/note                      新增 {title, category, content, codes}
//   PUT    /api/note                      更新 {id, ...}
//   DELETE /api/note?id=xxx              软删除
const SHEET = "编程笔记";
const CT = { "Content-Type": "application/json" };

const getKV = async (env, key) => {
  const raw = await env.WPS_KV.get(key);
  return raw ? JSON.parse(raw) : [];
};

const saveKV = (env, key, list) => env.WPS_KV.put(key, JSON.stringify(list));

// 从 body 解析 JSON，失败返回 null
const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const id = url.searchParams.get("id");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10));
  const recycle = url.searchParams.get("recycle");

  const all = await getKV(env, SHEET);

  // 回收站列表（软删除的笔记）
  if (recycle === "1") {
    const trashed = all
      .filter((n) => n.isDeleted === true)
      .sort((a, b) => (b.deletedAt || b.updateTime || 0) - (a.deletedAt || a.updateTime || 0));
    return new Response(JSON.stringify(trashed), { headers: CT });
  }

  let list = all.filter((n) => n.isDeleted !== true);

  // 搜索：标题/正文/代码
  if (q) {
    const kw = String(q).toLowerCase();
    list = list.filter(
      (n) =>
        String(n.title || "").toLowerCase().includes(kw) ||
        String(n.category || "").toLowerCase().includes(kw) ||
        String(n.content || "").toLowerCase().includes(kw) ||
        (Array.isArray(n.codes) &&
          n.codes.some((c) =>
            (String(c.title || "") + " " + String(c.code || "")).toLowerCase().includes(kw)
          ))
    );
    list.sort((a, b) => (b.updateTime ?? 0) - (a.updateTime ?? 0));
    return new Response(JSON.stringify(list), { headers: CT });
  }

  // 详情
  if (id) {
    const sid = String(id);
    const item = list.find((n) => String(n.id) === sid);
    if (!item) {
      return new Response(JSON.stringify({ error: "未找到该笔记" }), {
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
  return new Response(JSON.stringify({ data, hasMore, page, pageSize, total: list.length }), {
    headers: CT,
  });
}

export async function onRequestPost({ env, request }) {
  const body = await readJson(request);
  if (!body || !body.title) {
    return new Response(JSON.stringify({ error: "缺少标题 title" }), {
      status: 400,
      headers: CT,
    });
  }
  const list = await getKV(env, SHEET);
  const now = Date.now();
  const note = {
    id: now.toString(36) + Math.random().toString(36).slice(2, 8),
    title: String(body.title).slice(0, 300),
    category: String(body.category || "").slice(0, 50),
    content: String(body.content || ""),
    codes: sanitizeCodes(body.codes),
    createTime: now,
    updateTime: now,
    isDeleted: false,
  };
  list.push(note);
  await saveKV(env, SHEET, list);
  return new Response(JSON.stringify({ ok: true, id: note.id }), { headers: CT });
}

export async function onRequestPut({ env, request }) {
  const body = await readJson(request);
  if (!body || !body.id) {
    return new Response(JSON.stringify({ error: "缺少笔记 id" }), {
      status: 400,
      headers: CT,
    });
  }
  const list = await getKV(env, SHEET);
  const idx = list.findIndex((n) => String(n.id) === String(body.id));
  if (idx < 0) {
    return new Response(JSON.stringify({ error: "未找到该笔记" }), {
      status: 404,
      headers: CT,
    });
  }
  // 恢复（从回收站还原）
  if (body.restore === true) {
    list[idx].isDeleted = false;
    list[idx].deletedAt = null;
    list[idx].updateTime = Date.now();
    await saveKV(env, SHEET, list);
    return new Response(JSON.stringify({ ok: true, id: list[idx].id, restored: true }), { headers: CT });
  }
  const prev = list[idx];
  list[idx] = {
    ...prev,
    title: body.title != null ? String(body.title).slice(0, 300) : prev.title,
    category: body.category != null ? String(body.category).slice(0, 50) : prev.category,
    content: body.content != null ? String(body.content) : prev.content,
    codes: body.codes != null ? sanitizeCodes(body.codes) : prev.codes,
    updateTime: Date.now(),
  };
  await saveKV(env, SHEET, list);
  return new Response(JSON.stringify({ ok: true, id: list[idx].id }), { headers: CT });
}

export async function onRequestDelete({ env, request }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "缺少笔记 id" }), {
      status: 400,
      headers: CT,
    });
  }
  const list = await getKV(env, SHEET);
  const idx = list.findIndex((n) => String(n.id) === String(id));
  if (idx < 0) {
    return new Response(JSON.stringify({ error: "未找到该笔记" }), {
      status: 404,
      headers: CT,
    });
  }
  if (url.searchParams.get("hard") === "1") {
    // 彻底删除（物理移除）
    list.splice(idx, 1);
  } else {
    // 软删除 → 回收站
    list[idx].isDeleted = true;
    list[idx].deletedAt = Date.now();
  }
  await saveKV(env, SHEET, list);
  return new Response(JSON.stringify({ ok: true }), { headers: CT });
}

// 清洗代码块：只保留 lang/title/code，限制长度
function sanitizeCodes(codes) {
  if (!Array.isArray(codes)) return [];
  return codes
    .map((c) => ({
      lang: String(c.lang || "text").slice(0, 20),
      title: String(c.title || "").slice(0, 100),
      code: String(c.code || "").slice(0, 100000),
    }))
    .filter((c) => c.code);
}
