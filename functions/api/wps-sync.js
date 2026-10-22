// functions/api/wps-sync.js
// 手动触发：从 WPS(金山文档 kdocs) 拉取施工方/客户/报价数据，同步到 Cloudflare KV
// 访问 /api/wps-sync 同步全部；?sheet=施工方 只同步单个表
const WPS_URL =
  "https://www.kdocs.cn/api/v3/ide/file/260638305066/script/V2-59z2NOBTDJG3kplMLj6dwU/sync_task";

// 字段映射（WPS 中文列名 -> 业务字段）
const fieldMap = {
  客户: "client",
  订单号: "orderNo",
  施工方: "builder",
  陪签时间: "signedTime",
  最后修改时间: "updateTime",
  编号: "caseNo",
  备注: "context",
  类型: "type",
  合同: "contract",
  报价: "quotation",
  电话: "telephone",
  序号: "caseNo",
  标题: "title",
  审核: "context",
  附件: "attachments",
  文本: "context",
  创建时间: "createTime",
  创建人: "creator",
  "关联：客户": "client",
  "关联：报价合同": "contractSheet",
};

// 默认同步的三张表
const SHEETS = ["施工方", "客户", "报价"];

// 时间字段转时间戳，空值/解析失败兜底，不产出 NaN
const toTimeNum = (val) => {
  if (val == null || val === "") return val;
  const t = new Date(val);
  return isNaN(t.getTime()) ? val : t.getTime();
};

// 字段映射 + 时间转换：WPS原始记录 -> 可入库记录
function mapFields(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((item) => {
    const result = { ...item };
    for (const [oldField, value] of Object.entries(result)) {
      const newField = fieldMap[oldField] || oldField;
      if (newField !== oldField) {
        result[newField] = value;
        delete result[oldField];
      }
      if (/Time$/i.test(newField)) result[newField] = toTimeNum(value);
    }
    return result;
  });
}

// 调 WPS API 拉取某个 sheet 的全部记录
async function fetchWps(token, sheetName) {
  const res = await fetch(WPS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "AirScript-Token": token,
    },
    body: JSON.stringify({ Context: { argv: { sheetName } } }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`WPS 返回非 JSON: ${text.slice(0, 200)}`);
  }
  const rows = Array.isArray(json?.data?.result) ? json.data.result : [];
  return mapFields(rows);
}

export async function onRequestGet({ env, request }) {
  const token = env.WPS_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "缺少 WPS_TOKEN 环境变量" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(request.url);
  const only = url.searchParams.get("sheet"); // 可选：只同步单个表
  const sheets = only ? [only] : SHEETS;

  const result = { time: new Date().toISOString() };
  for (const sheet of sheets) {
    try {
      const data = await fetchWps(token, sheet);
      await env.WPS_KV.put(sheet, JSON.stringify(data));
      result[sheet] = { ok: true, count: data.length };
    } catch (e) {
      result[sheet] = { ok: false, error: e.message };
    }
  }
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}
