import { useLocation } from "wouter-preact";
import { getIsHashRoute } from "./router-mode";

function isAbsoluteUrl(url) {
  return /^(https?:)?\/\//.test(url);
}

/**
 * 路由导航（合并 useNavigate + useOpenNewTab）：
 * 默认在当前标签页跳转；传 { openInNewTab: true } 则新标签页打开。
 * Hash 模式：query 放主 URL search（# 前），路由路径放 # 后；history 模式：path?query。
 * 支持相对路径（./user、../user），基于当前路由解析。
 * @returns {Function} navigate(to, options)
 *   to: 目标路径（支持相对/绝对/外部绝对链接）
 *   options.openInNewTab: 是否新标签页打开
 */
export function useNavigate() {
  const [location, wouterNavigate] = useLocation();

  return (to, options = {}) => {
    // 外部绝对链接（http://、https://、//）始终新标签页打开
    if (isAbsoluteUrl(to)) {
      window.open(to, "_blank", "noopener,noreferrer");
      return;
    }

    const { openInNewTab = false, ...navOptions } = options;

    // 相对路径解析基准（当前路由，末尾强制补斜杠，保证 ./ 进入子目录）
    const base = "http://x" + (location.endsWith("/") ? location : location + "/");
    const parsed = new URL(to, base);
    const routePath = parsed.pathname;
    const pageSearch = parsed.search;
/**
    if (openInNewTab) {
      const isHash = getIsHashRoute();
      const basePath = isHash
        ? window.location.origin + window.location.pathname
        : window.location.origin;
      const openUrl = isHash
        ? basePath + pageSearch + "#" + routePath
        : basePath + routePath + pageSearch;
      window.open(openUrl, "_blank", "noopener,noreferrer");
      return;
    }
*/
    // 当前页跳转（wouter：hash 模式下 query 自动放到主 URL search，useSearch 可读）
    wouterNavigate(routePath + pageSearch, navOptions);
  };
}
