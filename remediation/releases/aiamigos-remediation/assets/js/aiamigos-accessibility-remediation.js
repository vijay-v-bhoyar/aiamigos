(function (window) {
	"use strict";

	var document = window.document;
	var FOCUSABLE_SELECTOR = "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]";
	var HIDDEN_FILLER_SELECTOR = ".blog-dots,[hidden],[aria-hidden='true'],[style*='display: none'],[style*='display:none'],[style*='visibility: hidden'],[style*='visibility:hidden']";

	function normalizedText(value) {
		return String(value || "").replace(/\s+/g, " ").trim();
	}

	function setAttributeIfChanged(element, name, value) {
		var normalized = String(value);
		if (element.getAttribute(name) !== normalized) element.setAttribute(name, normalized);
	}

	function removeAttributeIfPresent(element, name) {
		if (element.hasAttribute(name)) element.removeAttribute(name);
	}

	function textWithoutHiddenFiller(element) {
		if (!element || typeof element.cloneNode !== "function") return "";
		var copy = element.cloneNode(true);
		if (copy.querySelectorAll) {
			copy.querySelectorAll(HIDDEN_FILLER_SELECTOR).forEach(function (hidden) {
				hidden.remove();
			});
		}
		return normalizedText(copy.textContent);
	}

	function hasAccessibleName(element, ignoreHiddenFiller) {
		if (!element) return false;
		if (normalizedText(element.getAttribute("aria-label"))) return true;
		if (normalizedText(element.getAttribute("aria-labelledby"))) return true;
		if (normalizedText(element.getAttribute("title"))) return true;
		var descendantText = ignoreHiddenFiller ? textWithoutHiddenFiller(element) : normalizedText(element.textContent);
		if (descendantText) return true;
		var namedImage = element.querySelector && element.querySelector("img[alt]:not([alt='']):not([aria-hidden='true'])");
		return Boolean(namedImage);
	}

	function setLabelIfMissing(element, label, ignoreHiddenFiller) {
		if (!element || hasAccessibleName(element, ignoreHiddenFiller) || !normalizedText(label)) return;
		setAttributeIfChanged(element, "aria-label", normalizedText(label));
	}

	function makeEquivalentCustomButton(element, label) {
		if (!element) return;
		if (element.tagName !== "BUTTON") {
			setAttributeIfChanged(element, "role", "button");
			if (!element.hasAttribute("tabindex")) setAttributeIfChanged(element, "tabindex", "0");
		}
		setLabelIfMissing(element, label, false);
		if (element.getAttribute("data-aiamigos-keyboard-button") === "true") return;
		setAttributeIfChanged(element, "data-aiamigos-keyboard-button", "true");
		element.addEventListener("keydown", function (event) {
			if (event.defaultPrevented || (event.key !== "Enter" && event.key !== " ")) return;
			event.preventDefault();
			element.click();
		});
	}

	function forwardExpandedPointerAreaToChild(parent, childSelector) {
		if (!parent || parent.getAttribute("data-aiamigos-child-forwarding") === "true") return;
		var forwarding = false;
		setAttributeIfChanged(parent, "data-aiamigos-child-forwarding", "true");
		parent.addEventListener("click", function (event) {
			if (forwarding || event.target !== parent) return;
			var child = parent.querySelector(childSelector);
			if (!child || typeof child.click !== "function") return;
			event.preventDefault();
			if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
			forwarding = true;
			try {
				child.click();
			} finally {
				forwarding = false;
			}
		}, true);
	}

	function socialLabel(link) {
		var classMap = {
			twitter: "X",
			insta: "Instagram",
			facebook: "Facebook",
			youtube: "YouTube",
			linkedin: "LinkedIn",
			custom_linkedin: "LinkedIn"
		};
		var classes = Array.prototype.slice.call(link.classList || []);
		for (var index = 0; index < classes.length; index += 1) {
			if (classMap[classes[index]]) return classMap[classes[index]];
		}
		try {
			var host = new window.URL(link.href, window.location.href).hostname.toLowerCase();
			if (host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) return "X";
			if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
			if (host === "facebook.com" || host.endsWith(".facebook.com")) return "Facebook";
			if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "YouTube";
			if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "LinkedIn";
		} catch (error) {
			return "";
		}
		return "";
	}

	function labelStaticLinks() {
		document.querySelectorAll("#site_top .socialbox > a[href], #footer .custom-social-icons > a.custom_linkedin[href]").forEach(function (link) {
			setLabelIfMissing(link, socialLabel(link), false);
		});

		document.querySelectorAll(".bradcrumbs > a[href]").forEach(function (link) {
			if (hasAccessibleName(link, false)) return;
			try {
				var destination = new window.URL(link.href, window.location.href);
				var host = destination.hostname.toLowerCase().replace(/^www\./, "");
				if ((host === "aiamigos.org" || host.endsWith(".aiamigos.org")) && destination.pathname.replace(/\/+$/, "") === "") {
					setAttributeIfChanged(link, "aria-label", "Home");
				}
			} catch (error) {
				// Fail closed: leave an unparseable destination unchanged.
			}
		});
	}

	function elementIsVisible(element) {
		if (!element || element.hidden || element.hasAttribute("hidden")) return false;
		var style = window.getComputedStyle ? window.getComputedStyle(element) : element.style;
		if (style && (style.display === "none" || style.visibility === "hidden")) return false;
		if (element.hasAttribute("open") || element.classList.contains("open") || element.classList.contains("show") || element.classList.contains("active")) return true;
		if (element.style && element.style.display && element.style.display !== "none") return true;
		if (typeof element.getClientRects === "function" && element.getClientRects().length > 0) return true;
		return false;
	}

	function synchronizeDisclosure(opener, panel) {
		var expanded = elementIsVisible(panel);
		setAttributeIfChanged(opener, "aria-expanded", expanded ? "true" : "false");
		setAttributeIfChanged(panel, "aria-hidden", expanded ? "false" : "true");
		return expanded;
	}

	function scheduleDisclosureSync(sync) {
		window.setTimeout(sync, 0);
		window.setTimeout(sync, 150);
		window.setTimeout(sync, 500);
	}

	function observeDisclosure(panel, sync) {
		var observer = new window.MutationObserver(sync);
		observer.observe(panel, {
			attributes: true,
			attributeFilter: ["class", "hidden", "open", "style"]
		});
		return observer;
	}

	function focusSafely(element) {
		if (element && typeof element.focus === "function") element.focus();
	}

	function wireMenuControls() {
		var opener = document.querySelector("#open_nav.hamburger");
		var closer = document.querySelector("#close_nav.close-sidebar");
		var sidebar = document.querySelector("amp-sidebar#sidebar1");
		if (!opener || !closer || !sidebar) return null;

		makeEquivalentCustomButton(opener, "Open navigation menu");
		makeEquivalentCustomButton(closer, "Close navigation menu");
		setAttributeIfChanged(opener, "aria-controls", "sidebar1");
		setAttributeIfChanged(closer, "aria-controls", "sidebar1");

		var focusOnOpen = false;
		var returnOnClose = false;
		function sync() {
			var expanded = synchronizeDisclosure(opener, sidebar);
			if (expanded && focusOnOpen) {
				focusOnOpen = false;
				focusSafely(closer);
			}
			if (!expanded && returnOnClose) {
				returnOnClose = false;
				focusSafely(opener);
			}
		}

		opener.addEventListener("click", function () {
			focusOnOpen = true;
			scheduleDisclosureSync(sync);
		});
		closer.addEventListener("click", function () {
			returnOnClose = true;
			scheduleDisclosureSync(sync);
		});
		document.addEventListener("keydown", function (event) {
			if (event.key !== "Escape" || !elementIsVisible(sidebar) || !sidebar.contains(document.activeElement)) return;
			event.preventDefault();
			returnOnClose = true;
			closer.click();
			scheduleDisclosureSync(sync);
		});

		var observer = observeDisclosure(sidebar, sync);
		sync();
		return { observer: observer, sync: sync };
	}

	function wireSearchControls() {
		var opener = document.querySelector(".header-search .search-icon");
		var panel = document.querySelector(".header-search .serach_outer");
		var closer = document.querySelector(".header-search .serach_outer .closepop > i");
		if (!opener || !panel || !closer) return null;

		makeEquivalentCustomButton(opener, "Open search");
		makeEquivalentCustomButton(closer, "Close search");
		forwardExpandedPointerAreaToChild(opener, "i");
		var panelId = preserveOrCreateId(panel, "aiamigos-search-panel");
		setAttributeIfChanged(opener, "aria-controls", panelId);
		setAttributeIfChanged(closer, "aria-controls", panelId);

		var focusOnOpen = false;
		var returnOnClose = false;
		function sync() {
			var expanded = synchronizeDisclosure(opener, panel);
			if (expanded && focusOnOpen) {
				focusOnOpen = false;
				focusSafely(panel.querySelector("input[type='search'], input:not([type]), input, button, [tabindex]"));
			}
			if (!expanded && returnOnClose) {
				returnOnClose = false;
				focusSafely(opener);
			}
		}

		opener.addEventListener("click", function () {
			focusOnOpen = true;
			scheduleDisclosureSync(sync);
		});
		closer.addEventListener("click", function () {
			returnOnClose = true;
			scheduleDisclosureSync(sync);
		});
		document.addEventListener("keydown", function (event) {
			if (event.key !== "Escape" || !elementIsVisible(panel) || !panel.contains(document.activeElement)) return;
			event.preventDefault();
			returnOnClose = true;
			closer.click();
			scheduleDisclosureSync(sync);
		});

		var observer = observeDisclosure(panel, sync);
		sync();
		return { observer: observer, sync: sync };
	}

	function removeSourceLessCarouselImages() {
		document.querySelectorAll("#our-blogs .owl-carousel .latest-blog-image > img[alt]").forEach(function (image) {
			if (image.getAttribute("src") !== "" || image.getAttribute("alt") !== "") return;
			if (normalizedText(image.getAttribute("srcset"))) return;
			if (normalizedText(image.getAttribute("data-src"))) return;
			if (normalizedText(image.getAttribute("data-lazy-src"))) return;
			image.remove();
		});
	}

	function titleFromSlide(slide) {
		var heading = slide.querySelector(".our-blogs-content h3.aiamigos-blog-card-title");
		if (!heading) return "";
		var copy = heading.cloneNode(true);
		copy.querySelectorAll(".screen-reader-text, [hidden], [aria-hidden='true']").forEach(function (duplicate) {
			duplicate.remove();
		});
		return normalizedText(copy.textContent);
	}

	function preserveOrCreateId(element, preferred) {
		if (normalizedText(element.id)) return element.id;
		var candidate = preferred;
		var suffix = 1;
		while (document.getElementById(candidate)) {
			suffix += 1;
			candidate = preferred + "-" + suffix;
		}
		element.id = candidate;
		return candidate;
	}

	function suppressFocus(container, suppress) {
		container.querySelectorAll(FOCUSABLE_SELECTOR).forEach(function (control) {
			if (suppress) {
				if (!control.hasAttribute("data-aiamigos-original-tabindex")) {
					setAttributeIfChanged(control, "data-aiamigos-original-tabindex", control.hasAttribute("tabindex") ? control.getAttribute("tabindex") : "__none__");
				}
				setAttributeIfChanged(control, "tabindex", "-1");
				return;
			}
			if (!control.hasAttribute("data-aiamigos-original-tabindex")) return;
			var original = control.getAttribute("data-aiamigos-original-tabindex");
			if (original === "__none__") removeAttributeIfPresent(control, "tabindex");
			else setAttributeIfChanged(control, "tabindex", original);
			removeAttributeIfPresent(control, "data-aiamigos-original-tabindex");
		});
	}

	function containsActiveFocus(container) {
		var active = document.activeElement;
		return Boolean(active && active !== document.body && container.contains(active));
	}

	function stopCarouselAutoplay(carousel) {
		try {
			if (typeof window.jQuery === "function") {
				var owl = window.jQuery(carousel);
				if (owl && typeof owl.trigger === "function") owl.trigger("stop.owl.autoplay");
			}
		} catch (error) {
			// Accessibility metadata must remain functional when Owl/jQuery is absent.
		}
		setAttributeIfChanged(carousel, "data-aiamigos-autoplay-stopped", "true");
	}

	function synchronizeCarousel(carousel) {
		var originalSlides = Array.prototype.slice.call(carousel.querySelectorAll(".owl-item:not(.cloned)"))
			.filter(function (slide) { return Boolean(slide.querySelector(".our-blogs-content")); });
		if (!originalSlides.length) return;

		var titles = originalSlides.map(titleFromSlide);
		var total = originalSlides.length;
		originalSlides.forEach(function (slide, index) {
			var slideId = preserveOrCreateId(slide, "aiamigos-blog-slide-" + (index + 1));
			if (!slide.hasAttribute("role")) setAttributeIfChanged(slide, "role", "group");
			if (!slide.hasAttribute("aria-roledescription")) setAttributeIfChanged(slide, "aria-roledescription", "slide");
			if (!slide.hasAttribute("aria-label") && !slide.hasAttribute("aria-labelledby")) {
				var base = titles[index] || "Slide";
				setAttributeIfChanged(slide, "aria-label", base + " (" + (index + 1) + " of " + total + ")");
			}
			setAttributeIfChanged(slide, "data-aiamigos-slide-id", slideId);
			if (slide.classList.contains("active")) setAttributeIfChanged(slide, "aria-current", "true");
			else removeAttributeIfPresent(slide, "aria-current");
		});

		var dots = Array.prototype.slice.call(carousel.querySelectorAll(".owl-dots > button.owl-dot"));
		dots.forEach(function (dot, index) {
			var oneToOne = dots.length === originalSlides.length;
			var label = oneToOne && titles[index]
				? "Show " + titles[index] + " (" + (index + 1) + " of " + total + ")"
				: "Show carousel page " + (index + 1) + " of " + dots.length;
			setLabelIfMissing(dot, label, true);
			if (oneToOne && originalSlides[index]) setAttributeIfChanged(dot, "aria-controls", originalSlides[index].id);
			if (dot.classList.contains("active")) setAttributeIfChanged(dot, "aria-current", "true");
			else removeAttributeIfPresent(dot, "aria-current");
		});

		makeEquivalentCustomButton(carousel.querySelector(".owl-nav > button.owl-prev"), "Previous articles");
		makeEquivalentCustomButton(carousel.querySelector(".owl-nav > button.owl-next"), "Next articles");

		var clones = Array.prototype.slice.call(carousel.querySelectorAll(".owl-item.cloned"));
		clones.forEach(function (clone) {
			var focused = containsActiveFocus(clone);
			setAttributeIfChanged(clone, "aria-hidden", focused ? "false" : "true");
			suppressFocus(clone, !focused);
		});

		var exposed = originalSlides.filter(function (slide) { return slide.classList.contains("active"); });
		var focusedOriginals = originalSlides.filter(containsActiveFocus);
		focusedOriginals.forEach(function (slide) {
			if (exposed.indexOf(slide) === -1) exposed.push(slide);
		});
		if (!exposed.length) {
			var activeDotIndex = dots.findIndex(function (dot) { return dot.classList.contains("active"); });
			if (activeDotIndex >= 0 && originalSlides[activeDotIndex]) exposed = [originalSlides[activeDotIndex]];
		}
		if (!exposed.length) exposed = [originalSlides[0]];
		originalSlides.forEach(function (slide) {
			var hidden = exposed.indexOf(slide) === -1 && !containsActiveFocus(slide);
			setAttributeIfChanged(slide, "aria-hidden", hidden ? "true" : "false");
			suppressFocus(slide, hidden);
		});
	}

	function wireCarousel() {
		var carousel = document.querySelector("#our-blogs .owl-carousel");
		if (!carousel) return null;
		var scheduled = false;
		function scheduleSync() {
			if (scheduled) return;
			scheduled = true;
			(window.requestAnimationFrame || window.setTimeout)(function () {
				scheduled = false;
				synchronizeCarousel(carousel);
			});
		}

		var observer = new window.MutationObserver(scheduleSync);
		observer.observe(carousel, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class"]
		});
		carousel.addEventListener("focusin", function () {
			stopCarouselAutoplay(carousel);
			scheduleSync();
		});
		carousel.addEventListener("focusout", scheduleSync);

		var reducedMotion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
		function applyMotionPreference(event) {
			if (event.matches) stopCarouselAutoplay(carousel);
		}
		if (reducedMotion) {
			applyMotionPreference(reducedMotion);
			if (typeof reducedMotion.addEventListener === "function") reducedMotion.addEventListener("change", applyMotionPreference);
			else if (typeof reducedMotion.addListener === "function") reducedMotion.addListener(applyMotionPreference);
		}

		scheduleSync();
		window.addEventListener("load", scheduleSync, { once: true });
		return { observer: observer, scheduleSync: scheduleSync };
	}

	function initialize() {
		labelStaticLinks();
		wireMenuControls();
		wireSearchControls();
		removeSourceLessCarouselImages();
		wireCarousel();
	}

	var testApi = {
		elementIsVisible: elementIsVisible,
		forwardExpandedPointerAreaToChild: forwardExpandedPointerAreaToChild,
		hasAccessibleName: hasAccessibleName,
		makeEquivalentCustomButton: makeEquivalentCustomButton,
		removeSourceLessCarouselImages: removeSourceLessCarouselImages,
		setLabelIfMissing: setLabelIfMissing,
		stopCarouselAutoplay: stopCarouselAutoplay,
		synchronizeCarousel: synchronizeCarousel,
		titleFromSlide: titleFromSlide,
		wireCarousel: wireCarousel,
		wireMenuControls: wireMenuControls,
		wireSearchControls: wireSearchControls
	};
	if (typeof window.__AIAMIGOS_A11Y_TEST_HOOK__ === "function") window.__AIAMIGOS_A11Y_TEST_HOOK__(testApi);

	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
	else initialize();
}(window));
