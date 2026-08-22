import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const moduleSource = await readFile(path.resolve(testRoot, "..", "assets", "js", "aiamigos-accessibility-remediation.js"), "utf8");

class FakeEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.key = options.key ?? "";
    this.target = options.target ?? null;
    this.defaultPrevented = false;
    this.propagationStopped = false;
    this.immediatePropagationStopped = false;
  }

  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.propagationStopped = true; }
  stopImmediatePropagation() {
    this.immediatePropagationStopped = true;
    this.propagationStopped = true;
  }
}

class MutationRegistry {
  constructor() { this.observers = []; }

  observe(observer, target, options) {
    observer.target = target;
    observer.options = options;
    this.observers.push(observer);
  }

  notify(target, type, attributeName = null) {
    for (const observer of this.observers) {
      const inScope = target === observer.target || (observer.options.subtree && observer.target.contains(target));
      if (!inScope) continue;
      if (type === "attributes") {
        if (!observer.options.attributes) continue;
        if (observer.options.attributeFilter && !observer.options.attributeFilter.includes(attributeName)) continue;
      } else if (type === "childList" && !observer.options.childList) continue;
      observer.callbackCount += 1;
      observer.callback([{ type, attributeName, target }], observer);
    }
  }
}

class FakeClassList {
  constructor(owner, value = "") {
    this.owner = owner;
    this.values = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  contains(value) { return this.values.has(value); }
  add(...values) {
    let changed = false;
    for (const value of values) {
      if (!this.values.has(value)) {
        this.values.add(value);
        changed = true;
      }
    }
    if (changed) this.owner._classChanged();
  }
  remove(...values) {
    let changed = false;
    for (const value of values) changed = this.values.delete(value) || changed;
    if (changed) this.owner._classChanged();
  }
  toString() { return [...this.values].join(" "); }
  [Symbol.iterator]() { return this.values[Symbol.iterator](); }
}

function matchesSimple(element, selector) {
  const value = selector.trim();
  if (!value) return false;
  if (value === "[hidden]") return element.hasAttribute("hidden");
  if (value === "[aria-hidden='true']") return element.getAttribute("aria-hidden") === "true";
  if (value.startsWith("[style*=")) {
    const needle = value.match(/\[style\*=['"]([^'"]+)['"]\]/)?.[1] ?? "";
    return element.styleText().includes(needle);
  }
  if (value === "[tabindex]") return element.hasAttribute("tabindex");
  if (/^\.[A-Za-z0-9_-]+$/.test(value)) return element.classList.contains(value.slice(1));
  if (value === ".screen-reader-text") return element.classList.contains("screen-reader-text");
  if (value === "a[href]") return element.tagName === "A" && element.hasAttribute("href");
  if (/^(button|input|select|textarea):not\(\[disabled\]\)$/.test(value)) {
    return element.tagName === value.split(":")[0].toUpperCase() && !element.hasAttribute("disabled");
  }
  if (value === "img[alt]:not([alt='']):not([aria-hidden='true'])") {
    return element.tagName === "IMG" && element.hasAttribute("alt") && element.getAttribute("alt") !== "" && element.getAttribute("aria-hidden") !== "true";
  }
  return false;
}

class FakeElement {
  constructor(document, tagName, attributes = {}, ownText = "") {
    this.ownerDocument = document;
    this.tagName = String(tagName).toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.queryOverrides = new Map();
    this.ownText = ownText;
    this.removed = false;
    this.rectVisible = true;
    this.styleValues = {};
    this.style = new Proxy(this.styleValues, {
      set: (target, property, value) => {
        if (target[property] === String(value)) return true;
        target[property] = String(value);
        this.ownerDocument.registry.notify(this, "attributes", "style");
        return true;
      },
    });
    this.classList = new FakeClassList(this, attributes.class ?? "");
    for (const [name, value] of Object.entries(attributes)) {
      if (name !== "class") this.attributes.set(name, String(value));
    }
    if (attributes.class) this.attributes.set("class", this.classList.toString());
  }

