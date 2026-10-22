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
const DOC_TYPES = ["doc", "docx"];
const PREVIEWABLE = ["pdf", ...DOC_TYPES, ...EXCEL_TYPES];

// 检测文件真实类型：很多 .doc 实际是 docx(PK) 或 RTF
function detectDocType(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  // docx = zip，开头 PK(50 4B)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "docx";
  // RTF: {\rtf
  const head = new TextDecoder().decode(buffer.slice(0, 8));
  if (head.startsWith("{\\rtf")) return "rtf";
  // 真 OLE2 .doc: D0 CF 11 E0
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return "doc";
  return "unknown";
}

// docx 转 HTML，并把内嵌图片以 base64 显示（mammoth 默认丢弃图片）
const convertDocx = async (arrayBuffer) => {
  const result = await mammoth.convertToHtml({
    arrayBuffer,
    convertImage: mammoth.images.imgElement(function (image) {
      return image.read("base64").then(function (imageBuffer) {
        return { src: "data:" + image.contentType + ";base64," + imageBuffer };
      });
    }),
  });
  return result.value;
};

// RTF 简单转 HTML（提取文本，按段落显示）
function rtfToHtml(rtfText) {
  const escapeHtml = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const text = rtfText
    .replace(/\\par[d]?\b/gi, "\n")
    .replace(/\\line\b/gi, "\n")
    .replace(/\\tab\b/gi, "\t")
    .replace(/\\[a-z]+-?\d*\s?/gi, "")
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/[{}]/g, "")
    .trim();
  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

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
  const [docUnsupported, setDocUnsupported] = useState(false);
  const [zoom, setZoom] = useState(1);

  // 缩放工具条按钮样式
  const zoomBtnStyle = {
    minWidth: 34, height: 32, padding: "0 10px", fontSize: 16,
    border: "1px solid #e5e5e5", borderRadius: 6, background: "#fff",
    color: "#333", cursor: "pointer", lineHeight: "30px",
  };

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

    const isPreviewable = PREVIEWABLE.includes(fileType);
    if (!isPreviewable) {
      setIsLoading(false);
      return;
    }

    const fetchAndProcess = async () => {
      setIsLoading(true);
      setError("");
      setExcelBuffer(null);
      setPdfBuffer(null);
      setHtmlContent("");
      setDocUnsupported(false);

      try {
        const response = await fetch('/api/file?url=' + encodeURIComponent(url));
        if (!response.ok) {
          setError(`文件下载失败，HTTP ${response.status}`);
          return;
        }
        const arrayBuffer = await response.arrayBuffer();

        if (fileType === "pdf") {
          setPdfBuffer(arrayBuffer);
        } else if (fileType === "docx") {
          setHtmlContent(await convertDocx(arrayBuffer));
        } else if (fileType === "doc") {
          // 检测真实类型：.doc 可能是 docx / RTF / 真 OLE2
          const real = detectDocType(arrayBuffer);
          if (real === "docx") {
            setHtmlContent(await convertDocx(arrayBuffer));
          } else if (real === "rtf") {
            setHtmlContent(rtfToHtml(new TextDecoder().decode(arrayBuffer)));
          } else {
            // 真 OLE2 .doc：纯前端无法渲染，走下载分支
            setDocUnsupported(true);
          }
        } else if (EXCEL_TYPES.includes(fileType)) {
          setExcelBuffer(arrayBuffer);
        }
      } catch (e) {
        console.error("文件加载或解析失败:", e);
        setError(e.message || "文件预览失败，请检查文件是否损坏。");
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
        <Loading message='文件加载中...' />
      ) : (
        <>
          {(PREVIEWABLE.includes(fileType)) && (
            <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #eee', justifyContent: 'center' }}>
              <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} style={zoomBtnStyle}>−</button>
              <span style={{ minWidth: 46, textAlign: 'center', fontSize: 13, color: '#333' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} style={zoomBtnStyle}>＋</button>
              <button onClick={() => setZoom(1)} style={{ ...zoomBtnStyle, fontSize: 12 }}>重置</button>
            </div>
          )}

          {fileType === "pdf" && pdfBuffer && (
            <PdfCanvasViewer data={pdfBuffer} zoom={zoom} onDownload={() => triggerDownload(url, fileName)} />
          )}

          {(fileType === "docx" || (fileType === "doc" && htmlContent)) && htmlContent && (
            <div style={{ zoom }}>
              <div className={style['doc-wrapper']} dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          )}

          {EXCEL_TYPES.includes(fileType) && excelBuffer && (
            <div style={{ zoom }}>
              <ExcelPreview arrayBuffer={excelBuffer} />
            </div>
          )}

          {fileType === "doc" && docUnsupported && (
            <div className={style['download-container']}>
              <div className={style['download-message']}>该 .doc 为旧版二进制格式，暂不支持在线预览，可下载后查看</div>
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

          {!PREVIEWABLE.includes(fileType) && (
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
