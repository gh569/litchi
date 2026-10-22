/* pdf.js worker 自建入口（组件里以 ?worker&iife 方式导入，由 Vite 完整打包）。
 *
 * 为什么需要这个文件：
 * pdfjs-dist v6 标准构建的 worker 包内部直接调用 Uint8Array.prototype.toHex
 * 等新 API，而 worker 是独立的全局环境，主线程打过的 polyfill 对它无效——
 * 这是移动端报 "n.toHex is not a function" 的根因。
 * 之前用 ?url 方式加载官方 worker 是把文件原样拷贝输出，polyfill 进不去，
 * 所以必须自建入口交给打包器处理。
 *
 * 做法：前置一份兜底 polyfill（toHex/toBase64/Promise.withResolvers/Promise.try，
 * 仅在宿主缺失时安装），再 import 自带 core-js 垫片的 legacy worker 构建；
 * 该包末尾有自动引导逻辑，检测到 worker 环境即自行 initialize。
 */
import "./pdf-polyfill.js";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
