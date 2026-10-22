import "../pdf-polyfill";
import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import * as pdfjsLib from "pdfjs-dist";
import Loading from "@com/loading";
import style from "./pdf-canvas-viewer.module.css"

import PdfJsWorker from "../pdf.worker.bundle.js?worker&iife";
// 自建 worker 入口（内含 polyfill + 带 core-js 垫片的 legacy worker）。
// 必须用 ?worker&iife 让 Vite 完整打包成独立线程文件：
// 之前 ?url 方式是原样拷贝官方文件，polyfill 根本进不了 worker 全局，
// 这就是上一轮改完仍报 "n.toHex is not a function" 的原因。
// iife 格式同时兼容不支持 module worker 的旧 WebView。

/* ---------- PDF 预览（canvas 懒渲染版） ----------
 * 桌面端 iframe 依赖浏览器内置 PDF viewer，移动端（尤其微信 WebView）没有，
 * 只显示空白；这里用 pdfjs-dist 逐页渲染 canvas，任何支持 Canvas 的浏览器
 * 都能显示。
 *
 * 懒渲染策略（解决"整本一次渲染导致首屏慢、内容撑开反复跳动"）：
 * 1. 取每页宽高比，先铺等高的空白占位 div（滚动条/布局一次定型，不再跳动）；
 * 2. 第一页立即渲染，渲染完即撤加载提示——首屏时间 ≈ 第一页渲染时间；
 * 3. 其余页进视口附近（rootMargin 400px）才渲染，串行进队不打爆 worker；
 * 4. 无 IntersectionObserver 的旧内核退化为全量顺序渲染（等同旧行为）。
 *
 * 解析线程策略：每个文档创建一个自建 worker，经 PDFWorker({ port }) 接入，
 * 文档销毁后再 terminate；旧内核下若 worker 初始化失败，pdfjs 会回退
 * fake worker（主线程执行），由 ./pdf-polyfill 覆盖。
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

const PdfCanvasViewer = ({ data, onDownload }) => {
  const containerRef = useRef(null);
  const runIdRef = useRef(0);
  const docRef = useRef(null);
  const [tip, setTip] = useState("PDF 加载中…");
  const [failed, setFailed] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!data) return undefined;

    let observer = null;
    let queue = Promise.resolve();
    let firstShown = false;
    const openRun = ++runIdRef.current;

    // 铺占位 + 挂懒渲染；runId 在每次布局开始时递增，旧队列自然作废
    const layout = async (doc) => {
      const runId = ++runIdRef.current;
      const isCancelled = () => runId !== runIdRef.current;
      const container = containerRef.current;
      if (!container) return;

      if (observer) {
        observer.disconnect();
        observer = null;
      }
      queue = Promise.resolve();

      const cssWidth = container.clientWidth || document.documentElement.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // 先只取宽高比做占位，避免布局跳动
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
        div.style.height = Math.round(cssWidth * meta.ratio) + "px";
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
        const viewport = page.getViewport({ scale: (width / base.width) * dpr });
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
          setTip(""); // 第一页出来就撤加载提示，不等整本
        }
      };

      // 串行队列：旧内核 worker 扛不住并行渲染
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
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (!en.isIntersecting) return;
              observer.unobserve(en.target);
              enqueue(en.target);
            });
          },
          { rootMargin: "400px 0px" },
        );
        for (let i = 1; i < slots.length; i++) observer.observe(slots[i]);
      } else {
        for (let i = 1; i < slots.length; i++) enqueue(slots[i]); // 兜底：全量渲染
      }
    };

    (async () => {
      setFailed(false);
      setTip("PDF 加载中…");
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

    // 仅“宽度真变”才重排：移动端滚动收起地址栏也会触发 resize，
    // 旧代码每次都整本清空重渲染，是反复白屏闪烁的主要来源
    let lastWidth = containerRef.current
      ? containerRef.current.clientWidth
      : document.documentElement.clientWidth;
    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const width = (containerRef.current && containerRef.current.clientWidth) ||
          document.documentElement.clientWidth;
        if (Math.abs(width - lastWidth) <= 1) return; // 高度变化（地址栏）不重排
        lastWidth = width;
        const doc = docRef.current;
        if (!doc) return;
        layout(doc).catch(() => { /* layout 内部已有错误处理 */ });
      }, 300);
    };
    window.addEventListener("resize", onResize);

    return () => {
      runIdRef.current += 1;
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (docRef.current) {
        closeDoc(docRef.current);
        docRef.current = null;
      }
    };
  }, [data]);

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
