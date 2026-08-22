import { readFile } from "node:fs/promises";
import path from "node:path";
import { comparableUrl, normalizeUrl } from "./html.mjs";

export const CACHE_BYPASS_PARAM = "_aiamigos_cache_bust";
export const CACHE_BYPASS_MODES = new Set(["off", "headers", "query"]);

export function cacheBypassUrl(value, token) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  url.searchParams.set(CACHE_BYPASS_PARAM, String(token));
  return url.href;
}

export function stripCacheBypass(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  url.searchParams.delete(CACHE_BYPASS_PARAM);
  return url.href;
}

export function logicalProbeUrl(value, base) {
  const normalized = normalizeUrl(value, base);
  return normalized ? stripCacheBypass(normalized) : null;
}

function headersObject(headers) {
  return Object.fromEntries([...headers.entries()].map(([key, value]) => [key.toLowerCase(), value]));
}

export class LiveSource {
  constructor({ timeoutMs = 20_000, userAgent = "AIAmigosSEORegression/1.0 (+https://aiamigos.org/)", cacheBypass = "off" } = {}) {
    if (!CACHE_BYPASS_MODES.has(cacheBypass)) throw new Error(`Unsupported cache bypass mode: ${cacheBypass}`);
    this.mode = "live";
    this.timeoutMs = timeoutMs;
    this.userAgent = userAgent;
    this.cacheBypass = cacheBypass;
    this.cacheBypassCounter = 0;
    this.cache = new Map();
  }

  async request(url, { follow = true, cacheBypass = this.cacheBypass } = {}) {
    return this.#cachedRequest(url, { follow, cacheBypass, bodyMode: "text" });
  }

  async requestBytes(url, { follow = true, cacheBypass = this.cacheBypass } = {}) {
    return this.#cachedRequest(url, { follow, cacheBypass, bodyMode: "bytes" });
  }

  async #cachedRequest(url, { follow, cacheBypass, bodyMode }) {
    if (!CACHE_BYPASS_MODES.has(cacheBypass)) throw new Error(`Unsupported cache bypass mode: ${cacheBypass}`);
    const logicalUrl = logicalProbeUrl(url) ?? String(url);
    const key = `${follow ? "follow" : "manual"}:${cacheBypass}:${bodyMode}:${logicalUrl}`;
    if (this.cache.has(key)) return this.cache.get(key);
    this.cacheBypassCounter += 1;
    const token = `${Date.now().toString(36)}-${this.cacheBypassCounter}`;
    const promise = this.#request(logicalUrl, follow, cacheBypass, token, bodyMode);
    this.cache.set(key, promise);
    return promise;
  }

  async #request(url, follow, cacheBypass, token, bodyMode) {
    const startedAt = performance.now();
    const chain = [];
    const networkChain = [];
    const logicalRequestedUrl = logicalProbeUrl(url) ?? String(url);
    const bypassesCache = cacheBypass !== "off";
    let current = cacheBypass === "query" ? cacheBypassUrl(logicalRequestedUrl, token) : logicalRequestedUrl;
    let body = "";
    let bodyBytes = null;
    let finalHeaders = {};
    let status = 0;
    for (let hop = 0; hop < (follow ? 10 : 1); hop += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(current, {
          redirect: "manual",
          headers: {
            accept: bodyMode === "bytes" ? "image/png,image/jpeg,image/webp,image/*;q=0.8,*/*;q=0.1" : "text/html,application/xhtml+xml,application/xml,text/plain,*/*;q=0.5",
            "user-agent": this.userAgent,
            ...(bypassesCache ? { "cache-control": "no-cache", pragma: "no-cache" } : {}),
          },
          signal: controller.signal,
        });
        status = response.status;
        finalHeaders = headersObject(response.headers);
        const location = response.headers.get("location");
        const normalizedLocation = location ? normalizeUrl(location, current) : null;
        networkChain.push({ url: current, status, location: normalizedLocation });
        chain.push({
          url: stripCacheBypass(current) ?? current,
          status,
          location: normalizedLocation ? stripCacheBypass(normalizedLocation) : null,
        });
        if (follow && status >= 300 && status < 400 && location) {
          await response.arrayBuffer();
          current = normalizedLocation;
          continue;
        }
        if (bodyMode === "bytes") bodyBytes = Buffer.from(await response.arrayBuffer());
        else body = await response.text();
        current = normalizeUrl(response.url || current) ?? current;
        break;
      } catch (error) {
        const elapsedMs = Math.round(performance.now() - startedAt);
        return {
          requestedUrl: logicalRequestedUrl,
          finalUrl: stripCacheBypass(current) ?? current,
          networkRequestedUrl: cacheBypass === "query" ? cacheBypassUrl(logicalRequestedUrl, token) : logicalRequestedUrl,
          networkFinalUrl: current,
          cacheBypass,
          status: 0,
          headers: finalHeaders,
          body,
          bodyBytes,
          chain,
          networkChain,
          redirectCount: Math.max(0, chain.length - 1),
          elapsedMs,
          observed: false,
          missing: true,
          reason: `Fetch error: ${String(error?.message ?? error)}`,
        };
      } finally {
        clearTimeout(timer);
      }
    }
    return {
      requestedUrl: logicalRequestedUrl,
      finalUrl: stripCacheBypass(current) ?? current,
      networkRequestedUrl: cacheBypass === "query" ? cacheBypassUrl(logicalRequestedUrl, token) : logicalRequestedUrl,
      networkFinalUrl: current,
      cacheBypass,
      status,
      headers: finalHeaders,
      body,
      bodyBytes,
      chain,
      networkChain,
      redirectCount: Math.max(0, chain.length - 1),
      elapsedMs: Math.round(performance.now() - startedAt),
      observed: true,
      missing: false,
    };
  }
}