  get id() { return this.getAttribute("id") ?? ""; }
  set id(value) { this.setAttribute("id", value); }
  get href() { return this.getAttribute("href") ?? ""; }
  get hidden() { return this.hasAttribute("hidden"); }
  set hidden(value) {
    if (value) this.setAttribute("hidden", "");
    else this.removeAttribute("hidden");
  }
  get textContent() { return this.ownText + this.children.map((child) => child.textContent).join(""); }
  set textContent(value) {
    this.ownText = String(value);
    this.children = [];
  }

  styleText() {
    return Object.entries(this.styleValues).map(([name, value]) => `${name}: ${value}`).join("; ");
  }

  _classChanged() {
    this.attributes.set("class", this.classList.toString());
    this.ownerDocument.registry.notify(this, "attributes", "class");
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
      this.ownerDocument.registry.notify(this, "childList");
    }
    return this;
  }

  setQuery(selector, values) {
    this.queryOverrides.set(selector, Array.isArray(values) ? values : values ? [values] : []);
    return this;
  }

  querySelectorAll(selector) {
    if (this.queryOverrides.has(selector)) return [...this.queryOverrides.get(selector)];
    const selectors = selector.split(",").map((part) => part.trim());
    const results = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (selectors.some((part) => matchesSimple(child, part))) results.push(child);
        visit(child);
      }
    };
    visit(this);
    return results;
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }

  cloneNode(deep = false) {
    const clone = new FakeElement(this.ownerDocument, this.tagName, Object.fromEntries(this.attributes), this.ownText);
    clone.styleValues = { ...this.styleValues };
    clone.style = new Proxy(clone.styleValues, { set: (target, property, value) => { target[property] = String(value); return true; } });
    if (deep) clone.append(...this.children.map((child) => child.cloneNode(true)));
    return clone;
  }

  contains(candidate) {
    if (!candidate) return false;
    if (candidate === this) return true;
    return this.children.some((child) => child.contains(candidate));
  }

  getAttribute(name) {
    if (name === "class") return this.classList.toString() || null;
    if (name === "style") return this.styleText() || null;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    if (name === "class") return this.classList.values.size > 0;
    if (name === "style") return Boolean(this.styleText());
    return this.attributes.has(name);
  }

  setAttribute(name, value) {
    const normalized = String(value);
    if (name === "class") {
      this.classList = new FakeClassList(this, normalized);
      this.attributes.set("class", normalized);
    } else {
      this.attributes.set(name, normalized);
    }
    this.ownerDocument.registry.notify(this, "attributes", name);
  }

  removeAttribute(name) {
    if (!this.hasAttribute(name)) return;
    if (name === "class") this.classList = new FakeClassList(this, "");
    this.attributes.delete(name);
    this.ownerDocument.registry.notify(this, "attributes", name);
  }

  remove() {
    this.removed = true;
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.ownerDocument.registry.notify(this.parentElement, "childList");
    this.parentElement = null;
  }

  addEventListener(type, listener, options = false) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ listener, capture: options === true || options?.capture === true, once: options?.once === true });
  }

  _invoke(event, capture) {
    const entries = [...(this.listeners.get(event.type) ?? [])];
    for (const entry of entries) {
      if (entry.capture !== capture) continue;
      entry.listener.call(this, event);
      if (entry.once) this.listeners.set(event.type, (this.listeners.get(event.type) ?? []).filter((candidate) => candidate !== entry));
      if (event.immediatePropagationStopped) break;
    }
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    const path = [];
    let node = this;
    while (node) {
      path.unshift(node);
      node = node.parentElement;
    }
    for (const current of path) {
      current._invoke(event, true);
      if (event.propagationStopped) return !event.defaultPrevented;
    }
    for (const current of path.reverse()) {
      current._invoke(event, false);
      if (event.propagationStopped) break;
    }
    return !event.defaultPrevented;
  }

  click() { this.dispatchEvent(new FakeEvent("click", { target: this })); }
  focus() { this.ownerDocument.activeElement = this; }
  getClientRects() {
    if (!this.rectVisible || this.hidden || this.style.display === "none" || this.style.visibility === "hidden") return [];
    return [{}];
  }
}

