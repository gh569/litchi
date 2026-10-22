import { h } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import { useSearch } from "wouter-preact";
import * as mammoth from "mammoth";
import ExcelPreview from "./components/excel-preview";
import PdfCanvasViewer from "./components/pdf-canvas-viewer";
import Error from "@com/error";
import Loading from "@com/loading";
import style from './doc-viewer.module.css';

const EXCEL_TYPES = ["xlsx", "xls", "csv"];

const DocumentPreviewPage = () => {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const url = params.get("url");
  const fileName = params.get("fileName");

  const fileType = useMemo(() => {
    if (!fileName) return null;
    return fileName.split(".").pop().toLowerCase();
  }, [fileName]);

  // 统一的状态管理
  const [pdfBuffer, setPdfBuffer] = useState(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [excelBuffer, setExcelBuffer] = useState(null);

  // 触发浏览器下载的函数
  const triggerDownload = (fileUrl, name) => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = name || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 核心逻辑处理
  useEffect(() => {
    if (!url || !fileName) return;

    const isPreviewable = ["pdf", "docx", ...EXCEL_TYPES].includes(fileType);

    if (!isPreviewable) {
      setIsLoading(false);
      return;
    }

    const fetchAndProcess = async () => {
      setIsLoading(true);
      setError("");
      setExcelBuffer(null);
      setPdfBuffer(null);

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();

        switch (fileType) {
          case "pdf": {
            setPdfBuffer(arrayBuffer);
            break;
          }

          case "docx": {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setHtmlContent(result.value);
            break;
          }

          case "xlsx":
          case "xls":
          case "csv": {
            setExcelBuffer(arrayBuffer);
            break;
          }

          default:
            break;
        }
      } catch (e) {
        console.error("文件加载或解析失败:", e);
        setError("文件预览失败，请检查文件是否损坏或服务器是否允许跨域(CORS)。");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndProcess();
  }, [url, fileName, fileType]);

  // 参数校验
  if (!url || !fileName) {
    return <Error message="缺少必要参数：请确保URL中包含 `url` 和 `fileName`。" />;
  }

  // 错误提示
  if (error) {
    return <Error message={error} />;
  }

  // 渲染逻辑
  return (
    <div className={style.container}>
      {isLoading ? (
        <Loading message='文件加载中...'/>
      ) : (
        <>
          {fileType === "pdf" && pdfBuffer && (
            <PdfCanvasViewer data={pdfBuffer} onDownload={() => triggerDownload(url, fileName)} />
          )}

          {fileType === "docx" && htmlContent && (
            <div className={style['doc-wrapper']} dangerouslySetInnerHTML={{ __html: htmlContent }} />
          )}

          {EXCEL_TYPES.includes(fileType) && excelBuffer && <ExcelPreview arrayBuffer={excelBuffer} />}

          {!["pdf", "docx", ...EXCEL_TYPES].includes(fileType) && (
            <div className={style['download-container']}>
              <div className={style['download-message']}>此文件类型不支持在线预览</div>
              <button className={style['download-button']} onClick={() => triggerDownload(url, fileName)}>
                <svg className={style['download-icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                下载文件
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentPreviewPage;
