import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { accessibilityProbeExpression } from "./accessibility-evidence.mjs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function browserCandidates(explicitPath) {
  return [
    explicitPath,
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
}

async function exists(file) {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

class CdpClient {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(webSocketUrl);
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", () => reject(new Error("CDP WebSocket failed to open")), { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject, timer } = this.pending.get(message.id);
        clearTimeout(timer);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.code}: ${message.error.message}`));
        else resolve(message.result ?? {});
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
    });
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(listener);
    return () => this.listeners.get(method)?.delete(listener);
  }

  async send(method, params = {}, timeoutMs = 15_000) {
    await this.opened;
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitFor(method, timeoutMs = 20_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`CDP event timed out: ${method}`));
      }, timeoutMs);
      const off = this.on(method, (params) => {
        clearTimeout(timer);
        off();
        resolve(params);
      });
    });
  }

  close() {
    try {
      this.socket.close();
    } catch {
      // Best-effort browser cleanup.
    }
  }
}

async function launchBrowser({ executablePath, timeoutMs }) {
  let selected = null;
  for (const candidate of browserCandidates(executablePath)) {
    if (await exists(candidate)) {
      selected = candidate;
      break;
    }
  }
  if (!selected) return { skipped: true, reason: "No supported Chrome or Edge executable was found." };

  const profile = await mkdtemp(path.join(os.tmpdir(), "seo-regression-browser-"));
  const child = spawn(selected, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-features=Translate,OptimizationHints",
    "--disable-gpu",
    "--disable-sync",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const portFile = path.join(profile, "DevToolsActivePort");
  const deadline = Date.now() + timeoutMs;
  let port;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      port = Number.parseInt((await readFile(portFile, "utf8")).split(/\r?\n/)[0], 10);
      if (Number.isFinite(port)) break;
    } catch {
      await delay(100);
    }
  }
  if (!port) {
    child.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
    return { skipped: true, reason: `Browser DevTools endpoint did not start (${selected}).` };
  }

  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const target = targets.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
  if (!target) {
    child.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
    return { skipped: true, reason: "Browser started but exposed no debuggable page target." };
  }
  return { child, executablePath: selected, profile, webSocketUrl: target.webSocketDebuggerUrl };
}

function exceptionText(params) {
  const details = params.exceptionDetails ?? {};
  return details.exception?.description || details.text || "Uncaught runtime exception";
}

export function browserProbeFailure(error, pages = []) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    skipped: true,
    failed: true,
    reason: `Browser probe failed before completion: ${message}`,
    pages,
  };
}

export function normalBrowserUserAgent(value) {
  const userAgent = String(value ?? "").trim();
  return userAgent.replace(/HeadlessChrome\//gi, "Chrome/");
}

export async function probeBrowserPages(urls, {
  executablePath,
  timeoutMs = 20_000,
  settleMs = 2_000,
  viewport = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
  accessibility = null,
} = {}) {
  let launch;
  const pages = [];
  try {
    launch = await launchBrowser({ executablePath, timeoutMs });
  } catch (error) {
    return browserProbeFailure(error, pages);
  }
  if (launch.skipped) return { skipped: true, failed: false, reason: launch.reason, pages };

  let client;
  try {
    client = new CdpClient(launch.webSocketUrl);
  } catch (error) {
    launch.child.kill();
    await rm(launch.profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {});
    return browserProbeFailure(error, pages);
  }
  let active = null;
  let browserUserAgent = null;
  const requests = new Map();

  client.on("Runtime.exceptionThrown", (params) => active?.exceptions.push(exceptionText(params)));
  client.on("Runtime.consoleAPICalled", (params) => {
    if (!active || !["error", "assert"].includes(params.type)) return;
    active.consoleErrors.push(params.args?.map((arg) => arg.value ?? arg.description ?? arg.type).join(" ") || params.type);
  });
  client.on("Log.entryAdded", ({ entry }) => {
    if (active && ["error", "warning"].includes(entry?.level)) active.logEntries.push({ level: entry.level, text: entry.text, url: entry.url || null });
  });
  client.on("Network.requestWillBeSent", (params) => {
    if (!active) return;
    requests.set(params.requestId, { url: params.request.url, type: params.type || "Other", mimeType: null, status: null });
  });
  client.on("Network.responseReceived", (params) => {
    if (!active) return;
    const record = requests.get(params.requestId) ?? { url: params.response.url, type: params.type || "Other" };
    Object.assign(record, { mimeType: params.response.mimeType, status: params.response.status, fromDiskCache: params.response.fromDiskCache });
    requests.set(params.requestId, record);
    if (params.type === "Document" && params.response.url === active.url) active.documentStatus = params.response.status;
  });
  client.on("Network.loadingFinished", (params) => {
    if (!active) return;
    const record = requests.get(params.requestId);
    if (!record) return;
    record.encodedDataLength = params.encodedDataLength || 0;
    active.resources.push(record);
    requests.delete(params.requestId);
  });
  client.on("Network.loadingFailed", (params) => {
    if (!active || params.canceled) return;
    const record = requests.get(params.requestId);
    active.networkFailures.push({ url: record?.url ?? null, type: params.type, errorText: params.errorText, blockedReason: params.blockedReason || null });
    requests.delete(params.requestId);
  });

  try {
    await Promise.all([
      client.send("Page.enable"),
      client.send("Runtime.enable"),
      client.send("Log.enable"),
      client.send("Network.enable", { maxTotalBufferSize: 100_000_000 }),
    ]);
    const browserVersion = await client.send("Browser.getVersion");
    browserUserAgent = normalBrowserUserAgent(browserVersion.userAgent);
    if (browserUserAgent) {
      await client.send("Network.setUserAgentOverride", {
        userAgent: browserUserAgent,
        acceptLanguage: "en-US,en;q=0.9",
        platform: process.platform === "win32" ? "Win32" : undefined,
      });
    }
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor,
      mobile: viewport.mobile,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    });

    for (const url of urls) {
      requests.clear();
      active = {
        url,
        documentStatus: null,
        consoleErrors: [],
        exceptions: [],
        logEntries: [],
        networkFailures: [],
        resources: [],
      };
      const load = client.waitFor("Page.loadEventFired", timeoutMs);
      const navigation = await client.send("Page.navigate", { url }, timeoutMs);
      if (navigation.errorText) active.exceptions.push(`Navigation failed: ${navigation.errorText}`);
      await load.catch((error) => active.exceptions.push(error.message));
      await delay(settleMs);
      const evaluated = await client.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          return {
            url: location.href,
            title: document.title,
            domNodes: document.getElementsByTagName('*').length,
            scriptCount: document.scripts.length,
            imageCount: document.images.length,
            horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            loadMs: nav ? Math.round(nav.loadEventEnd) : null
          };
        })()`,
      });
      const runtime = evaluated.result?.value ?? {};
      let accessibilityEvidence = null;
      if (accessibility?.enabled && accessibility.rootUrl) {
        const requested = new URL(url);
        const configuredRoot = new URL(accessibility.rootUrl);
        const isConfiguredRoot = requested.origin === configuredRoot.origin && requested.pathname === configuredRoot.pathname;
        if (isConfiguredRoot) {
          try {
            const accessibilityEvaluation = await client.send("Runtime.evaluate", {
              returnByValue: true,
              awaitPromise: true,
              userGesture: true,
              expression: accessibilityProbeExpression(accessibility),
            }, Math.max(timeoutMs, Number(accessibility.autoplayObservationMs ?? 6_250) + 10_000));
            if (accessibilityEvaluation.exceptionDetails) throw new Error(exceptionText({ exceptionDetails: accessibilityEvaluation.exceptionDetails }));
            accessibilityEvidence = accessibilityEvaluation.result?.value ?? {
              schemaVersion: 1,
              observed: false,
              reason: "The browser returned no structured accessibility value.",
            };
          } catch (error) {
            accessibilityEvidence = {
              schemaVersion: 1,
              observed: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }
      }
      const unique = (items) => [...new Set(items.filter(Boolean))];
      const resources = active.resources;
      const byteSum = (predicate) => resources.filter(predicate).reduce((sum, entry) => sum + (entry.encodedDataLength || 0), 0);
      pages.push({
        requestedUrl: url,
        finalUrl: runtime.url || url,
        title: runtime.title || null,
        documentStatus: active.documentStatus,
        consoleErrors: unique(active.consoleErrors),
        exceptions: unique(active.exceptions),
        logEntries: active.logEntries,
        networkFailures: active.networkFailures,
        accessibility: accessibilityEvidence,
        metrics: {
          totalTransferBytes: byteSum(() => true),
          imageTransferBytes: byteSum((entry) => entry.type === "Image" || entry.mimeType?.startsWith("image/")),
          scriptTransferBytes: byteSum((entry) => entry.type === "Script" || /javascript/i.test(entry.mimeType ?? "")),
          resourceCount: resources.length,
          domNodes: runtime.domNodes ?? null,
          scriptCount: runtime.scriptCount ?? null,
          imageCount: runtime.imageCount ?? null,
          horizontalOverflowPx: runtime.horizontalOverflowPx ?? null,
          loadMs: runtime.loadMs ?? null,
        },
      });
      active = null;
    }
  } catch (error) {
    return browserProbeFailure(error, pages);
  } finally {
    client.close();
    launch.child.kill();
    await delay(250);
    await rm(launch.profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {});
  }
  return { skipped: false, failed: false, executablePath: launch.executablePath, userAgent: browserUserAgent, pages };
}