class FakeDocument extends FakeElement {
  constructor(registry) {
    super({ registry }, "document");
    this.ownerDocument = this;
    this.registry = registry;
    this.readyState = "loading";
    this.body = new FakeElement(this, "body");
    this.body.parentElement = this;
    this.children = [this.body];
    this.activeElement = this.body;
  }

  create(tagName, attributes = {}, text = "") { return new FakeElement(this, tagName, attributes, text); }

  getElementById(id) {
    let found = null;
    const visit = (node) => {
      if (node.id === id) found = node;
      if (!found) node.children.forEach(visit);
    };
    visit(this);
    return found;
  }
}

function createHarness({ reducedMotion = false } = {}) {
  const registry = new MutationRegistry();
  const document = new FakeDocument(registry);
  const autoplayEvents = [];
  const mediaListeners = [];
  let api = null;
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.callbackCount = 0;
      this.options = null;
      this.target = null;
    }
    observe(target, options) { registry.observe(this, target, options); }
    disconnect() {}
  }
  const windowListeners = new Map();
  const window = {
    document,
    URL,
    location: { href: "https://www.aiamigos.org/home/" },
    MutationObserver: FakeMutationObserver,
    getComputedStyle: (element) => ({
      display: element.style.display || "block",
      visibility: element.style.visibility || "visible",
    }),
    setTimeout: (callback) => { callback(); return 1; },
    requestAnimationFrame: (callback) => { callback(); return 1; },
    addEventListener: (type, listener) => {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    },
    matchMedia: () => ({
      matches: reducedMotion,
      addEventListener: (_type, listener) => mediaListeners.push(listener),
      addListener: (listener) => mediaListeners.push(listener),
    }),
    jQuery: (element) => ({ trigger: (name) => autoplayEvents.push({ element, name }) }),
    __AIAMIGOS_A11Y_TEST_HOOK__: (exports) => { api = exports; },
  };
  window.window = window;
  vm.runInNewContext(moduleSource, { window }, { filename: "aiamigos-accessibility-remediation.js" });
  assert.ok(api, "test hook should expose the real module functions");
  return { api, autoplayEvents, document, mediaListeners, registry, window };
}

function buildSlide(document, title, { active = false, includeDuplicate = true } = {}) {
  const slide = document.create("div", { class: `owl-item${active ? " active" : ""}` });
  const content = document.create("div", { class: "our-blogs-content" });
  const heading = document.create("h3", { class: "aiamigos-blog-card-title" }, title);
  if (includeDuplicate) heading.append(document.create("span", { class: "screen-reader-text" }, title));
  const link = document.create("a", { href: `/${title.toLowerCase()}/` }, "Continue Reading");
  content.append(heading, link);
  slide.append(content);
  slide.setQuery(".our-blogs-content", content);
  slide.setQuery(".our-blogs-content h3.aiamigos-blog-card-title", heading);
  slide.setQuery("a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]", [link]);
  return { content, heading, link, slide };
}

function buildCarouselFixture(harness) {
  const { document } = harness;
  const carousel = document.create("div", { class: "owl-carousel" });
  const first = buildSlide(document, "Alpha", { active: true });
  const second = buildSlide(document, "Beta");
  const clone = document.create("div", { class: "owl-item cloned" });
  const cloneLink = document.create("a", { href: "/alpha/" }, "Continue Reading");
  clone.append(cloneLink);
  clone.setQuery("a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]", [cloneLink]);

  const dots = document.create("div", { class: "owl-dots" });
  const dotOne = document.create("button", { class: "owl-dot active" });
  dotOne.append(document.create("span", { class: "blog-dots" }, "hidden Owl filler"));
  const dotTwo = document.create("button", { class: "owl-dot" });
  dots.append(dotOne, dotTwo);
  const nav = document.create("div", { class: "owl-nav" });
  const previous = document.create("button", { class: "owl-prev" });
  const next = document.create("button", { class: "owl-next" });
  nav.append(previous, next);
  carousel.append(first.slide, second.slide, clone, dots, nav);
  carousel.setQuery(".owl-item:not(.cloned)", [first.slide, second.slide]);
  carousel.setQuery(".owl-dots > button.owl-dot", [dotOne, dotTwo]);
  carousel.setQuery(".owl-nav > button.owl-prev", previous);
  carousel.setQuery(".owl-nav > button.owl-next", next);
  carousel.setQuery(".owl-item.cloned", [clone]);
  document.body.append(carousel);
  document.setQuery("#our-blogs .owl-carousel", carousel);
  return { carousel, clone, cloneLink, dotOne, dotTwo, first, next, previous, second };
}

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }

