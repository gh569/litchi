// src/_utils/parse-links.jsx
import { Fragment } from "preact";

// 关键：整个匹配用 () 包起来（捕获组），split 才会保留链接；内部用 (?:) 避免多余元素
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"'，。；：！？、（）【】《》「」『』]+)/gi;
const IS_URL = /^(https?:\/\/|www\.)/i;

const OPEN  = "([{（「『";
const CLOSE = ")]}）」』";
const END   = ",;:!?，。；：！？、》";

function cleanUrlEnd(url) {
  let s = url;
  let prev;
  do {
    prev = s;
    for (let i = 0; i < CLOSE.length; i++) {
      const c = CLOSE[i], o = OPEN[i];
      if (s.endsWith(c)) {
        const body = s.slice(0, -1);
        let oc = 0, cc = 0;
        for (const ch of body) {
          if (ch === o) oc++;
          if (ch === c) cc++;
        }
        if (oc <= cc) s = body;
      }
    }
  } while (prev !== s);

  while (s.length && END.includes(s[s.length - 1])) {
    s = s.slice(0, -1);
  }
  if (!/[a-z0-9](\.[a-z0-9]{1,10})$/i.test(s) && s.endsWith(".")) {
    s = s.slice(0, -1);
  }
  return s;
}

export function parseLinks(text) {
  if (!text) return null;
  return text.split(URL_PATTERN).map((part, i) => {
    if (IS_URL.test(part)) {
      const cleaned = cleanUrlEnd(part);
      const href = /^https?:\/\//i.test(cleaned) ? cleaned : "http://" + cleaned;
      const tail = part.slice(cleaned.length);
      return (
        <Fragment key={i}>
          <a href={href} target="_blank" rel="noopener noreferrer">{cleaned}</a>
          {tail}
        </Fragment>
      );
    }
    return part;
  });
}
