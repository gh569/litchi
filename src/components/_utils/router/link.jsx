import { useLocation } from "wouter-preact";
import { getIsHashRoute } from "./router-mode";

// 是否为外部链接（带协议：http(s)://、//、mailto: 等），此类不做解析、走浏览器原生跳转
function isExternal(to) {
  return typeof to === "string" && (/^(https?:)?\/\//.test(to) || /^[a-z][a-z0-9+.-]*:/i.test(to));
}

// 把相对路径（./user、../user）基于当前路由 location 解析成「路径+query」；绝对路径原样返回
// （与 useNavigate 内部同一套 URL 基准解析）
function resolveTo(to, location) {
  if (isExternal(to) || typeof to !== "string") return to;
  const base = "http://x" + (location.endsWith("/") ? location : location + "/");
  const parsed = new URL(to, base);
  return parsed.pathname + parsed.search;
}

export function Link({ to, replace = false, children, ...props }) {
  const [location, navigate] = useLocation();

  const handleClick = (e) => {
    // 1. 如果用户传入了自定义的 onClick，先执行用户的逻辑
    if (props.onClick) {
      props.onClick(e);
    }

    // 2. 如果事件已经被阻止（比如用户的 onClick 里调用了 e.preventDefault()），则不再处理路由
    if (e.defaultPrevented) {
      return;
    }

    // 3. 外部链接或者非同源链接，应该让 <a> 标签执行默认行为，直接跳转并刷新页面
    if (isExternal(to)) {
      return; // 不阻止默认行为，让浏览器原生跳转
    }

    // 4. 阻止 <a> 标签的默认跳转行为（防止页面刷新）
    e.preventDefault();

    // 5. 解析相对路径后用 wouter 的 navigate 进行路由跳转
    navigate(resolveTo(to, location), { replace });
  };

  // href 同样用解析后的路径：相对 to 下中键/新标签页打开才不会跳错；
  // hash 模式路由在 # 后，href 需带 # 前缀
  const resolved = resolveTo(to, location);
  const href = !isExternal(to) && getIsHashRoute() ? "#" + resolved : resolved;

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
