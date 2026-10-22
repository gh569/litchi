// src/pages/010-find-contractor/detail/__id/index.jsx
import { useEffect, useState } from "preact/hooks";
import LoadingComponent from "@com/loading";
import ErrorComponent from "@com/error";
import TableHeader from "@com/table-header";
import { useParams } from "wouter-preact";
import CaseDetailComponent from "./components/case-detail-component";
import style from "./detail.module.css";

export default function CaseDetail() {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id: caseId } = useParams();

  // 加载案例详情
  useEffect(() => {
    const loadCaseDetail = async () => {
      if (!caseId || caseId === ":id" || caseId === ":caseId") {
        setError("无效的ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`/api/contractor?id=${encodeURIComponent(caseId)}`);
        const data = await res.json();
        if (data && !data.error) {
          setCaseData(data);
        } else {
          setError("未找到该案例");
        }
      } catch (err) {
        console.error("获取案例详情失败:", err);
        setError("获取案例详情失败");
      } finally {
        setLoading(false);
      }
    };

    loadCaseDetail();
  }, [caseId]);

  // 重新加载
  const handleRetry = () => window.location.reload();

  return (
    <div>
      <TableHeader title="公司介绍" showBack />
      <div className={style["content-container"]}>
        <div className={style["content-card"]}>
          {loading && <LoadingComponent />}
          {!loading && error && <ErrorComponent message={error} onRetry={handleRetry} />}
          {!loading && !error && caseData && <CaseDetailComponent caseData={caseData} />}
        </div>
      </div>
    </div>
  );
}
