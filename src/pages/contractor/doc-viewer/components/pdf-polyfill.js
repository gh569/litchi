/* pdfjs-dist v5/v6 使用了大量较新的运行时 API，移动端旧内核（微信 X5、
 * 旧版 Android WebView 等，约 Chrome 94~118 区间）没有，必须一次性补齐，
 * 否则每撞一个错就修一轮。扫描 build/pdf.mjs 与 build/pdf.worker.mjs 得到
 * 的完整清单（本文件全部覆盖，仅在宿主缺失时安装）：
 * - Promise.withResolvers（Chrome 119+）
 * - Promise.try（Chrome 134+）
 * - Uint8Array.prototype.toHex / toBase64、Uint8Array.fromHex / fromBase64
 *   （Chrome 138+）
 * - Map / WeakMap .getOrInsertComputed（Chrome 134+）
 * - URL.parse 静态方法（Chrome 126+）
 * - Object.hasOwn（Chrome 93+）
 * - Array / String / TypedArray .at（Chrome 92+）
 * - Array .findLast / .findLastIndex（Chrome 97+）
 * - structuredClone（Chrome 98+）
 * - crypto.randomUUID（Chrome 92+，且仅安全上下文可用，非 HTTPS 时缺失）
 *
 * 使用位置（两处都要引，且必须排在 pdfjs 导入之前）：
 * 1. pdf-canvas-viewer.jsx 顶部 → 覆盖主线程与 fake worker 回退路径；
 * 2. pdf.worker.bundle.js 顶部 → 随自建 worker 打包，在 worker 全局执行。
 */