test("hidden Owl filler does not block deterministic dot labels", () => {
  const harness = createHarness();
  const fixture = buildCarouselFixture(harness);
  harness.api.synchronizeCarousel(fixture.carousel);
  assert.equal(fixture.dotOne.getAttribute("aria-label"), "Show Alpha (1 of 2)");
  assert.equal(fixture.dotTwo.getAttribute("aria-label"), "Show Beta (2 of 2)");
  assert.equal(fixture.dotOne.getAttribute("aria-current"), "true");
  assert.equal(fixture.dotTwo.hasAttribute("aria-current"), false);
});

test("exact H3 supplies one title and H5-only markup is not guessed", () => {
  const harness = createHarness();
  const fixture = buildCarouselFixture(harness);
  assert.equal(harness.api.titleFromSlide(fixture.first.slide), "Alpha");
  const h5Only = harness.document.create("div", { class: "owl-item" });
  const content = harness.document.create("div", { class: "our-blogs-content" });
  content.append(harness.document.create("h5", {}, "Legacy title"));
  h5Only.append(content);
  h5Only.setQuery(".our-blogs-content", content);
  h5Only.setQuery(".our-blogs-content h3.aiamigos-blog-card-title", []);
  assert.equal(harness.api.titleFromSlide(h5Only), "");
});

test("search opener forwards once while the exact close icon returns focus", () => {
  const harness = createHarness();
  const { document, api } = harness;
  const opener = document.create("span", { class: "search-icon" });
  const openIcon = document.create("i");
  opener.append(openIcon).setQuery("i", openIcon);
  const panel = document.create("div", { class: "serach_outer" });
  panel.style.display = "none";
  const closer = document.create("div", { class: "closepop" });
  const closeIcon = document.create("i");
  closer.append(closeIcon).setQuery("i", closeIcon);
  const input = document.create("input", { type: "search" });
  panel.append(closer, input);
  panel.setQuery("input[type='search'], input:not([type]), input, button, [tabindex]", input);
  document.body.append(opener, panel);
  document.setQuery(".header-search .search-icon", opener);
  document.setQuery(".header-search .serach_outer", panel);
  document.setQuery(".header-search .serach_outer .closepop > i", closeIcon);
  let openChildCalls = 0;
  let closeChildCalls = 0;
  openIcon.addEventListener("click", () => { openChildCalls += 1; panel.style.display = "block"; });
  closeIcon.addEventListener("click", () => { closeChildCalls += 1; panel.style.display = "none"; });

  const wired = api.wireSearchControls();
  opener.click();
  assert.equal(openChildCalls, 1);
  assert.equal(opener.getAttribute("role"), "button");
  assert.equal(opener.getAttribute("aria-expanded"), "true");
  assert.equal(panel.getAttribute("aria-hidden"), "false");
  assert.equal(document.activeElement, input);
  closeIcon.click();
  assert.equal(closeChildCalls, 1);
  assert.equal(opener.getAttribute("aria-expanded"), "false");
  assert.equal(panel.getAttribute("aria-hidden"), "true");
  assert.equal(document.activeElement, opener);
  opener.click();
  document.dispatchEvent(new FakeEvent("keydown", { key: "Escape", target: document }));
  assert.equal(closeChildCalls, 2);
  assert.equal(document.activeElement, opener);
  assert.ok(wired.observer.options.attributeFilter.includes("style"));
});

