import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import * as XLSX from "xlsx";
import Error from "@com/error";
import style from "./excel-preview.module.css";
/* ---------- 电子表格风格渲染 ----------
 * 整张表用 preact vnode 渲染，文本转义交给 preact 自身处理。
 * 保留列标（A/B/C）、行号、列宽、行高、合并单元格与数字右对齐。
 * 全部类名统一走 css module（style['xxx']），不再拼接 HTML / style 标签。
 */

const columnIndexToLetter = (index) => {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

const cellText = (cell) => {
  if (!cell) return "";
  if (cell.w != null) return cell.w; // 格式化后的显示值（日期、货币等）
  if (cell.v != null) return String(cell.v);
  return "";
};

const cellClass = (cell, isFirstRow) => {
  const parts = [style["grid-cell"], style.cell];
  if (isFirstRow) parts.push(style["cell-head"]);
  if (cell && cell.t === "n") parts.push(style["cell-num"]);
  else if (cell && cell.t === "b") parts.push(style["cell-bool"]);
  else if (!cell || cell.v == null) parts.push(style["cell-empty"]);
  return parts.join(" ");
};

// 找出最右边有数据的列，避免渲染出大片空白列
const lastContentCol = (ws, range) => {
  for (let c = range.e.c; c >= range.s.c; c--) {
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v != null) return c;
    }
  }
  return range.s.c;
};

const buildSheet = (ws) => {
  if (!ws || !ws["!ref"]) {
    return <div className={style["sheet-empty"]}>（空工作表）</div>;
  }
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const cols = ws["!cols"] || [];
  const rowsMeta = ws["!rows"] || [];
  const merges = ws["!merges"] || [];

  // 合并单元格：锚点记录跨度，其余位置跳过
  const spans = new Map();
  const skip = new Set();
  for (const m of merges) {
    spans.set(`${m.s.r}:${m.s.c}`, {
      rowSpan: m.e.r - m.s.r + 1,
      colSpan: m.e.c - m.s.c + 1,
    });
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue;
        skip.add(`${r}:${c}`);
      }
    }
  }

  const colCount = lastContentCol(ws, range);

  // 列宽（Excel 以字符宽记录，约 7px/字符 + 5px 边距）
  const colEls = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const col = cols[c] || {};
    const width = col.wpx || (col.wch || col.width ? Math.round((col.wch || col.width) * 7 + 5) : 0);
    colEls.push(width > 0 ? <col key={c} style={`width:${width}px`} /> : <col key={c} />);
  }

  const headCells = [];
  for (let c = range.s.c; c <= colCount; c++) {
    headCells.push(
      <th key={c} className={`${style["grid-cell"]} ${style["col-head"]}`}>
        {columnIndexToLetter(c)}
      </th>
    );
  }

  const bodyRows = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const meta = rowsMeta[r] || {};
    const height = meta.hpx || (meta.hpt ? Math.round(meta.hpt * (4 / 3)) : 0);
    const cells = [];
    for (let c = range.s.c; c <= colCount; c++) {
      const key = `${r}:${c}`;
      if (skip.has(key)) continue;
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      const span = spans.get(key);
      const cellProps = { key: c, className: cellClass(cell, r === range.s.r) };
      if (span && span.colSpan > 1) cellProps.colSpan = span.colSpan;
      if (span && span.rowSpan > 1) cellProps.rowSpan = span.rowSpan;
      const text = cellText(cell);
      cells.push(
        text ? (
          <td {...cellProps} title={text}>
            {text}
          </td>
        ) : (
          <td {...cellProps} />
        )
      );
    }
    bodyRows.push(
      <tr key={r} style={height ? `height:${height}px` : undefined}>
        <th className={`${style["grid-cell"]} ${style["row-head"]}`}>{r + 1}</th>
        {cells}
      </tr>
    );
  }

  return (
    <table className={style["sheet-table"]}>
      <colgroup>{colEls}</colgroup>
      <thead>
        <tr>
          <th className={`${style["grid-cell"]} ${style.corner}`} />
          {headCells}
        </tr>
      </thead>
      <tbody>{bodyRows}</tbody>
    </table>
  );
};

const ExcelPreview = ({ arrayBuffer }) => {
  const [sheets, setSheets] = useState([]);
  const [parseError, setParseError] = useState("");
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // 解析放在组件内：页面只负责把文件字节取回来，不依赖 xlsx
  useEffect(() => {
    setActiveSheetIndex(0);
    if (!arrayBuffer) {
      setSheets([]);
      setParseError("");
      return;
    }
    try {
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      setSheets(
        workbook.SheetNames.map((name, index) => ({
          name,
          index,
          node: buildSheet(workbook.Sheets[name]),
        }))
      );
      setParseError("");
    } catch (e) {
      console.error("Excel 解析失败:", e);
      setSheets([]);
      setParseError("Excel 文件解析失败，请检查文件是否损坏。");
    }
  }, [arrayBuffer]);

  if (parseError) {
    return <Error message={parseError} />;
  }

  if (sheets.length === 0) return null;

  const currentIndex = activeSheetIndex < sheets.length ? activeSheetIndex : 0;

  return (
    <div className={style["excel-wrapper"]}>
      <div className={style["sheet-tabs"]}>
        {sheets.map((sheet, index) => (
          <button
            key={index}
            className={`${style["tab-button"]} ${index === currentIndex ? style["active"] : ""}`}
            onClick={() => setActiveSheetIndex(index)}
          >
            {sheet.name}
          </button>
        ))}
      </div>
      <div className={style["sheet-content"]}>{sheets[currentIndex].node}</div>
    </div>
  );
};

export default ExcelPreview;
