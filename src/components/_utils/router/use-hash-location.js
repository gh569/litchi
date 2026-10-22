// src/components/_utils/use-hash-location.js
//
// 基于 wouter-preact 内置 useHashLocation 的实现，唯一改动：
// 在 subscribe 里同时监听 popstate，解决“带 search 跳转后回退，页面不更新”的问题。
// （wouter 内置版只监听 hashchange，而回退若触发 popstate 优先、hashchange 未触发，
//   会导致 useLocation 感知不到路由变化而不重渲染。）
//
// navigate 行为与 wouter 内置完全一致：query 放到主 URL search，hash 只留纯路径。
import { useSyncExternalStore } from "preact/compat";

// 订阅回调列表
const listeners = { v: [] };

const onHashChange = () => listeners.v.forEach((cb) => cb());

const subscribeToHashUpdates = (callback) => {
  if (listeners.v.push(callback) === 1) {
    addEventListener("hashchange", onHashChange);
    addEventListener("popstate", onHashChange); // 关键：回退（popstate）时也触发更新
  }

  return () => {
    listeners.v = listeners.v.filter((i) => i !== callback);
    if (!listeners.v.length) {
      removeEventListener("hashchange", onHashChange);
      removeEventListener("popstate", onHashChange);
    }
  };
};

// 只取 hash 路径，忽略主 URL 的 search（query 由 useSearch 从 location.search 读取）
const currentHashLocation = () => "/" + location.hash.replace(/^#?\/?/, "");

export const navigate = (to, { state = null, replace = false } = {}) => {
  const oldURL = location.href;

  const [hash, search] = to.replace(/^#?\/?/, "").split("?");

  const url = new URL(location.href);
  url.hash = `/${hash}`;
  if (search) url.search = search;
  const newURL = url.href;

  if (replace) {
    history.replaceState(state, "", newURL);
  } else {
    history.pushState(state, "", newURL);
  }

  const event =
    typeof HashChangeEvent !== "undefined"
      ? new HashChangeEvent("hashchange", { oldURL, newURL })
      : new Event("hashchange", { detail: { oldURL, newURL } });

  dispatchEvent(event);
};

export const useHashLocation = ({ ssrPath = "/" } = {}) => [
  useSyncExternalStore(subscribeToHashUpdates, currentHashLocation, () => ssrPath),
  navigate,
];

useHashLocation.hrefs = (href) => "#" + href;