test("sidebar style mutations drive expanded and hidden state with focus transfer and Escape", () => {
  const harness = createHarness();
  const { document, api } = harness;
  const opener = document.create("div", { id: "open_nav", class: "hamburger" });
  const sidebar = document.create("amp-sidebar", { id: "sidebar1" });
  sidebar.style.display = "none";
  const closer = document.create("div", { id: "close_nav", class: "close-sidebar" });
  sidebar.append(closer);
  document.body.append(opener, sidebar);
  document.setQuery("#open_nav.hamburger", opener);
  document.setQuery("#close_nav.close-sidebar", closer);
  document.setQuery("amp-sidebar#sidebar1", sidebar);
  opener.addEventListener("click", () => { sidebar.style.display = "block"; });
  closer.addEventListener("click", () => { sidebar.style.display = "none"; });

  const wired = api.wireMenuControls();
  assert.equal(opener.getAttribute("aria-expanded"), "false");
  assert.equal(sidebar.getAttribute("aria-hidden"), "true");
  opener.click();
  assert.equal(opener.getAttribute("aria-expanded"), "true");
  assert.equal(sidebar.getAttribute("aria-hidden"), "false");
  assert.equal(document.activeElement, closer);
  document.dispatchEvent(new FakeEvent("keydown", { key: "Escape", target: document }));
  assert.equal(opener.getAttribute("aria-expanded"), "false");
  assert.equal(sidebar.getAttribute("aria-hidden"), "true");
  assert.equal(document.activeElement, opener);
  assert.equal(Array.from(wired.observer.options.attributeFilter).join(","), "class,hidden,open,style");
});

test("carousel focus stops autoplay, focused slides stay exposed, and current states follow Owl", () => {
  const harness = createHarness({ reducedMotion: true });
  const fixture = buildCarouselFixture(harness);
  const wired = harness.api.wireCarousel();
  assert.ok(harness.autoplayEvents.some((entry) => entry.name === "stop.owl.autoplay"), "reduced motion should stop autoplay");
  fixture.second.link.focus();
  fixture.carousel.dispatchEvent(new FakeEvent("focusin", { target: fixture.second.link }));
  assert.ok(harness.autoplayEvents.filter((entry) => entry.name === "stop.owl.autoplay").length >= 2, "focus should independently stop autoplay");
  harness.api.synchronizeCarousel(fixture.carousel);
  assert.equal(fixture.second.slide.getAttribute("aria-hidden"), "false");
  assert.equal(fixture.first.slide.getAttribute("aria-current"), "true");
  assert.equal(fixture.second.slide.hasAttribute("aria-current"), false);
  fixture.cloneLink.focus();
  harness.api.synchronizeCarousel(fixture.carousel);
  assert.equal(fixture.clone.getAttribute("aria-hidden"), "false", "a focused clone must not be aria-hidden");
  assert.notEqual(fixture.cloneLink.getAttribute("tabindex"), "-1");
  harness.document.body.focus();
  harness.api.synchronizeCarousel(fixture.carousel);
  assert.equal(fixture.clone.getAttribute("aria-hidden"), "true");
  assert.equal(fixture.cloneLink.getAttribute("tabindex"), "-1");
  assert.equal(Array.from(wired.observer.options.attributeFilter).join(","), "class");
});

test("carousel class observer converges without an accessibility-attribute mutation loop", () => {
  const harness = createHarness();
  const fixture = buildCarouselFixture(harness);
  const wired = harness.api.wireCarousel();
  assert.equal(wired.observer.callbackCount, 0, "initial accessibility attributes are outside the class-only observer filter");
  fixture.carousel.classList.add("fixture-class-change");
  assert.equal(wired.observer.callbackCount, 1, "one Owl-style class change should trigger one synchronization only");
  harness.api.synchronizeCarousel(fixture.carousel);
  assert.equal(wired.observer.callbackCount, 1, "idempotent accessibility writes must not recursively trigger the observer");
});

let passed = 0;
const failures = [];
for (const entry of tests) {
  try {
    entry.callback();
    passed += 1;
  } catch (error) {
    failures.push({ name: entry.name, error: error.stack || String(error) });
  }
}

console.log(JSON.stringify({ status: failures.length ? "failed" : "passed", tests: tests.length, passed, failures }, null, 2));
if (failures.length) process.exitCode = 1;
