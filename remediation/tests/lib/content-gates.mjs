import { stripMarkup } from "./html.mjs";

export const KNOWN_PRODUCTION_DEFECT_PATTERNS = Object.freeze([
  {
    id: "showing_up_everywhere_punctuation",
    pattern: "showing\\s+up\\s+everywhere!,",
    flags: "i",
  },
  {
    id: "malformed_punctuation_comma",
    pattern: "[!?],(?=\\s|$)",
    flags: "u",
  },
  {
    id: "availability_24_star_7",
    pattern: "\\b24\\s*\\*\\s*7\\b",
    flags: "i",
  },
  {
    id: "misspelled_linkedin",
    pattern: "\\bLinkden\\b",
    flags: "i",
  },
  {
    id: "misspelled_high_school_or_collage",
    pattern: "\\bHigh\\s+School\\s+or\\s+Collage\\b",
    flags: "i",
  },
  {
    id: "placeholder_service_url",
    pattern: "\\bService\\s+Url\\b",
    flags: "i",
  },
]);

function enclosedFragment(html, name) {
  const match = String(html ?? "").match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match?.[1] ?? null;
}

function contentFragments(html) {
  const input = String(html ?? "");
  const body = enclosedFragment(input, "body") ?? input;
  const main = enclosedFragment(body, "main") ?? body;
  return { body, main };
}

function compileGlobal(pattern) {
  const flags = [...new Set(`${pattern.flags ?? "i"}g`)].join("");
  return new RegExp(pattern.pattern, flags);
}

function emptyListItemHits(mainHtml) {
  const hits = [];
  for (const match of String(mainHtml ?? "").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const inner = match[1]
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/<br\b[^>]*\/?\s*>/gi, " ")
      .replace(/<p\b[^>]*>\s*<\/p>/gi, " ")
      .trim();
    if (inner) continue;
    hits.push({ id: "empty_list_item", sample: match[0].replace(/\s+/g, " ").trim().slice(0, 160) });
  }
  return hits;
}

function brokenExplicitNumberSequenceHits(mainHtml) {
  const hits = [];
  for (const list of String(mainHtml ?? "").matchAll(/<(ol|ul)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const inner = list[2];
    if (/<(?:ol|ul)\b/i.test(inner)) continue;
    const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => stripMarkup(match[1]));
    if (items.length < 3) continue;
    const numbers = items.map((item) => item.match(/^(\d{1,3})[.)]\s+/)?.[1]).map((value) => Number(value));
    if (numbers.some((number) => !Number.isInteger(number))) continue;
    const discontinuities = numbers
      .map((number, index) => ({ index, previous: index ? numbers[index - 1] : null, number }))
      .filter((entry) => entry.index > 0 && entry.number !== entry.previous + 1);
    if (!discontinuities.length) continue;
    hits.push({
      id: "broken_explicit_number_sequence",
      sample: numbers.join(", "),
      numbers,
      discontinuities,
    });
  }
  return hits;
}

export function productionContentDefects(html, patterns = KNOWN_PRODUCTION_DEFECT_PATTERNS) {
  const { body, main } = contentFragments(html);
  const bodyText = stripMarkup(body);
  const hits = [];
  for (const pattern of patterns) {
    const regex = compileGlobal(pattern);
    for (const match of bodyText.matchAll(regex)) {
      hits.push({ id: pattern.id, sample: match[0] });
    }
  }
  hits.push(...emptyListItemHits(main));
  hits.push(...brokenExplicitNumberSequenceHits(main));
  return hits;
}

const PRIVACY_CONTEXT_PATTERN = /\b(?:privacy\s+(?:notice|policy)|how\s+we\s+(?:use|handle|process|retain)\s+(?:your\s+)?(?:data|information)|data[- ]handling)\b/i;
const RESPONSE_DURATION = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten)\\s+(?:business\\s+)?(?:hours?|days?|weeks?)";
const RESPONSE_EXPECTATION_PATTERN = new RegExp(
  `(?:\\b(?:respond|reply|acknowledge)\\b.{0,100}\\b(?:within|in)\\s+${RESPONSE_DURATION}\\b|\\bexpect\\s+(?:a\\s+)?(?:response|reply|acknowledg(?:e)?ment)\\s+(?:within|in)\\s+${RESPONSE_DURATION}\\b)`,
  "i",
);
const NEGATED_RESPONSE_EXPECTATION_PATTERN = /\b(?:cannot|can't|do\s+not|don't|unable\s+to|no\s+guarantee\s+we(?:\s+will)?)\b.{0,60}\b(?:respond|reply|acknowledge|response|reply|acknowledg(?:e)?ment)\b/i;
const EXCHANGE_MARKER = "AIAMIGOSCONTACTEXCHANGE";

function markedExchangeText(html) {
  const { main } = contentFragments(html);
  return stripMarkup(
    main
      .replace(/<form\b[^>]*>/gi, ` ${EXCHANGE_MARKER} `)
      .replace(/<a\b(?=[^>]*\bhref\s*=\s*["']mailto:)[^>]*>/gi, ` ${EXCHANGE_MARKER} `),
  );
}

export function contactExchangeEvidence(html, { adjacencyWords = 90 } = {}) {
  const text = markedExchangeText(html);
  const words = text.split(/\s+/).filter(Boolean);
  const markerIndexes = words.flatMap((word, index) => (word.includes(EXCHANGE_MARKER) ? [index] : []));
  const contexts = markerIndexes.map((index) => {
    const start = Math.max(0, index - adjacencyWords);
    const end = Math.min(words.length, index + adjacencyWords + 1);
    const context = words.slice(start, end).join(" ").replaceAll(EXCHANGE_MARKER, " ").replace(/\s+/g, " ").trim();
    const adjacentPrivacyContext = PRIVACY_CONTEXT_PATTERN.test(context);
    const explicitResponseExpectation = RESPONSE_EXPECTATION_PATTERN.test(context) && !NEGATED_RESPONSE_EXPECTATION_PATTERN.test(context);
    return {
      adjacentPrivacyContext,
      explicitResponseExpectation,
      complete: adjacentPrivacyContext && explicitResponseExpectation,
      sample: context.slice(0, 500),
    };
  });
  return {
    exchangeCount: contexts.length,
    contexts,
    adjacentPrivacyContext: contexts.some((context) => context.adjacentPrivacyContext),
    explicitResponseExpectation: contexts.some((context) => context.explicitResponseExpectation),
    complete: contexts.some((context) => context.complete),
  };
}

export function contactExchangeViolations(html, options) {
  const evidence = contactExchangeEvidence(html, options);
  const violations = [];
  if (!evidence.exchangeCount) {
    violations.push({ code: "exchange_missing", message: "The Contact page exposes no observable form or email exchange action." });
    return { evidence, violations };
  }
  if (!evidence.adjacentPrivacyContext) {
    violations.push({ code: "privacy_context_missing", message: "The Contact exchange has no adjacent privacy or data-handling context." });
  }
  if (!evidence.explicitResponseExpectation) {
    violations.push({ code: "response_expectation_missing", message: "The Contact exchange has no explicit time-bounded response expectation." });
  }
  if (evidence.adjacentPrivacyContext && evidence.explicitResponseExpectation && !evidence.complete) {
    violations.push({ code: "exchange_context_split", message: "Privacy context and response timing exist, but not beside the same exchange action." });
  }
  return { evidence, violations };
}
