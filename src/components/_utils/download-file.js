/**
 * 浏览器端下载文件（直接方式）：
 * 同源时 download 属性生效，正常下载；
 * 跨域时浏览器会忽略 download，按文件类型尽力处理（可下载则下载，否则打开）。
 * @param {string} src - 文件 URL
 * @param {string} [filename] - 下载文件名（缺省用 "download"）
 */
function downloadFile(src, filename) {
  const a = document.createElement("a");
  a.href = src;
  a.download = filename || "download";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export { downloadFile }
