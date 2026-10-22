import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import ListItem from "@com/list-item";
import useCloudList from "./use-cloud-list";
import style from "./kehu.module.css";

export default function ({ sgfId }) {
  const list = useCloudList({ collection: "pq-client", sgfId, orderField: "signedTime" });
  const selectedItem = useSignal(null);

  // 监听弹窗状态，控制背景页面是否可滚动（关闭或卸载时恢复）
  useEffect(() => {
    if (selectedItem.value) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedItem.value]);

  const handleClick = (item) => {
    selectedItem.value = {
      title: `${item.client ?? ""}(${item.orderNo ?? ""})`,
      body: `${item.context ?? ""}\n\n${item.signedTime ?? ""}`,
    };
  };

  const closeDialog = () => {
    selectedItem.value = null;
  };

  const formatText = (text) => {
    if (!text) return "";
    return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  };

  return (
    <div className={style["container"]}>
      <div>共{list.value.length}个记录</div>
      {list.value.map((item) => (
        <ListItem
          key={item._id}
          title={`${item.client}(${item.orderNo}) ${item.context ? "：" + item.context : ""}`}
          time={new Date(item.signedTime).toLocaleDateString()}
          onClick={() => handleClick(item)}
        />
      ))}

      {selectedItem.value && (
        <div className={style["modal-overlay"]} onClick={closeDialog}>
          <div className={style["modal-content"]} onClick={(e) => e.stopPropagation()}>
            <div className={style["modal-title"]}>{formatText(selectedItem.value.title)}</div>

            <div className={style["modal-body"]}>{formatText(selectedItem.value.body)}</div>

            <div className={style["modal-footer"]}>
              <button onClick={closeDialog} className={style["modal-confirm-btn"]}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
