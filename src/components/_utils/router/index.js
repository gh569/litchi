// src/components/_utils/router/index.js
// 路由相关工具统一出口。
// 使用：import { useNavigate, useHashLocation, Link, getIsHashRoute } from "@utils/router";
export { useHashLocation } from "./use-hash-location";
export { useNavigate } from "./use-navigate";
export { Link } from "./link";
export { setRouterMode, getIsHashRoute } from "./router-mode";
