var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// .wrangler/tmp/bundle-r25UDX/checked-fetch.js
var require_checked_fetch = __commonJS({
  ".wrangler/tmp/bundle-r25UDX/checked-fetch.js"() {
    "use strict";
    var urls = /* @__PURE__ */ new Set();
    function checkURL(request, init) {
      const url = request instanceof URL ? request : new URL(
        (typeof request === "string" ? new Request(request, init) : request).url
      );
      if (url.port && url.port !== "443" && url.protocol === "https:") {
        if (!urls.has(url.toString())) {
          urls.add(url.toString());
          console.warn(
            `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
          );
        }
      }
    }
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// .wrangler/tmp/bundle-r25UDX/middleware-loader.entry.ts
var import_checked_fetch33 = __toESM(require_checked_fetch());

// wrangler-modules-watch:wrangler:modules-watch
var import_checked_fetch = __toESM(require_checked_fetch());

// .wrangler/tmp/bundle-r25UDX/middleware-insertion-facade.js
var import_checked_fetch31 = __toESM(require_checked_fetch());

// worker/index.ts
var import_checked_fetch28 = __toESM(require_checked_fetch());

// node_modules/hono/dist/index.js
var import_checked_fetch25 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/hono.js
var import_checked_fetch24 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/hono-base.js
var import_checked_fetch12 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/compose.js
var import_checked_fetch2 = __toESM(require_checked_fetch(), 1);
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/context.js
var import_checked_fetch9 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/request.js
var import_checked_fetch7 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/http-exception.js
var import_checked_fetch3 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/request/constants.js
var import_checked_fetch4 = __toESM(require_checked_fetch(), 1);
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var import_checked_fetch5 = __toESM(require_checked_fetch(), 1);
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var import_checked_fetch6 = __toESM(require_checked_fetch(), 1);
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var import_checked_fetch8 = __toESM(require_checked_fetch(), 1);
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var import_checked_fetch10 = __toESM(require_checked_fetch(), 1);
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var import_checked_fetch11 = __toESM(require_checked_fetch(), 1);
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/index.js
var import_checked_fetch18 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/router/reg-exp-router/router.js
var import_checked_fetch16 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var import_checked_fetch13 = __toESM(require_checked_fetch(), 1);
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var import_checked_fetch14 = __toESM(require_checked_fetch(), 1);
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var import_checked_fetch15 = __toESM(require_checked_fetch(), 1);
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/reg-exp-router/prepared-router.js
var import_checked_fetch17 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/router/smart-router/index.js
var import_checked_fetch20 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/router/smart-router/router.js
var import_checked_fetch19 = __toESM(require_checked_fetch(), 1);
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/index.js
var import_checked_fetch23 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/router/trie-router/router.js
var import_checked_fetch22 = __toESM(require_checked_fetch(), 1);

// node_modules/hono/dist/router/trie-router/node.js
var import_checked_fetch21 = __toESM(require_checked_fetch(), 1);
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var import_checked_fetch26 = __toESM(require_checked_fetch(), 1);
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// worker/fcm-v1.ts
var import_checked_fetch27 = __toESM(require_checked_fetch());
async function getAccessTokenFromServiceAccount(serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const {
      client_email,
      private_key
    } = serviceAccount;
    const header = {
      alg: "RS256",
      typ: "JWT"
    };
    const now = Math.floor(Date.now() / 1e3);
    const claims = {
      iss: client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    };
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const encodedClaims = btoa(JSON.stringify(claims)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signatureInput = `${encodedHeader}.${encodedClaims}`;
    const keyData = private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
    const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      encoder.encode(signatureInput)
    );
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = `${signatureInput}.${encodedSignature}`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[OAuth] Token exchange failed:", errorText);
      return null;
    }
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("[OAuth] Error generating access token:", error.message);
    return null;
  }
}
__name(getAccessTokenFromServiceAccount, "getAccessTokenFromServiceAccount");
async function sendFCMNotificationV1(serviceAccountJson, token, payload) {
  try {
    console.log(`[FCM v1] ====== Sending Notification ======`);
    console.log(`[FCM v1] Token: ${token.substring(0, 40)}...`);
    console.log(`[FCM v1] Title: ${payload.title}`);
    console.log(`[FCM v1] Body: ${payload.body}`);
    console.log(`[FCM v1] Data: ${JSON.stringify(payload.data)}`);
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    console.log("[FCM v1] Generating OAuth access token...");
    const accessToken = await getAccessTokenFromServiceAccount(serviceAccountJson);
    if (!accessToken) {
      console.error("[FCM v1] Failed to get access token");
      return false;
    }
    console.log("[FCM v1] Access token generated successfully");
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const messageBody = {
      token,
      notification: {
        title: payload.title || "",
        body: payload.body || ""
      },
      data: {
        ...payload.data || {},
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "high_importance_channel_v2",
          visibility: "PUBLIC",
          notification_priority: "PRIORITY_MAX",
          sound: "iphone_notificacao"
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body
            },
            sound: "iphone_notificacao.caf",
            badge: 1,
            "interruption-level": "critical"
          }
        }
      }
    };
    if (payload.title || payload.body) {
      messageBody.notification = {
        title: payload.title || "",
        body: payload.body || ""
      };
    }
    const message = { message: messageBody };
    const isUrgent = payload.data?.type === "new_service" || payload.data?.type === "offer";
    if (isUrgent) {
      console.log("[FCM v1] Urgent offer detected. Sending both notification and data for maximum visibility.");
    }
    console.log(`[FCM v1] Sending to: ${url}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(message)
    });
    const responseText = await response.text();
    console.log(`[FCM v1] Response Status: ${response.status}`);
    console.log(`[FCM v1] Response Body: ${responseText}`);
    if (response.ok) {
      console.log(`[FCM v1] \u2705 Notification sent successfully`);
      return true;
    } else {
      console.error(`[FCM v1] \u274C Failed to send notification: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("[FCM v1] \u274C Error:", error.message);
    console.error("[FCM v1] Stack:", error.stack);
    return false;
  }
}
__name(sendFCMNotificationV1, "sendFCMNotificationV1");

// worker/index.ts
if (typeof process === "undefined") {
  globalThis.process = { env: {} };
}
var app = new Hono2();
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "Upgrade-Insecure-Requests"],
  allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
  exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
  maxAge: 600,
  credentials: true
}));
app.get("/", (c) => c.text("Projeto Central Backend - Cloudflare Worker \u{1F680}"));
app.get("/health", (c) => c.json({ ok: true, environment: "edge", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
app.get("/api/debug/db-stats", async (c) => {
  try {
    const db = c.env.DB;
    const profCount = await db.prepare("SELECT COUNT(*) as count FROM professions").first();
    const taskCount = await db.prepare("SELECT COUNT(*) as count FROM task_catalog").first();
    const sample = await db.prepare("SELECT name FROM professions LIMIT 5").all();
    return c.json({
      success: true,
      database: "ai-service-db",
      counts: {
        professions: profCount?.count || 0,
        tasks: taskCount?.count || 0
      },
      sample_professions: sample.results?.map((r) => r.name) || []
    });
  } catch (error) {
    return c.json({ success: false, message: "D1 Query Error", error: error.message }, 500);
  }
});
app.get("/api/debug/ping-ai", async (c) => {
  const results = { binding: null, url: null };
  if (c.env.AI_SERVICE) {
    try {
      const res = await c.env.AI_SERVICE.fetch("https://ai-service/health");
      results.binding = {
        ok: res.ok,
        status: res.status,
        data: res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text()
      };
    } catch (e) {
      results.binding = { error: e.message };
    }
  }
  if (c.env.AI_SERVICE_URL) {
    try {
      const res = await fetch(`${c.env.AI_SERVICE_URL}/health`);
      results.url = {
        ok: res.ok,
        status: res.status,
        data: res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text()
      };
    } catch (e) {
      results.url = { error: e.message };
    }
  }
  return c.json({
    success: true,
    ai_service_config: {
      has_binding: !!c.env.AI_SERVICE,
      url_env: c.env.AI_SERVICE_URL
    },
    results
  });
});
app.get("/api/services/professions", async (c) => {
  try {
    const db = c.env.DB;
    const result = await db.prepare(`
            SELECT p.name as profession_name, t.id, t.name, t.unit_price, t.unit_name
            FROM professions p
            LEFT JOIN task_catalog t ON p.id = t.profession_id
            WHERE t.active = 1 OR t.id IS NULL
            ORDER BY p.name ASC, t.name ASC
        `).all();
    const structure = {};
    if (result.results) {
      for (const row of result.results) {
        const profName = row.profession_name;
        if (!structure[profName]) {
          structure[profName] = [];
        }
        if (row.id) {
          structure[profName].push({
            id: row.id,
            name: row.name,
            price: Number(row.unit_price) || 0,
            unit: row.unit_name
          });
        }
      }
    }
    return c.json(structure);
  } catch (error) {
    console.error("Professions Map Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/services/professions/:id/tasks", async (c) => {
  const id = c.req.param("id");
  try {
    const db = c.env.DB;
    const result = await db.prepare(`
            SELECT id, name, unit_price, unit_name
            FROM task_catalog
            WHERE profession_id = ? AND active = 1
            ORDER BY name ASC
        `).bind(id).all();
    return c.json({
      success: true,
      tasks: result.results || []
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/auth/professions", async (c) => {
  try {
    const db = c.env.DB;
    const result = await db.prepare("SELECT * FROM professions ORDER BY name ASC").all();
    return c.json({
      success: true,
      professions: result.results || []
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(atob(base64).split("").map(function(c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(""));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
__name(decodeJwt, "decodeJwt");
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
__name(calculateDistance, "calculateDistance");
async function findNearbyProviders(db, profession, latitude, longitude, radiusKm = 50) {
  try {
    console.log(`[Providers] ====== Finding Nearby Providers ======`);
    console.log(`[Providers] Profession: ${profession}`);
    console.log(`[Providers] Location: ${latitude}, ${longitude}`);
    console.log(`[Providers] Radius: ${radiusKm}km`);
    const providers = await db.prepare(`
            SELECT DISTINCT 
                u.id, u.fcm_token,
                loc.latitude, loc.longitude
            FROM users u
            JOIN providers p ON u.id = p.user_id
            JOIN provider_locations loc ON u.id = loc.provider_id
            JOIN provider_professions pp ON u.id = pp.provider_user_id
            JOIN professions prof ON pp.profession_id = prof.id
            WHERE u.role = 'provider'
              AND prof.name LIKE ?
              AND u.fcm_token IS NOT NULL
              AND u.fcm_token != ''
        `).bind(`%${profession}%`).all();
    console.log(`[Providers] Query returned ${providers.results?.length || 0} results`);
    if (providers.results && providers.results.length > 0) {
      console.log(`[Providers] Raw data:`, JSON.stringify(providers.results, null, 2));
    }
    if (!providers.results || providers.results.length === 0) {
      console.log(`[Providers] \u26A0\uFE0F No providers found for profession: ${profession}`);
      return [];
    }
    const nearby = providers.results.filter((p) => {
      if (!p.latitude || !p.longitude) {
        console.log(`[Providers] Provider ${p.id} has no location data`);
        return false;
      }
      const distance = calculateDistance(latitude, longitude, p.latitude, p.longitude);
      console.log(`[Providers] Provider ${p.id} is ${distance.toFixed(2)}km away`);
      return distance <= radiusKm;
    });
    console.log(`[Providers] \u2705 Found ${nearby.length} nearby providers for ${profession}`);
    return nearby.map((p) => ({ userId: p.id, fcmToken: p.fcm_token }));
  } catch (error) {
    console.error("[Providers] \u274C Error finding providers:", error.message);
    console.error("[Providers] Stack:", error.stack);
    return [];
  }
}
__name(findNearbyProviders, "findNearbyProviders");
async function triggerServiceNotifications(serviceId, db, env, executionCtx) {
  try {
    console.log(`[Escalation] ====== Starting Dispatch for Service: ${serviceId} ======`);
    const service = await db.prepare(`
            SELECT status, profession, latitude, longitude
            FROM service_requests WHERE id = ?
        `).bind(serviceId).first();
    if (!service) {
      console.error(`[Escalation] Service ${serviceId} not found`);
      return;
    }
    const providers = await findProvidersByDistance(db, service.profession, service.latitude, service.longitude, 50);
    if (providers.length === 0) {
      console.warn(`[Escalation] No providers found for ${service.profession}.`);
      return;
    }
    const id = env.DISPATCH_MANAGER.idFromName(serviceId);
    const obj = env.DISPATCH_MANAGER.get(id);
    executionCtx.waitUntil(
      obj.fetch(new Request(`http://dispatch/start`, {
        method: "POST",
        body: JSON.stringify({ serviceId, providers })
      }))
    );
    console.log(`[Escalation] Sequential dispatch handed off to Durable Object for ${serviceId}`);
  } catch (error) {
    console.error("[Escalation] \u274C Fatal Error:", error.message);
  }
}
__name(triggerServiceNotifications, "triggerServiceNotifications");
async function findProvidersByDistance(db, profession, latitude, longitude, maxRadiusKm = 50) {
  try {
    console.log(`[ProvidersDistance] ====== Finding Providers via Registry (optimized SQL) ======`);
    console.log(`[ProvidersDistance] Profession: ${profession}`);
    console.log(`[ProvidersDistance] Location: ${latitude}, ${longitude}`);
    console.log(`[ProvidersDistance] Max Radius: ${maxRadiusKm}km`);
    const result = await db.prepare(`
            SELECT user_id, fcm_token, 
                (6371 * acos(
                    cos(radians(?1)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(?2)) + 
                    sin(radians(?1)) * sin(radians(latitude))
                )) AS distance 
            FROM notification_registry 
            WHERE is_online = 1 
              AND professions LIKE ?3 
              AND fcm_token IS NOT NULL
              AND fcm_token != ''
            GROUP BY user_id
            HAVING distance <= ?4 
            ORDER BY distance ASC 
            LIMIT 20
        `).bind(latitude, longitude, `%${profession}%`, maxRadiusKm).all();
    if (!result.results || result.results.length === 0) {
      console.log(`[ProvidersDistance] \u26A0\uFE0F No registry entries found for profession: ${profession}`);
      return [];
    }
    const providers = result.results.map((r) => ({
      userId: Number(r.user_id),
      fcmToken: r.fcm_token,
      distance: Number(r.distance)
    }));
    console.log(`[ProvidersDistance] \u2705 Found ${providers.length} providers via SQL`);
    providers.forEach((p, i) => {
      console.log(`[ProvidersDistance] #${i + 1}: Provider ${p.userId} - ${p.distance.toFixed(2)}km`);
    });
    return providers;
  } catch (error) {
    console.error("[ProvidersDistance] \u274C SQL Error:", error.message);
    return [];
  }
}
__name(findProvidersByDistance, "findProvidersByDistance");
app.post("/api/auth/login", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, message: "Invalid JSON" }, 400);
  }
  const { token, role, phone, name, email: bodyEmail } = body;
  if (!token) {
    return c.json({ success: false, message: "Token required" }, 400);
  }
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.sub) {
    return c.json({ success: false, message: "Invalid Token Format" }, 400);
  }
  const firebaseUid = decoded.sub;
  const email = decoded.email || bodyEmail;
  if (!email) {
    return c.json({ success: false, message: "Email not found in token or body" }, 400);
  }
  try {
    const db = c.env.DB;
    const existing = await db.prepare("SELECT * FROM users WHERE firebase_uid = ?").bind(firebaseUid).first();
    let user = existing;
    if (!existing) {
      const avatarUrl = decoded.picture || null;
      const result = await db.prepare(`
                INSERT INTO users (firebase_uid, email, full_name, role, phone, avatar_url, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'firebase_oauth', datetime('now'))
                RETURNING *
            `).bind(
        firebaseUid,
        email,
        name || email.split("@")[0],
        // Fallback name
        role || "client",
        phone || null,
        avatarUrl
      ).first();
      user = result;
    } else {
    }
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        is_medical: false,
        // Default for now
        is_fixed_location: false
      },
      token
      // Echo back or issue session token if needed (client uses firebase token)
    });
  } catch (error) {
    console.error("Login Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/auth/register", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, message: "Invalid JSON" }, 400);
  }
  const {
    token,
    name,
    email,
    role = "client",
    phone,
    document_type,
    document_value,
    commercial_name,
    address,
    latitude,
    longitude,
    professions
  } = body;
  if (!token) {
    return c.json({ success: false, message: "Token required" }, 400);
  }
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.sub) {
    return c.json({ success: false, message: "Invalid Token Format" }, 400);
  }
  const firebaseUid = decoded.sub;
  const userEmail = email || decoded.email;
  if (!userEmail) {
    return c.json({ success: false, message: "Email is required" }, 400);
  }
  try {
    const db = c.env.DB;
    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(userEmail).first();
    if (existing) {
      return c.json({ success: false, message: "User already exists" }, 409);
    }
    const avatarUrl = decoded.picture || null;
    const fullName = name || decoded.name || userEmail.split("@")[0];
    const userResult = await db.prepare(`
            INSERT INTO users (firebase_uid, email, full_name, role, phone, avatar_url, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'firebase_oauth', datetime('now'))
            RETURNING id, email, role, full_name
        `).bind(
      firebaseUid,
      userEmail,
      fullName,
      role,
      phone || null,
      avatarUrl
    ).first();
    if (!userResult) {
      throw new Error("Failed to create user");
    }
    const userId = userResult.id;
    if (role === "provider") {
      await db.prepare(`
                INSERT INTO providers (user_id, commercial_name, address, latitude, longitude, document_type, document_value)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
        userId,
        commercial_name || null,
        address || null,
        latitude || null,
        longitude || null,
        document_type || null,
        document_value || null
      ).run();
      if (professions && Array.isArray(professions) && professions.length > 0) {
        for (const prof of professions) {
          let profId = null;
          if (typeof prof === "object" && prof.id) {
            profId = prof.id;
          } else if (typeof prof === "string") {
            const p = await db.prepare("SELECT id FROM professions WHERE name = ?").bind(prof).first();
            if (p) profId = p.id;
          }
          if (profId) {
            await db.prepare(`
                            INSERT INTO provider_professions (provider_user_id, profession_id)
                            VALUES (?, ?)
                        `).bind(userId, profId).run();
          }
        }
      }
    }
    return c.json({
      success: true,
      user: {
        id: userId,
        email: userResult.email,
        role: userResult.role,
        name: userResult.full_name,
        full_name: userResult.full_name,
        is_medical: false,
        is_fixed_location: false
      }
    }, 201);
  } catch (error) {
    console.error("Register Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/services/my", async (c) => {
  try {
    const db = c.env.DB;
    const authHeader = c.req.header("Authorization");
    let userId = null;
    let userRole = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        const u = await db.prepare("SELECT id, role FROM users WHERE email = ?").bind(decoded.email).first();
        if (u) {
          userId = u.id;
          userRole = u.role;
        }
      }
    }
    if (!userId) {
      return c.json({ success: true, services: [] });
    }
    let query = "";
    if (userRole === "provider") {
      query = `
                SELECT * FROM service_requests 
                WHERE provider_id = ? 
                ORDER BY created_at DESC
            `;
    } else {
      query = `
                SELECT * FROM service_requests 
                WHERE client_id = ? 
                ORDER BY created_at DESC
            `;
    }
    const result = await db.prepare(query).bind(userId).all();
    console.log(`[My Services] User ${userId} (${userRole}) has ${result.results?.length || 0} services`);
    return c.json({
      success: true,
      services: result.results || []
    });
  } catch (error) {
    console.error("[My Services] Error:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/services/available", async (c) => {
  try {
    const db = c.env.DB;
    const authHeader = c.req.header("Authorization");
    let userId = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        const u = await db.prepare("SELECT id FROM users WHERE email = ?").bind(decoded.email).first();
        if (u) userId = u.id;
      }
    }
    if (!userId) {
      return c.json({ success: true, services: [] });
    }
    const professionsResult = await db.prepare(`
            SELECT p.name 
            FROM provider_professions pp
            JOIN professions p ON pp.profession_id = p.id
            WHERE pp.provider_user_id = ?
        `).bind(userId).all();
    const professionNames = (professionsResult.results || []).map((p) => p.name);
    console.log(`[Available Services] Provider ${userId} professions:`, professionNames);
    if (professionNames.length === 0) {
      return c.json({ success: true, services: [] });
    }
    const location = await db.prepare(`
            SELECT latitude, longitude 
            FROM provider_locations 
            WHERE provider_id = ? 
            LIMIT 1
        `).bind(userId).first();
    const placeholders = professionNames.map(() => "?").join(",");
    const query = `
            SELECT * FROM service_requests 
            WHERE status IN ('pending', 'offered')
            AND provider_id IS NULL
            AND profession IN (${placeholders})
            ORDER BY created_at DESC
        `;
    const result = await db.prepare(query).bind(...professionNames).all();
    let services = result.results || [];
    console.log(`[Available Services] Found ${services.length} services before proximity filter`);
    if (location && location.latitude && location.longitude) {
      services = services.filter((s) => {
        if (!s.latitude || !s.longitude) return true;
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          s.latitude,
          s.longitude
        );
        console.log(`[Available Services] Service ${s.id} distance: ${distance.toFixed(2)}km`);
        return distance <= 50;
      });
    }
    console.log(`[Available Services] Returning ${services.length} services after proximity filter`);
    return c.json({ success: true, services });
  } catch (error) {
    console.error("[Available Services] Error:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/services", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, message: "Invalid JSON" }, 400);
  }
  const {
    category_id,
    description,
    latitude,
    longitude,
    address,
    price_estimated,
    price_upfront,
    location_type,
    profession,
    provider_id,
    scheduled_at,
    task_id
    // images, video, audios are handled via separate media upload endpoints usually, 
    // but here they might be passed as keys if already uploaded. 
    // For simplicity in this port, we ignore them in the INSERT for now 
    // unless we add columns for them or json storage.
  } = body;
  const serviceId = crypto.randomUUID();
  let clientId = 1;
  try {
    const db = c.env.DB;
    const authHeader = c.req.header("Authorization");
    const bypassEmail = c.req.header("X-Test-Bypass-Email");
    if (bypassEmail) {
      console.log(`[AuthBypass] Using bypass email: ${bypassEmail}`);
      const user = await db.prepare("SELECT id FROM users WHERE email = ?").bind(bypassEmail).first();
      if (user) clientId = user.id;
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        const user = await db.prepare("SELECT id FROM users WHERE email = ?").bind(decoded.email).first();
        if (user) {
          clientId = user.id;
          console.log(`[Create Service] Using authenticated user ID: ${clientId}`);
        } else {
          console.log(`[Create Service] User not found in D1, creating: ${decoded.email}`);
          const firebaseUid = decoded.sub || `firebase_${Date.now()}`;
          const fullName = decoded.name || decoded.email.split("@")[0];
          const avatarUrl = decoded.picture || null;
          const newUser = await db.prepare(`
                        INSERT INTO users (firebase_uid, email, full_name, role, avatar_url, password_hash, created_at)
                        VALUES (?, ?, ?, 'client', ?, 'firebase_oauth', datetime('now'))
                        RETURNING id
                    `).bind(firebaseUid, decoded.email, fullName, avatarUrl).first();
          if (newUser) {
            clientId = newUser.id;
            console.log(`[Create Service] Created new user with ID: ${clientId}`);
          }
        }
      }
    }
  } catch (authError) {
    console.error("[Create Service] Auth error:", authError.message);
  }
  try {
    const db = c.env.DB;
    await db.prepare(`
            INSERT INTO service_requests (
                id, client_id, category_id, description, latitude, longitude, address,
                price_estimated, price_upfront, location_type, profession, provider_id,
                scheduled_at, status, created_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, 'waiting_payment', datetime('now')
            )
        `).bind(
      serviceId,
      clientId,
      category_id,
      description,
      latitude,
      longitude,
      address,
      price_estimated,
      price_upfront,
      location_type || "client",
      profession,
      provider_id || null,
      // Handle optional provider
      scheduled_at || null
    ).run();
    console.log(`[Create Service] Triggering sequential dispatch for ${serviceId}`);
    await triggerServiceNotifications(serviceId, db, c.env, c.executionCtx);
    return c.json({
      success: true,
      service: {
        id: serviceId,
        status: "pending",
        description,
        price_estimated
      }
    });
  } catch (error) {
    console.error("Create Service Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/services/ai/classify", async (c) => {
  let text;
  try {
    const rawBody = await c.req.text();
    if (!rawBody || rawBody.trim() === "") {
      return c.json({ success: false, message: "Empty body" }, 400);
    }
    try {
      const parsedBody = JSON.parse(rawBody);
      text = parsedBody.text;
    } catch (e) {
      text = rawBody;
    }
  } catch (e) {
    return c.json({ success: false, message: "Invalid request body", error: e.message }, 400);
  }
  if (!text) return c.json({ success: false, message: "text required" }, 400);
  try {
    const fetchMethod = c.env.AI_SERVICE ? c.env.AI_SERVICE.fetch.bind(c.env.AI_SERVICE) : fetch;
    const targetUrl = c.env.AI_SERVICE ? `https://ai-service/classify` : `${c.env.AI_SERVICE_URL}/classify`;
    const response = await fetchMethod(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Adicionamos suporte a headers de acesso se configurados (para ambiente Cloudflare)
        ...c.env.CF_ACCESS_CLIENT_ID ? { "CF-Access-Client-Id": c.env.CF_ACCESS_CLIENT_ID } : {},
        ...c.env.CF_ACCESS_CLIENT_SECRET ? { "CF-Access-Client-Secret": c.env.CF_ACCESS_CLIENT_SECRET } : {}
      },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    const mappedResponse = {
      encontrado: data.id && data.id > 0 || data.task_id && data.task_id > 0,
      id: data.id || 0,
      profissao: data.name || data.profession_name || "",
      categoria: data.category_name || "Geral",
      categoria_id: data.category_id || 1,
      confianca: data.score || 0,
      service_type: data.service_type || "on_site",
      task: data.task_id ? {
        id: data.task_id,
        name: data.task_name,
        unit_price: data.price || data.unit_price,
        pricing_type: data.pricing_type,
        unit_name: data.unit_name
      } : null,
      candidates: data.candidates || []
    };
    console.log(`[Worker] Mapped AI Response: ${mappedResponse.profissao} (Found: ${mappedResponse.encontrado})`);
    return c.json(mappedResponse);
  } catch (error) {
    console.error(`[Worker] AI Classification Error: ${error.message}`);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/providers/search", async (c) => {
  const term = c.req.query("term");
  const profId = c.req.query("profession_id");
  const lat = parseFloat(c.req.query("lat") || "0");
  const lon = parseFloat(c.req.query("lon") || c.req.query("lng") || "0");
  try {
    const db = c.env.DB;
    let query = `
            SELECT 
                u.id, u.full_name, u.avatar_url,
                p.commercial_name, p.rating_avg, p.rating_count, p.is_online,
                loc.latitude, loc.longitude
            FROM users u
            JOIN providers p ON u.id = p.user_id
            JOIN provider_locations loc ON u.id = loc.provider_id
            JOIN provider_professions pp ON u.id = pp.provider_user_id
            JOIN professions prof ON pp.profession_id = prof.id
            WHERE u.role = 'provider'
        `;
    const params = [];
    if (profId) {
      query += ` AND prof.id = ?`;
      params.push(profId);
    } else if (term) {
      query += ` AND prof.name LIKE ?`;
      params.push(`%${term}%`);
    }
    const result = await db.prepare(query).bind(...params).all();
    let providers = result.results || [];
    if (providers.length === 0) {
      providers = (await db.prepare(`
                SELECT 
                    u.id, u.full_name, u.avatar_url,
                    p.commercial_name, p.rating_avg, p.rating_count, p.is_online,
                    loc.latitude, loc.longitude
                FROM users u
                JOIN providers p ON u.id = p.user_id
                JOIN provider_locations loc ON u.id = loc.provider_id
                WHERE u.role = 'provider'
                LIMIT 10
            `).all()).results || [];
    }
    const enhanced = providers.map((u) => {
      let distance = null;
      if (u.latitude && u.longitude && lat && lon) {
        const R = 6371;
        const dLat = (u.latitude - lat) * Math.PI / 180;
        const dLon = (u.longitude - lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat * Math.PI / 180) * Math.cos(u.latitude * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      return {
        ...u,
        id: u.id.toString(),
        distance_km: distance,
        is_open: true,
        // Mock for now to ensure results show up
        next_slot: null
      };
    });
    return c.json({ success: true, providers: enhanced });
  } catch (error) {
    return c.json({ success: false, message: error.message }, 500);
  }
});
app.get("/api/providers/:id/profile", async (c) => {
  const id = c.req.param("id");
  try {
    const db = c.env.DB;
    const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    if (!user) return c.json({ success: false, message: "Provider not found" }, 404);
    const provider = await db.prepare("SELECT * FROM providers WHERE user_id = ?").bind(id).first();
    const schedules = await db.prepare("SELECT * FROM provider_schedules WHERE provider_id = ?").bind(id).all();
    const services = await db.prepare("SELECT * FROM provider_custom_services WHERE provider_id = ? AND active = 1").bind(id).all();
    const reviews = await db.prepare(`
            SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            WHERE r.reviewee_id = ?
            ORDER BY r.created_at DESC LIMIT 10
        `).bind(id).all();
    return c.json({
      success: true,
      profile: {
        id: user.id.toString(),
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        commercial_name: provider?.commercial_name,
        bio: provider?.bio,
        rating_avg: provider?.rating_avg,
        rating_count: provider?.rating_count,
        address: provider?.address,
        schedules: (schedules.results || []).map((s) => ({ ...s, id: s.id.toString(), provider_id: s.provider_id.toString() })),
        services: (services.results || []).map((s) => ({ ...s, id: s.id.toString(), provider_id: s.provider_id.toString() })),
        reviews: (reviews.results || []).map((r) => ({ ...r, id: r.id.toString() }))
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/profile/specialties", async (c) => {
  try {
    const db = c.env.DB;
    const authHeader = c.req.header("Authorization");
    let userId = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        const u = await db.prepare("SELECT id, role FROM users WHERE email = ?").bind(decoded.email).first();
        if (u) {
          userId = u.id;
          if (u.role !== "provider") {
            return c.json({ success: false, message: "Only providers can view specialties" }, 403);
          }
        }
      }
    }
    if (!userId) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    const result = await db.prepare(`
            SELECT p.id, p.name
            FROM provider_professions pp
            JOIN professions p ON pp.profession_id = p.id
            WHERE pp.provider_user_id = ?
            ORDER BY p.name ASC
        `).bind(userId).all();
    const specialties = (result.results || []).map((r) => ({
      id: r.id,
      name: r.name
    }));
    console.log(`[Specialties] Provider ${userId} has ${specialties.length} specialties`);
    return c.json({
      success: true,
      specialties
    });
  } catch (error) {
    console.error("[Specialties] Error fetching:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/profile/specialties", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, message: "Invalid JSON" }, 400);
  }
  const { name } = body;
  if (!name) {
    return c.json({ success: false, message: "Profession name required" }, 400);
  }
  try {
    const db = c.env.DB;
    const authHeader = c.req.header("Authorization");
    let userId = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        const u = await db.prepare("SELECT id, role FROM users WHERE email = ?").bind(decoded.email).first();
        if (u) {
          userId = u.id;
          if (u.role !== "provider") {
            return c.json({ success: false, message: "Only providers can add specialties" }, 403);
          }
        }
      }
    }
    if (!userId) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    let profession = await db.prepare("SELECT id FROM professions WHERE name = ?").bind(name).first();
    if (!profession) {
      const result = await db.prepare("INSERT INTO professions (name) VALUES (?) RETURNING id").bind(name).first();
      profession = result;
    }
    if (!profession || !profession.id) {
      return c.json({ success: false, message: "Failed to get profession id" }, 500);
    }
    const existing = await db.prepare(
      "SELECT provider_user_id FROM provider_professions WHERE provider_user_id = ? AND profession_id = ?"
    ).bind(userId, profession.id).first();
    if (existing) {
      return c.json({ success: true, message: "Specialty already added" });
    }
    await db.prepare(
      "INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)"
    ).bind(userId, profession.id).run();
    console.log(`[Specialties] Added ${name} (id:${profession.id}) to provider ${userId}`);
    return c.json({ success: true, message: "Specialty added successfully" });
  } catch (error) {
    console.error("[Specialties] Error adding:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.delete("/api/profile/specialties", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, message: "Invalid JSON" }, 400);
  }
  const { name } = body;
  if (!name) {
    return c.json({ success: false, message: "Profession name required" }, 400);
  }
  try {
    const db = c.env.DB;
    const authHeader = c.req.header("Authorization");
    let userId = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        const u = await db.prepare("SELECT id FROM users WHERE email = ?").bind(decoded.email).first();
        if (u) userId = u.id;
      }
    }
    if (!userId) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    const profession = await db.prepare("SELECT id FROM professions WHERE name = ?").bind(name).first();
    if (!profession) {
      return c.json({ success: false, message: "Profession not found" }, 404);
    }
    await db.prepare(
      "DELETE FROM provider_professions WHERE provider_user_id = ? AND profession_id = ?"
    ).bind(userId, profession.id).run();
    console.log(`[Specialties] Removed ${name} from provider ${userId}`);
    return c.json({ success: true, message: "Specialty removed successfully" });
  } catch (error) {
    console.error("[Specialties] Error removing:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/profile/me", async (c) => {
  try {
    const db = c.env.DB;
    const authHeader = c.req.header("Authorization");
    let userId = 1;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        const u = await db.prepare("SELECT id FROM users WHERE email = ?").bind(decoded.email).first();
        if (u) {
          userId = u.id;
        }
      }
    }
    const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }
    return c.json({
      success: true,
      user: {
        id: user.id,
        name: user.full_name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url,
        is_medical: false,
        // Default for now
        is_fixed_location: false
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/services/:id", async (c) => {
  const serviceId = c.req.param("id");
  try {
    const db = c.env.DB;
    const service = await db.prepare(`
            SELECT * FROM service_requests WHERE id = ?
        `).bind(serviceId).first();
    if (!service) {
      return c.json({ success: false, message: "Service not found" }, 404);
    }
    let provider = null;
    if (service.provider_id) {
      provider = await db.prepare("SELECT * FROM providers WHERE user_id = ?").bind(service.provider_id).first();
    }
    return c.json({
      success: true,
      service: {
        ...service,
        provider
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/services/:id/cancel", async (c) => {
  const serviceId = c.req.param("id");
  try {
    const db = c.env.DB;
    await db.prepare("UPDATE service_requests SET status = ? WHERE id = ?").bind("cancelled", serviceId).run();
    return c.json({ success: true, message: "Service cancelled" });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/services/:id/accept", async (c) => {
  const serviceId = c.req.param("id");
  const db = c.env.DB;
  const authHeader = c.req.header("Authorization");
  try {
    let providerId = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = decodeJwt(token);
      if (decoded && decoded.email) {
        const u = await db.prepare("SELECT id FROM users WHERE email = ?").bind(decoded.email).first();
        if (u) providerId = u.id;
      }
    }
    if (!providerId) return c.json({ success: false, message: "Unauthorized" }, 401);
    const result = await db.prepare(`
            UPDATE service_requests 
            SET status = 'accepted', provider_id = ? 
            WHERE id = ? AND status IN ('pending', 'offered')
        `).bind(providerId, serviceId).run();
    if (result.meta.changes === 0) {
      return c.json({ success: false, message: "Service no longer available or already accepted" }, 409);
    }
    const id = c.env.DISPATCH_MANAGER.idFromName(serviceId);
    const obj = c.env.DISPATCH_MANAGER.get(id);
    await obj.fetch(new Request(`http://dispatch/accept`, {
      method: "POST",
      body: JSON.stringify({ providerId })
    }));
    console.log(`[Accept] Service ${serviceId} accepted by provider ${providerId}`);
    return c.json({ success: true, message: "Service accepted" });
  } catch (error) {
    console.error("[Accept] Error:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/services/:id/skip", async (c) => {
  const serviceId = c.req.param("id");
  try {
    const id = c.env.DISPATCH_MANAGER.idFromName(serviceId);
    const obj = c.env.DISPATCH_MANAGER.get(id);
    await obj.fetch(new Request(`http://dispatch/skip`, { method: "POST" }));
    console.log(`[Skip] Service ${serviceId} skipped by provider/system`);
    return c.json({ success: true, message: "Service skipped" });
  } catch (error) {
    console.error("[Skip] Error:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/notifications/register-token", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, message: "Invalid JSON" }, 400);
  }
  const { token, platform, latitude, longitude } = body;
  if (!token) {
    return c.json({ success: false, message: "Token required" }, 400);
  }
  const db = c.env.DB;
  try {
    const authHeader = c.req.header("Authorization");
    const bypassEmail = c.req.header("X-Test-Bypass-Email");
    let userId = null;
    if (bypassEmail) {
      console.log(`[AuthBypass] Provider bypass email: ${bypassEmail}`);
      const u = await db.prepare("SELECT id, fcm_token FROM users WHERE email = ?").bind(bypassEmail).first();
      if (u) userId = u.id;
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      const authToken = authHeader.substring(7);
      const decoded = decodeJwt(authToken);
      if (decoded && decoded.email) {
        const u = await db.prepare("SELECT id, fcm_token FROM users WHERE email = ?").bind(decoded.email).first();
        if (u) {
          userId = u.id;
          const oldToken = u.fcm_token;
          if (oldToken && oldToken !== token) {
            try {
              const serviceAccount = c.env.FIREBASE_SERVICE_ACCOUNT;
              if (serviceAccount) {
                console.log(`[Sessions] Sending force_logout to old token for user ${userId}`);
                c.executionCtx.waitUntil(
                  sendFCMNotificationV1(serviceAccount, oldToken, {
                    title: "",
                    body: "",
                    data: { type: "force_logout" }
                  }).catch((e) => console.error("[Sessions] Error sending force_logout:", e))
                );
              }
            } catch (e) {
              console.error("[Sessions] Error preparing force_logout:", e);
            }
          }
        }
      }
    }
    if (!userId) {
      return c.json({ success: false, message: "Unauthorized" }, 401);
    }
    await db.prepare("UPDATE users SET fcm_token = ? WHERE id = ?").bind(token, userId).run();
    try {
      const profs = await db.prepare(`
                SELECT p.name 
                FROM provider_professions pp 
                JOIN professions p ON pp.profession_id = p.id 
                WHERE pp.provider_user_id = ?
            `).bind(userId).all();
      const professionList = (profs.results || []).map((r) => r.name).join(",");
      let finalLat = latitude;
      let finalLon = longitude;
      if (finalLat === void 0 || finalLon === void 0) {
        const loc = await db.prepare("SELECT latitude, longitude FROM provider_locations WHERE provider_id = ?").bind(userId).first();
        if (loc) {
          finalLat = finalLat ?? loc.latitude;
          finalLon = finalLon ?? loc.longitude;
        }
      }
      await db.prepare(`
                INSERT INTO notification_registry (user_id, fcm_token, professions, latitude, longitude, is_online, last_seen_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
                ON CONFLICT(user_id) DO UPDATE SET
                    fcm_token = excluded.fcm_token,
                    professions = excluded.professions,
                    latitude = COALESCE(excluded.latitude, notification_registry.latitude),
                    longitude = COALESCE(excluded.longitude, notification_registry.longitude),
                    is_online = 1,
                    last_seen_at = datetime('now')
            `).bind(
        userId,
        token,
        professionList || null,
        finalLat ?? null,
        finalLon ?? null
      ).run();
      console.log(`[FCM] Notification Registry updated for user ${userId}`);
    } catch (registryError) {
      console.error("[FCM] Error updating notification_registry:", registryError.message);
    }
    console.log(`[FCM] Token registered for user ${userId} (${platform}): ${token.substring(0, 20)}...`);
    return c.json({ success: true, message: "Token registered successfully" });
  } catch (error) {
    console.error("[FCM] Error registering token:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/geo/reverse", async (c) => {
  const lat = c.req.query("lat");
  const lon = c.req.query("lon");
  if (!lat || !lon) return c.json({ error: "Lat/Lon required" }, 400);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ProjetoCentral/1.0",
        "Accept-Language": "pt-BR"
      }
    });
    const data = await response.json();
    if (data && data.address) {
      const addr = data.address;
      const formatted = [
        addr.road || addr.pedestrian || addr.suburb,
        addr.house_number,
        addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.municipality,
        addr.state
      ].filter(Boolean).join(", ");
      return c.json({
        success: true,
        address: formatted,
        details: data.address
      });
    }
    return c.json({ success: false, message: "Address not found" });
  } catch (error) {
    return c.json({ success: true, address: `Lat: ${lat}, Lon: ${lon}`, fallback: true });
  }
});
app.get("/api/geo/search", async (c) => {
  const q = c.req.query("q");
  if (!q || q.length < 3) return c.json({ success: true, results: [] });
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&countrycodes=br`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ProjetoCentral/1.0",
        "Accept-Language": "pt-BR"
      }
    });
    const data = await response.json();
    if (data && Array.isArray(data)) {
      const results = data.map((item) => {
        const addr = item.address || {};
        const parts = [
          addr.road || addr.pedestrian || addr.suburb,
          addr.house_number,
          addr.suburb || addr.neighbourhood,
          addr.city || addr.town || addr.municipality,
          addr.state_code || addr.state,
          addr.postcode
        ].filter(Boolean);
        return {
          display_name: parts.join(", ") || item.display_name,
          lat: item.lat,
          lon: item.lon,
          address: item.address
        };
      });
      return c.json({ success: true, results });
    }
    return c.json({ success: true, results: [] });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/payment/process", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ success: false, message: "Invalid JSON" }, 400);
  }
  const {
    transaction_amount,
    payment_method_id,
    payer,
    service_id,
    payment_type,
    token,
    description,
    installments,
    device_id
  } = body;
  if (!service_id) return c.json({ success: false, message: "service_id required" }, 400);
  try {
    const db = c.env.DB;
    const mpToken = c.env.MP_ACCESS_TOKEN;
    const service = await db.prepare("SELECT profession, price_estimated, price_upfront FROM service_requests WHERE id = ?").bind(service_id).first();
    if (!service) return c.json({ success: false, message: "Service not found" }, 404);
    let realAmount = payment_type === "remaining" ? Number(service.price_estimated) - Number(service.price_upfront) : Number(service.price_upfront) > 0 ? Number(service.price_upfront) : Number(service.price_estimated);
    const paymentBody = {
      transaction_amount: realAmount,
      description: description || `Payment for ${service.profession}`,
      payment_method_id,
      notification_url: "https://projeto-central-backend.carrobomebarato.workers.dev/api/payment/webhook",
      payer: {
        email: payer?.email || "customer@example.com",
        identification: payer?.identification,
        first_name: payer?.first_name
      },
      metadata: {
        service_id,
        payment_type: payment_type || "initial",
        device_id
      },
      external_reference: `SERVICE-${service_id}`,
      statement_descriptor: "101SERVICE",
      binary_mode: true,
      additional_info: {
        items: [
          {
            id: service_id,
            title: service.profession || "Service 101",
            description: description || `Service: ${service.profession}`,
            category_id: "services",
            // Categorização ganha pontos
            quantity: 1,
            unit_price: realAmount
          }
        ],
        payer: {
          first_name: payer?.first_name || "Customer",
          registration_date: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    };
    if (payment_method_id !== "pix") {
      paymentBody.token = token;
      paymentBody.installments = Number(installments || 1);
    }
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `PAY-${service_id}-${payment_type || "initial"}-${Date.now()}`,
        "X-Meli-Session-Id": device_id || ""
      },
      body: JSON.stringify(paymentBody)
    });
    const result = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error("MP API Error:", result);
      return c.json({ success: false, error: result }, mpResponse.status);
    }
    await db.prepare("INSERT INTO payments (mission_id, user_id, amount, status, mp_payment_id, payment_method_id, payer_email) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(
      service_id,
      0,
      // User ID (should be extracted from token in future)
      realAmount,
      result.status,
      String(result.id),
      payment_method_id,
      payer?.email || "customer@example.com"
    ).run();
    return c.json({ success: true, payment: result });
  } catch (error) {
    console.error("Payment processing error:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/payment/webhook", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.text("Invalid JSON", 400);
  }
  const { type, data, action } = body;
  console.log(`[Webhook Receive] type=${type}, action=${action}, id=${data?.id}`);
  if (type === "payment" && data?.id) {
    try {
      const db = c.env.DB;
      const token = c.env.MP_ACCESS_TOKEN;
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        console.error(`MP API Error: ${response.status} ${response.statusText}`);
        return c.text("Verification failed", 200);
      }
      const paymentInfo = await response.json();
      const pStatus = paymentInfo.status;
      const externalRef = paymentInfo.external_reference;
      console.log(`[Webhook Detail] Payment ${data.id}: status=${pStatus}, ref=${externalRef}`);
      if (pStatus === "approved") {
        if (externalRef && externalRef.startsWith("SERVICE-")) {
          const serviceId = externalRef.replace("SERVICE-", "");
          console.log(`[Webhook Processing] Found serviceId: ${serviceId}`);
          await db.prepare("UPDATE payments SET status = ? WHERE mp_payment_id = ?").bind("approved", String(data.id)).run();
          const service = await db.prepare("SELECT status, provider_id FROM service_requests WHERE id = ?").bind(serviceId).first();
          if (service) {
            console.log(`[Webhook Processing] Current status: ${service.status}`);
            let updateSql = "";
            let params = [];
            if (service.status === "waiting_payment") {
              const newStatus = service.provider_id ? "accepted" : "pending";
              updateSql = "UPDATE service_requests SET status = ? WHERE id = ?";
              params = [newStatus, serviceId];
            } else if (service.status === "waiting_payment_remaining") {
              updateSql = "UPDATE service_requests SET status = ?, payment_remaining_status = ? WHERE id = ?";
              params = ["in_progress", "paid", serviceId];
            }
            if (updateSql) {
              const updateResult = await db.prepare(updateSql).bind(...params).run();
              console.log(`[Webhook Success] Service ${serviceId} updated to ${params[0]}. Result: ${updateResult.success}`);
              if (params[0] === "pending") {
                c.executionCtx.waitUntil(triggerServiceNotifications(serviceId, db, c.env, c.executionCtx));
              }
            } else {
              console.log(`[Webhook Skip] Service ${serviceId} status ${service.status} doesn't need transition.`);
            }
          } else {
            console.error(`[Webhook Error] Service ${serviceId} not found in DB.`);
          }
        } else {
          console.log(`[Webhook Skip] No external_reference or doesn't match SERVICE- prefix.`);
        }
      }
    } catch (error) {
      console.error("[Webhook Panic] Error processing webhook:", error.message);
      return c.text("OK", 200);
    }
  }
  return c.text("OK", 200);
});
app.get("/api/payment/check/:serviceId", async (c) => {
  const service_id = c.req.param("serviceId");
  const db = c.env.DB;
  const mpToken = c.env.MP_ACCESS_TOKEN;
  try {
    console.log(`[Manual Check] Checking payment for service: ${service_id}`);
    const payment = await db.prepare("SELECT * FROM payments WHERE mission_id = ? ORDER BY id DESC LIMIT 1").bind(service_id).first();
    if (!payment) {
      return c.json({ success: false, message: "No payment record found" });
    }
    if (payment.status === "approved") {
      return c.json({ success: true, status: "approved" });
    }
    if (payment.mp_payment_id) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}`, {
        headers: { "Authorization": `Bearer ${mpToken}` }
      });
      if (response.ok) {
        const mpInfo = await response.json();
        console.log(`[Manual Check] MP direct check status: ${mpInfo.status}`);
        if (mpInfo.status === "approved") {
          await db.prepare("UPDATE payments SET status = ? WHERE id = ?").bind("approved", payment.id).run();
          const service = await db.prepare("SELECT status, provider_id FROM service_requests WHERE id = ?").bind(service_id).first();
          if (service && (service.status === "waiting_payment" || service.status === "waiting_payment_remaining")) {
            let newStatus = service.status === "waiting_payment_remaining" ? "in_progress" : service.provider_id ? "accepted" : "pending";
            if (service.status === "waiting_payment_remaining") {
              await db.prepare("UPDATE service_requests SET status = ?, payment_remaining_status = ? WHERE id = ?").bind("in_progress", "paid", service_id).run();
            } else {
              await db.prepare("UPDATE service_requests SET status = ? WHERE id = ?").bind(newStatus, service_id).run();
            }
            console.log(`[Manual Check] Manually updated service ${service_id} to ${newStatus}`);
            if (newStatus === "pending") {
              c.executionCtx.waitUntil(triggerServiceNotifications(service_id, db, c.env, c.executionCtx));
            }
          }
          return c.json({ success: true, status: "approved" });
        }
        return c.json({ success: true, status: mpInfo.status });
      }
    }
    return c.json({ success: true, status: payment.status || "pending" });
  } catch (e) {
    console.error(`[Manual Check Error] ${e.message}`);
    return c.json({ success: false, error: e.message }, 500);
  }
});
app.get("/api/campaign/:campaignId", async (c) => {
  try {
    const campaignId = c.req.param("campaignId");
    const response = await fetch(`https://campanha-simples.vercel.app/api/manifest?campaign=${campaignId}`);
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error("[Campaign Proxy] Error:", error.message);
    return c.json({ error: "Failed to fetch campaign" }, 500);
  }
});
app.get("/api/test/check-tokens", async (c) => {
  try {
    const db = c.env.DB;
    const tokens = await db.prepare(`
            SELECT id, full_name, role, fcm_token
            FROM users
            WHERE fcm_token IS NOT NULL AND fcm_token != ''
            ORDER BY role, full_name
        `).all();
    return c.json({
      success: true,
      count: tokens.results?.length || 0,
      tokens: tokens.results
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/test/find-providers", async (c) => {
  try {
    const db = c.env.DB;
    const { profession, latitude, longitude } = await c.req.json();
    const providers = await findNearbyProviders(db, profession, latitude, longitude, 50);
    return c.json({
      success: true,
      query: { profession, latitude, longitude, radius: 50 },
      count: providers.length,
      providers
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/test/fcm-config", async (c) => {
  const serverKey = c.env.FCM_SERVER_KEY;
  return c.json({
    fcm_configured: !!serverKey,
    fcm_key_length: serverKey?.length || 0,
    fcm_key_prefix: serverKey ? serverKey.substring(0, 10) + "..." : "N/A"
  });
});
app.post("/api/test/create-service-and-notify", async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const { profession, latitude, longitude, price = 50 } = body;
    const serviceId = "test-" + Date.now();
    console.log(`[TEST-SERVICE] ====== Creating Simulated Service for Escalation Test ======`);
    await db.prepare(`
            INSERT INTO service_requests (
                id, client_id, category_id, profession, description, latitude, longitude, address,
                price_estimated, status, created_at
            ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
        `).bind(
      serviceId,
      1,
      // Default category
      profession || "Chaveiro",
      `Teste de Escalonamento (${profession})`,
      latitude || -5.52639,
      longitude || -47.49167,
      "Rua Rui Barbosa, Centro, Imperatriz - MA (TESTE)",
      price
    ).run();
    console.log(`[TEST-SERVICE] Triggering triggerServiceNotifications for ${serviceId}`);
    c.executionCtx.waitUntil(triggerServiceNotifications(serviceId, db, c.env, c.executionCtx));
    return c.json({
      success: true,
      message: `Service ${serviceId} created. Escalation started in background.`,
      serviceId
    });
  } catch (error) {
    console.error("[TEST-SERVICE] Error:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/test/send-notification", async (c) => {
  try {
    const db = c.env.DB;
    const serviceAccount = c.env.FIREBASE_SERVICE_ACCOUNT;
    console.log(`[TEST] ====== Testing Notification System ======`);
    console.log(`[TEST] FIREBASE_SERVICE_ACCOUNT configured: ${!!serviceAccount}`);
    if (!serviceAccount) {
      return c.json({ success: false, message: "FIREBASE_SERVICE_ACCOUNT not configured" }, 500);
    }
    const providers = await db.prepare(`
            SELECT id, full_name, fcm_token, role
            FROM users
            WHERE role = 'provider'
              AND fcm_token IS NOT NULL
              AND fcm_token != ''
            LIMIT 10
        `).all();
    console.log(`[TEST] Found ${providers.results?.length || 0} providers with FCM tokens`);
    if (!providers.results || providers.results.length === 0) {
      return c.json({
        success: false,
        message: "No providers with FCM tokens found",
        details: "Check that providers have logged in and registered their FCM tokens"
      }, 404);
    }
    const results = [];
    for (const provider of providers.results) {
      console.log(`[TEST] Sending to provider ${provider.id} (${provider.full_name})`);
      const success = await sendFCMNotificationV1(serviceAccount, provider.fcm_token, {
        title: "\u{1F9EA} Teste de Notifica\xE7\xE3o",
        body: "Esta \xE9 uma notifica\xE7\xE3o de teste do sistema",
        data: {
          type: "test",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      results.push({
        providerId: provider.id,
        providerName: provider.full_name,
        success
      });
    }
    return c.json({
      success: true,
      message: `Sent ${results.filter((r) => r.success).length}/${results.length} notifications`,
      results
    });
  } catch (error) {
    console.error("[TEST] Error:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.post("/api/payment/debug-confirm", async (c) => {
  try {
    const db = c.env.DB;
    const { serviceId } = await c.req.json();
    if (!serviceId) return c.json({ success: false, message: "serviceId required" }, 400);
    console.log(`[DEBUG-CONFIRM] Manually approving service: ${serviceId}`);
    const service = await db.prepare("SELECT status, provider_id FROM service_requests WHERE id = ?").bind(serviceId).first();
    if (!service) return c.json({ success: false, message: "Service not found" }, 404);
    let newStatus = service.status === "waiting_payment_remaining" ? "in_progress" : service.provider_id ? "accepted" : "pending";
    if (service.status === "waiting_payment_remaining") {
      await db.prepare("UPDATE service_requests SET status = ?, payment_remaining_status = ? WHERE id = ?").bind("in_progress", "paid", serviceId).run();
    } else {
      await db.prepare("UPDATE service_requests SET status = ? WHERE id = ?").bind(newStatus, serviceId).run();
    }
    await db.prepare("INSERT OR REPLACE INTO payments (mission_id, user_id, amount, status, mp_payment_id, payment_method_id, payer_email) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(serviceId, 0, 0, "approved", "DEBUG-" + Date.now(), "pix", "debug@test.com").run();
    if (newStatus === "pending") {
      c.executionCtx.waitUntil(triggerServiceNotifications(serviceId, db, c.env, c.executionCtx));
    }
    return c.json({
      success: true,
      message: `Service ${serviceId} manually approved. Status changed to ${newStatus}.`,
      notifications_triggered: newStatus === "pending"
    });
  } catch (error) {
    console.error("[DEBUG-CONFIRM] Error:", error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/api/theme/active", async (c) => {
  try {
    const db = c.env.DB;
    const theme = await db.prepare(`
            SELECT * FROM app_theme WHERE is_active = 1 LIMIT 1
        `).first();
    if (!theme) {
      return c.json({
        success: false,
        message: "No active theme found"
      }, 404);
    }
    const themeData = {
      version: theme.version,
      name: theme.name,
      colors: {
        primary: theme.primary_color,
        secondary: theme.secondary_color,
        background: theme.background_color,
        surface: theme.surface_color,
        error: theme.error_color,
        success: theme.success_color,
        warning: theme.warning_color,
        textPrimary: theme.text_primary_color,
        textSecondary: theme.text_secondary_color,
        textDisabled: theme.text_disabled_color,
        textHint: theme.text_hint_color,
        buttonPrimaryBg: theme.button_primary_bg,
        buttonPrimaryText: theme.button_primary_text,
        buttonSecondaryBg: theme.button_secondary_bg,
        buttonSecondaryText: theme.button_secondary_text,
        buttonOutlineColor: theme.button_outline_color
      },
      borders: {
        radiusSmall: theme.border_radius_small,
        radiusMedium: theme.border_radius_medium,
        radiusLarge: theme.border_radius_large,
        radiusXLarge: theme.border_radius_xlarge,
        width: theme.border_width,
        color: theme.border_color
      },
      typography: {
        fontFamily: theme.font_family,
        sizeTiny: theme.font_size_tiny,
        sizeSmall: theme.font_size_small,
        sizeMedium: theme.font_size_medium,
        sizeLarge: theme.font_size_large,
        sizeXLarge: theme.font_size_xlarge,
        sizeTitle: theme.font_size_title
      },
      spacing: {
        tiny: theme.spacing_tiny,
        small: theme.spacing_small,
        medium: theme.spacing_medium,
        large: theme.spacing_large,
        xlarge: theme.spacing_xlarge
      }
    };
    return c.json({
      success: true,
      theme: themeData,
      lastUpdated: theme.updated_at
    });
  } catch (error) {
    console.error("Error fetching theme:", error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
app.get("/api/strings/:language?", async (c) => {
  try {
    const db = c.env.DB;
    const language = c.req.param("language") || "pt-BR";
    const result = await db.prepare(`
            SELECT key, value, category FROM app_strings 
            WHERE language = ?
            ORDER BY category, key
        `).bind(language).all();
    const stringsMap = {};
    const byCategory = {};
    result.results.forEach((row) => {
      stringsMap[row.key] = row.value;
      if (!byCategory[row.category]) {
        byCategory[row.category] = {};
      }
      byCategory[row.category][row.key] = row.value;
    });
    return c.json({
      success: true,
      language,
      total: result.results.length,
      strings: stringsMap,
      byCategory
    });
  } catch (error) {
    console.error("Error fetching strings:", error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
app.get("/api/config", async (c) => {
  try {
    const db = c.env.DB;
    const result = await db.prepare(`
            SELECT key, value, type FROM app_config
        `).all();
    const config = {};
    result.results.forEach((row) => {
      let value = row.value;
      if (row.type === "number") {
        value = parseFloat(value);
      } else if (row.type === "boolean") {
        value = value === "true";
      } else if (row.type === "json") {
        value = JSON.parse(value);
      }
      config[row.key] = value;
    });
    return c.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("Error fetching config:", error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
app.post("/api/admin/theme/update", async (c) => {
  try {
    const db = c.env.DB;
    const data = await c.req.json();
    const updates = [];
    const values = [];
    const fieldMap = {
      "primaryColor": "primary_color",
      "secondaryColor": "secondary_color",
      "backgroundColor": "background_color",
      "textPrimaryColor": "text_primary_color",
      "buttonPrimaryBg": "button_primary_bg",
      "buttonPrimaryText": "button_primary_text",
      "borderRadiusMedium": "border_radius_medium",
      "borderWidth": "border_width"
    };
    Object.keys(data).forEach((key) => {
      if (fieldMap[key]) {
        updates.push(`${fieldMap[key]} = ?`);
        values.push(data[key]);
      }
    });
    if (updates.length === 0) {
      return c.json({
        success: false,
        message: "No valid fields to update"
      }, 400);
    }
    updates.push("updated_at = CURRENT_TIMESTAMP");
    updates.push("version = version + 1");
    const query = `
            UPDATE app_theme 
            SET ${updates.join(", ")}
            WHERE is_active = 1
        `;
    await db.prepare(query).bind(...values).run();
    return c.json({
      success: true,
      message: "Theme updated successfully"
    });
  } catch (error) {
    console.error("Error updating theme:", error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
app.post("/api/admin/strings/update", async (c) => {
  try {
    const db = c.env.DB;
    const { key, value, language = "pt-BR", category } = await c.req.json();
    if (!key || !value) {
      return c.json({
        success: false,
        message: "Key and value are required"
      }, 400);
    }
    await db.prepare(`
            INSERT INTO app_strings (key, value, language, category, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key, language) 
            DO UPDATE SET value = ?, category = ?, updated_at = CURRENT_TIMESTAMP
        `).bind(key, value, language, category, value, category).run();
    return c.json({
      success: true,
      message: "String updated successfully"
    });
  } catch (error) {
    console.error("Error updating string:", error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
var DispatchManager = class {
  static {
    __name(this, "DispatchManager");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/start") {
      const { serviceId, providers } = await request.json();
      await this.state.storage.put("serviceId", serviceId);
      await this.state.storage.put("providers", providers);
      await this.state.storage.put("currentIndex", 0);
      await this.state.storage.put("status", "active");
      console.log(`[DispatchManager] Starting dispatch for ${serviceId} with ${providers.length} providers`);
      await this.notifyCurrentProvider();
      return new Response(JSON.stringify({ success: true }));
    }
    if (path === "/accept") {
      const { providerId } = await request.json();
      console.log(`[DispatchManager] Provider ${providerId} accepted. Cancelling alarms.`);
      await this.state.storage.put("status", "accepted");
      await this.state.storage.deleteAllAlarms();
      return new Response(JSON.stringify({ success: true }));
    }
    if (path === "/skip") {
      console.log(`[DispatchManager] Provider skipped/timeout. Moving to next.`);
      await this.moveToNextProvider();
      return new Response(JSON.stringify({ success: true }));
    }
    return new Response("Not Found", { status: 404 });
  }
  async alarm() {
    console.log(`[DispatchManager] Alarm triggered. Current provider timed out.`);
    await this.moveToNextProvider();
  }
  async notifyCurrentProvider() {
    const serviceId = await this.state.storage.get("serviceId");
    const providers = await this.state.storage.get("providers");
    const currentIndex = await this.state.storage.get("currentIndex");
    const status = await this.state.storage.get("status");
    if (status !== "active" || currentIndex >= providers.length) {
      console.log(`[DispatchManager] Dispatch finished or inactive. Status: ${status}, Index: ${currentIndex}/${providers.length}`);
      return;
    }
    const provider = providers[currentIndex];
    console.log(`[DispatchManager] Notifying provider ${provider.userId} (${currentIndex + 1}/${providers.length})`);
    const db = this.env.DB;
    const service = await db.prepare(`
            SELECT profession, price_estimated, description, latitude, longitude, address
            FROM service_requests WHERE id = ?
        `).bind(serviceId).first();
    if (service) {
      try {
        await sendFCMNotificationV1(this.env.FIREBASE_SERVICE_ACCOUNT, provider.fcmToken, {
          title: "",
          // Data-only
          body: "",
          data: {
            type: "new_service",
            title: "\u{1F514} Novo Servi\xE7o Dispon\xEDvel",
            body: `${service.profession} - R$ ${service.price_estimated?.toFixed(2) || "0.00"}`,
            service_id: serviceId,
            id: serviceId,
            profession: service.profession,
            description: service.description || `Servi\xE7o de ${service.profession}`,
            price: (service.price_estimated || 0).toString(),
            latitude: service.latitude.toString(),
            longitude: service.longitude.toString(),
            address: service.address || "Localiza\xE7\xE3o do CLIENTE"
          }
        });
      } catch (fcmError) {
        console.error(`[DispatchManager] Failed to send notification to provider ${provider.userId}:`, fcmError.message);
      }
    }
    console.log(`[DispatchManager] Setting alarm for 30s for provider ${provider.userId}`);
    await this.state.storage.setAlarm(Date.now() + 3e4);
  }
  async moveToNextProvider() {
    const currentIndex = await this.state.storage.get("currentIndex");
    await this.state.storage.put("currentIndex", currentIndex + 1);
    await this.notifyCurrentProvider();
  }
};
var worker_default = app;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var import_checked_fetch29 = __toESM(require_checked_fetch());
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
var import_checked_fetch30 = __toESM(require_checked_fetch());
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-r25UDX/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var import_checked_fetch32 = __toESM(require_checked_fetch());
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-r25UDX/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  DispatchManager,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
