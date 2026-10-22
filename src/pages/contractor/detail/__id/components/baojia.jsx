import BaojiaItem from "./baojia-item";
import useCloudList from "./use-cloud-list";

export default function ({ sgfId }) {
  const list = useCloudList({ collection: "pq-contract", sgfId, orderField: "updateTime" });

  return (
    <div>
      {list.value.map((item, index) => {
        return item.title && <BaojiaItem item={item} index={index} key={index} />;
      })}
    </div>
  );
}
