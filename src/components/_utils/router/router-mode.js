/**
 * 路由模式（单一来源，按入口运行时设置）。
 *
 * 本项目有多个入口：
 * - 主入口 index.html：启动时 setRouterMode(__ROUTER_MODE__)（vite.config 配置，可 hash/history）
 * - work、zxm 独立入口：恒为 hash，固定 useHashLocation，不依赖本模块
 * - 未调用 setRouterMode 的入口：默认 hash
 *
 * 各入口是独立页面运行时（各自的 window / module 实例），设置互不影响。
 * 不要用 URL 形态（如 hash 是否以 "#/" 开头）去推断模式，那会误判。
 */
let ROUTER_MODE = "hash";

/** 设置当前入口的路由模式：仅接受 "hash" 或 "history" */
export function setRouterMode(mode) {
  if (mode === "hash" || mode === "history") ROUTER_MODE = mode;
}

/** 当前入口是否为 hash 路由（函数调用，获取运行时状态） */
export function getIsHashRoute() {
  return ROUTER_MODE === "hash";
}