export class SnapshotSource {
  static async create(snapshotRoot) {
    const root = path.resolve(snapshotRoot);
    const manifest = JSON.parse(await readFile(path.join(root, "snapshot-manifest.json"), "utf8"));
    return new SnapshotSource(root, manifest);
  }

  constructor(root, manifest) {
    this.mode = "snapshot";
    this.root = root;
    this.manifest = manifest;
    this.entries = new Map();
    for (const item of [...(manifest.pages ?? []), ...(manifest.sitemaps ?? [])]) {
      for (const candidate of [item.requestedUrl, item.finalUrl]) {
        const key = comparableUrl(candidate);
        if (key) this.entries.set(key, item);
      }
    }
    if (manifest.robots?.url) this.entries.set(comparableUrl(manifest.robots.url), { ...manifest.robots, file: "meta/robots.txt" });
  }

  async request(url) {
    const normalized = comparableUrl(url);
    const entry = this.entries.get(normalized);
    if (!entry?.file) {
      return {
        requestedUrl: normalizeUrl(url) ?? String(url),
        finalUrl: normalizeUrl(url) ?? String(url),
        status: null,
        headers: {},
        body: "",
        chain: [],
        redirectCount: null,
        elapsedMs: 0,
        observed: false,
        missing: true,
      };
    }
    return {
      requestedUrl: normalizeUrl(entry.requestedUrl ?? url) ?? String(url),
      finalUrl: normalizeUrl(entry.finalUrl ?? entry.requestedUrl ?? url) ?? String(url),
      status: entry.status,
      headers: Object.fromEntries(Object.entries(entry.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])),
      body: await readFile(path.join(this.root, entry.file), "utf8"),
      chain: [{ url: normalizeUrl(entry.requestedUrl ?? url), status: entry.status, location: null }],
      redirectCount: entry.requestedUrl && entry.finalUrl && comparableUrl(entry.requestedUrl) !== comparableUrl(entry.finalUrl) ? 1 : 0,
      elapsedMs: 0,
      observed: true,
      missing: false,
      snapshotFile: entry.file,
    };
  }

  async requestBytes(url) {
    return {
      requestedUrl: normalizeUrl(url) ?? String(url),
      finalUrl: normalizeUrl(url) ?? String(url),
      status: null,
      headers: {},
      body: "",
      bodyBytes: null,
      chain: [],
      redirectCount: null,
      elapsedMs: 0,
      observed: false,
      missing: true,
      reason: "Binary resources are not captured in the HTML snapshot.",
    };
  }
}

export async function mapLimit(values, limit, mapper) {
  const items = [...values];
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try {
        output[index] = await mapper(items[index], index);
      } catch (error) {
        output[index] = { __error: String(error?.stack ?? error), input: items[index] };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, worker));
  return output;
}
