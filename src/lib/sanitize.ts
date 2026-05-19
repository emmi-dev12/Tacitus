import sanitizeHtml from "sanitize-html";

// Strict allowlist — strips everything dangerous.
// External resources (images, stylesheets) are blocked to prevent tracking pixels.
const ALLOWED_TAGS = [
  "a", "b", "blockquote", "br", "caption", "cite", "code", "col",
  "colgroup", "dd", "div", "dl", "dt", "em", "h1", "h2", "h3", "h4",
  "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "q", "small",
  "span", "strike", "strong", "sub", "sup", "table", "tbody", "td",
  "tfoot", "th", "thead", "tr", "u", "ul",
];

const ALLOWED_ATTRS: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title"],           // href validated below
  img: ["alt"],                   // src intentionally omitted — blocks tracking pixels
  td: ["rowspan", "colspan"],
  th: ["rowspan", "colspan"],
  "*": ["class"],                 // class is harmless without inline styles
};

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: [],  // no schemes globally — each tag that needs them is listed below
    allowedSchemesByTag: {
      a: ["https", "mailto"],
      // img has no src allowed — allowedSchemesByTag entry not needed
    },
    // Strip inline styles entirely — prevents CSS injection
    allowedStyles: {},
    // Transform all anchors to open in a new tab safely
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
    // No data: URIs anywhere
    disallowedTagsMode: "discard",
  });
}

// Credential / sensitive pattern detection (client-side only, never blocks)
const SENSITIVE_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: "Credit card", re: /\b(?:\d[ -]?){13,16}\b/ },
  { name: "Password in plaintext", re: /\bpassword\s*[:=]\s*\S+/i },
  { name: "Private key", re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: "AWS key", re: /AKIA[0-9A-Z]{16}/ },
];

export function detectSensitiveContent(
  text: string,
): Array<{ name: string }> {
  return SENSITIVE_PATTERNS.filter(({ re }) => re.test(text));
}
