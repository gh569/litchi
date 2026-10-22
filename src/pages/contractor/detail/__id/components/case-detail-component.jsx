// src/pages/010-find-contractor/detail/__id/components/case-detail-component.jsx
import Kehu from "./kehu";
import Baojia from "./baojia";
import BaojiaItem from "./baojia-item";
import style from "./case-detail-component.module.css";

export default function CaseDetailComponent({ caseData }) {
  return (
    <div className={style["case-detail"]}>
      <div className={style["case-header"]}>
        <h1 className={style["case-title"]}>{caseData.builder || "详情"}</h1>
      </div>
      <div>
        {caseData.contract && <BaojiaItem item={{ title: "***合同建议***", context: caseData.contract }} />}

        {caseData.quotation   && <BaojiaItem item={{ title: "***报价建议***",context: caseData.quotation}} />}

        <Baojia sgfId={caseData.id} />
        <Kehu sgfId={caseData.id} />
      </div>
    </div>
  );
}
