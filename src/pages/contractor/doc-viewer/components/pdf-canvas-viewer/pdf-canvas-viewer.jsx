import "../pdf-polyfill";
import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import * as pdfjsLib from "pdfjs-dist";
import Loading from "@com/loading";
import style from "./pdf-canvas-viewer.module.css"

import PdfJsWorker from "../pdf.worker.bundle.js?worker&iife";
// 自建 worker 入口（内含 polyfill + 带 core-js 垫片的 legacy worker）。
// 必须用 ?worker&iife 让 Vite 完整打包成独立线程文件：
// ?url 方式是原样拷贝官方文件，polyfill 根本进不了 worker 全局，
// 这就是改完仍报 "n.toHex is not a function" 的原因。
// iife 格式同时兼容不支持 module worker 的旧 WebView。

/* ---------- PDF 预览（canvas 懒渲染版，支持缩放） ----------
 * 缩放：传入 zoom prop（相对倍率，默认 1），渲染 scale 与占位高度都乘以 zoom。
 * zoom 变化时不重开文档，直接重铺占位并重渲染可视页（清晰放大）。
 * 懒渲染策略：铺等高占位 → 首页立即渲染 → 其余页进视口才渲染（串行队列）。
 */

const openDoc = async (buffer) => {
  const workerInstance = new PdfJsWorker();
  const pdfWorker = new pdfjsLib.PDFWorker({ port: workerInstance });
  try {
    const doc = await pdfjsLib.getDocument({
      data: buffer.slice(0), // pdfjs 会 detach 传入 buffer，必须给副本
      worker: pdfWorker,
    }).promise;
    doc.__workerInstance = workerInstance;
    doc.__pdfWorker = pdfWorker;
    return doc;
  } catch (e) {
    pdfWorker.destroy();
    workerInstance.terminate();
    throw e;
  }
};

const closeDoc = (doc) => {
  if (!doc) return;
  const finish = () => {
    try {
      doc.__pdfWorker?.destroy();
    } catch (e) {
      /* noop */
    }
    try {
      doc.__workerInstance?.terminate();
    } catch (e) {
      /* noop */
    }
  };
  try {
    const p = doc.destroy();
    if (p && typeof p.then === "function") p.then(finish, finish);
    else finish();
  } catch (e) {
    finish();
  }
};

const PdfCanvasViewer = ({ data, onDownload, zoom = 1 }) => {
  const containerRef = useRef(null);
  const runIdRef = useRef(0);
  const docRef = useRef(null);
  const observerRef = useRef(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [tip, setTip] = useState("PDF 加载中…");
  const [failed, setFailed] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const cancelObserver = () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  };

  // 布局 + 懒渲染；runId 每次调用递增，旧队列自然作废
  const layout = async (doc) => {
    const runId = ++runIdRef.current;
    const isCancelled = () => runId !== runIdRef.current;
    const container = containerRef.current;
    if (!container) return;

    cancelObserver();
    let queue = Promise.resolve();
    let firstShown = false;
    const zoomNow = zoomRef.current;

    const cssWidth = container.clientWidth || document.documentElement.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 先取宽高比做占位（高度乘 zoom），避免布局跳动
    const metas = [];
    for (let num = 1; num <= doc.numPages; num++) {
      const page = await doc.getPage(num);
      const vp = page.getViewport({ scale: 1 });
      page.cleanup();
      metas.push({ num, ratio: vp.height / vp.width });
      if (isCancelled()) return;
    }

    container.textContent = "";
    const slots = metas.map((meta) => {
      const div = document.createElement("div");
      div.className = style["pdf-page-placeholder"];
      div.style.height = Math.round(cssWidth * meta.ratio * zoomNow) + "px";
      div.dataset.page = String(meta.num);
      container.appendChild(div);
      return div;
    });

    const renderPage = async (slot) => {
      if (isCancelled() || !slot.isConnected) return;
      const num = Number(slot.dataset.page);
      const page = await doc.getPage(num);
      if (isCancelled()) {
        page.cleanup();
        return;
      }
      const base = page.getViewport({ scale: 1 });
      const width = container.clientWidth || cssWidth;
      // 清晰缩放：canvas 分辨率按 zoom 提高，而非拉伸位图
      const viewport = page.getViewport({ scale: (width / base.width) * dpr * zoomNow });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.className = style["pdf-page"];
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      page.cleanup();
      if (isCancelled()) return;
      slot.replaceWith(canvas);
      if (!firstShown) {
        firstShown = true;
        setTip("");
      }
    };

    const enqueue = (slot) => {
      queue = queue.then(renderPage.bind(null, slot), null);
      queue = queue.catch((e) => {
        if (!isCancelled()) {
          setTip("");
          setErrMsg(String((e && (e.message || e)) || "未知错误"));
          setFailed(true);
        }
      });
    };

    enqueue(slots[0]); // 首页立即渲染

    if (typeof IntersectionObserver === "function" && slots.length > 1) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            observer.unobserve(en.target);
            enqueue(en.target);
          });
        },
        { rootMargin: "400px 0px" },
      );
      observerRef.current = observer;
      for (let i = 1; i < slots.length; i++) observer.observe(slots[i]);
    } else {
      for (let i = 1; i < slots.length; i++) enqueue(slots[i]);
    }
  };

  // 打开文档 + 初始布局
  useEffect(() => {
    if (!data) return undefined;

    setFailed(false);
    setTip("PDF 加载中…");
    const openRun = ++runIdRef.current;

    (async () => {
      try {
        const doc = await openDoc(data);
        if (openRun !== runIdRef.current) {
          closeDoc(doc);
          return;
        }
        docRef.current = doc;
        await layout(doc);
      } catch (e) {
        console.error("PDF 渲染失败:", e);
        if (openRun === runIdRef.current) {
          setTip("");
          setErrMsg(String((e && (e.message || e)) || "未知错误"));
          setFailed(true);
        }
      }
    })();

    // 仅“宽度真变”才重排
    let lastWidth = containerRef.current
      ? containerRef.current.clientWidth
      : document.documentElement.clientWidth;
    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const width = (containerRef.current && containerRef.current.clientWidth) ||
          document.documentElement.clientWidth;
        if (Math.abs(width - lastWidth) <= 1) return;
        lastWidth = width;
        if (!docRef.current) return;
        layout(docRef.current).catch(() => { /* layout 内部已有错误处理 */ });
      }, 300);
    };
    window.addEventListener("resize", onResize);

    return () => {
      runIdRef.current += 1;
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      cancelObserver();
      if (docRef.current) {
        closeDoc(docRef.current);
        docRef.current = null;
      }
    };
  }, [data]);

  // zoom 变化 → 复用已打开的文档，直接重排重渲染（清晰放大）
  useEffect(() => {
    if (!zoom || !docRef.current) return;
    layout(docRef.current).catch(() => { /* layout 内部已有错误处理 */ });
  }, [zoom]);

  return (
    <div className={style["pdf-canvas-scope"]}>

      {tip && !failed && <Loading message={tip} />}
      {failed && (
        <div className={style["pdf-error"]}>
          <p>PDF 预览失败。</p>
          <p className={style["pdf-error-detail"]}>{errMsg}</p>
          {onDownload && (
            <button type="button" className={style["pdf-download"]} onClick={onDownload}>
              下载文件
            </button>
          )}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
};

export default PdfCanvasViewer;
