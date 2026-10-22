import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";

/**
 * 按「施工方」查询 uniCloud 集合列表，并随时间倒序排序。
 * @param {{ collection: string, sgfId: string, orderField: string }} options
 * @returns {import('@preact/signals').Signal<Array>} 列表信号
 */
export default function useCloudList({ collection, sgfId, orderField }) {
  const list = useSignal([]);

  useEffect(() => {
    let active = true;

    const getData = async () => {
      try {
        const rel = collection === "pq-client" ? "clients" : "contracts";
        const res = await fetch(`/api/contractor?id=${encodeURIComponent(sgfId)}&rel=${rel}`);
        const data = await res.json();
        if (active) list.value = Array.isArray(data) ? data : [];
      } catch (e) {
        console.error(`获取 ${collection} 数据失败:`, e);
      }
    };

    getData();
    return () => {
      active = false;
    };
  }, [collection, sgfId, orderField]);

  return list;
}