const define = (target, key, value) => {
  if (target && typeof target[key] === "undefined") {
    try {
      Object.defineProperty(target, key, {
        value,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    } catch (e) {
      try {
        target[key] = value;
      } catch (e2) {
        /* ignore */
      }
    }
  }
};

/* ---------- Promise ---------- */
if (typeof Promise !== "undefined") {
  define(Promise, "withResolvers", function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  });
  define(Promise, "try", function tryFn(callback, ...args) {
    try {
      return Promise.resolve(
        typeof callback === "function" ? callback(...args) : callback,
      );
    } catch (e) {
      return Promise.reject(e);
    }
  });
}

/* ---------- Object.hasOwn ---------- */
if (typeof Object !== "undefined") {
  define(Object, "hasOwn", function hasOwn(target, prop) {
    return Object.prototype.hasOwnProperty.call(target, prop);
  });
}

/* ---------- URL.parse（静态，解析失败返回 null 而非抛错） ---------- */
if (typeof URL !== "undefined") {
  define(URL, "parse", function parse(input, base) {
    try {
      return arguments.length > 1 ? new URL(input, base) : new URL(input);
    } catch (e) {
      return null;
    }
  });
}

/* ---------- Map / WeakMap getOrInsertComputed ---------- */
const installGetOrInsertComputed = (proto) => {
  define(
    proto,
    "getOrInsertComputed",
    function getOrInsertComputed(key, valueCreator) {
      if (this.has(key)) return this.get(key);
      const value = valueCreator(key);
      this.set(key, value);
      return value;
    },
  );
};
if (typeof Map !== "undefined") installGetOrInsertComputed(Map.prototype);
if (typeof WeakMap !== "undefined") {
  installGetOrInsertComputed(WeakMap.prototype);
}

/* ---------- Array / String / TypedArray .at ---------- */
define(Array.prototype, "at", function at(index) {
  let n = Math.trunc(index) || 0;
  if (n < 0) n += this.length;
  if (n < 0 || n >= this.length) return undefined;
  return this[n];
});
define(String.prototype, "at", function at(index) {
  let n = Math.trunc(index) || 0;
  if (n < 0) n += this.length;
  if (n < 0 || n >= this.length) return undefined;
  return this[n];
});
if (typeof Uint8Array !== "undefined") {
  // Uint8Array.prototype 的原型即 %TypedArray%，在这里定义覆盖所有 TypedArray
  define(
    Object.getPrototypeOf(Uint8Array.prototype),
    "at",
    function at(index) {
      let n = Math.trunc(index) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    },
  );
}

/* ---------- Array findLast / findLastIndex ---------- */
define(Array.prototype, "findLast", function findLast(predicate, thisArg) {
  const len = this.length;
  for (let i = len - 1; i >= 0; i--) {
    if (predicate.call(thisArg, this[i], i, this)) return this[i];
  }
  return undefined;
});
define(Array.prototype, "findLastIndex", function findLastIndex(predicate, thisArg) {
  const len = this.length;
  for (let i = len - 1; i >= 0; i--) {
    if (predicate.call(thisArg, this[i], i, this)) return i;
  }
  return -1;
});

/* ---------- Uint8Array toHex / toBase64 / fromHex / fromBase64 ---------- */
if (typeof Uint8Array !== "undefined") {
  const HEX = "0123456789abcdef";
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  const bytesToBin = (u8) => {
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < u8.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
    }
    return bin;
  };

  const manualBase64 = (u8) => {
    let out = "";
    for (let i = 0; i < u8.length; i += 3) {
      const b0 = u8[i];
      const b1 = i + 1 < u8.length ? u8[i + 1] : 0;
      const b2 = i + 2 < u8.length ? u8[i + 2] : 0;
      const n = (b0 << 16) | (b1 << 8) | b2;
      out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
      out += i + 1 < u8.length ? B64[(n >> 6) & 63] : "=";
      out += i + 2 < u8.length ? B64[n & 63] : "=";
    }
    return out;
  };

  define(Uint8Array.prototype, "toHex", function toHex() {
    let out = "";
    for (let i = 0; i < this.length; i++) {
      out += HEX[this[i] >> 4] + HEX[this[i] & 15];
    }
    return out;
  });
  define(Uint8Array.prototype, "toBase64", function toBase64(options) {
    let b64;
    try {
      b64 = typeof btoa === "function" ? btoa(bytesToBin(this)) : manualBase64(this);
    } catch (e) {
      b64 = manualBase64(this);
    }
    if (options && options.alphabet === "base64url") {
      b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }
    return b64;
  });

  const TypedArrayCtor = Object.getPrototypeOf(Uint8Array);
  define(TypedArrayCtor, "fromHex", function fromHex(hex) {
    const s = String(hex).replace(/\s+/g, "");
    const len = s.length >> 1;
    const u8 = new this(len);
    for (let i = 0; i < len; i++) {
      u8[i] = parseInt(s.substr(i * 2, 2), 16);
    }
    return u8;
  });
  define(TypedArrayCtor, "fromBase64", function fromBase64(b64, options) {
    let s = String(b64).replace(/\s+/g, "");
    if (options && options.alphabet === "base64url") {
      s = s.replace(/-/g, "+").replace(/_/g, "/");
    }
    while (s.length % 4) s += "=";
    let bin;
    try {
      bin = typeof atob === "function" ? atob(s) : null;
    } catch (e) {
      bin = null;
    }
    if (bin === null) {
      bin = "";
      for (let i = 0; i < s.length; i += 4) {
        const n =
          (B64.indexOf(s[i]) << 18) |
          (B64.indexOf(s[i + 1]) << 12) |
          ((B64.indexOf(s[i + 2]) & 63) << 6) |
          (B64.indexOf(s[i + 3]) & 63);
        bin += String.fromCharCode((n >> 16) & 255);
        if (s[i + 2] !== "=") bin += String.fromCharCode((n >> 8) & 255);
        if (s[i + 3] !== "=") bin += String.fromCharCode(n & 255);
      }
    }
    const u8 = new this(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  });
}

/* ---------- structuredClone 基础兜底 ----------
 * 深拷贝常见可序列化类型（Date/RegExp/TypedArray/ArrayBuffer/Map/Set/Array/
 * 普通对象），忽略 transfer 语义；覆盖 pdfjs fake worker 回退（LoopbackPort）
 * 与少量对象克隆场景。 */
define(globalThis, "structuredClone", function structuredClone(value) {
  const seen = new Map();
  const clone = (v) => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) return seen.get(v);
    if (v instanceof Date) return new Date(v.getTime());
    if (v instanceof RegExp) return new RegExp(v.source, v.flags);
    if (ArrayBuffer.isView(v)) {
      const Ctor = v.constructor;
      return new Ctor(v.slice(0));
    }
    if (v instanceof ArrayBuffer) return v.slice(0);
    if (typeof SharedArrayBuffer === "function" && v instanceof SharedArrayBuffer) {
      return v;
    }
    if (Array.isArray(v)) {
      const out = [];
      seen.set(v, out);
      for (let i = 0; i < v.length; i++) out[i] = clone(v[i]);
      return out;
    }
    if (v instanceof Map) {
      const out = new Map();
      seen.set(v, out);
      v.forEach((val, key) => out.set(clone(key), clone(val)));
      return out;
    }
    if (v instanceof Set) {
      const out = new Set();
      seen.set(v, out);
      v.forEach((val) => out.add(clone(val)));
      return out;
    }
    if (typeof ImageBitmap !== "undefined" && v instanceof ImageBitmap) return v;
    const out = Object.create(Object.getPrototypeOf(v));
    seen.set(v, out);
    for (const key of Reflect.ownKeys(v)) {
      const desc = Object.getOwnPropertyDescriptor(v, key);
      if (desc.get || desc.set) {
        Object.defineProperty(out, key, desc);
      } else {
        out[key] = clone(v[key]);
      }
    }
    return out;
  };
  return clone(value);
});

/* ---------- crypto.randomUUID ----------
 * 要求安全上下文，站点走 HTTP 或非 HTTPS WebView 时即便内核较新也可能缺失。 */
if (typeof globalThis.crypto === "object" && globalThis.crypto) {
  define(globalThis.crypto, "randomUUID", function randomUUID() {
    const bytes = new Uint8Array(16);
    if (typeof globalThis.crypto.getRandomValues === "function") {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let hex = "";
    for (let i = 0; i < 16; i++) {
      hex += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
    }
    return (
      hex.slice(0, 8) +
      "-" +
      hex.slice(8, 12) +
      "-" +
      hex.slice(12, 16) +
      "-" +
      hex.slice(16, 20) +
      "-" +
      hex.slice(20)
    );
  });
}

export {};
