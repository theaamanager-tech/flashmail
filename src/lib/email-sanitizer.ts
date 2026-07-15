import { sanitize } from "isomorphic-dompurify";

export function sanitizeEmailHtml(html: string): string {
  return sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_ATTR: ["style", "class"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "meta", "link"],
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
  });
}

export function sanitizeEmailSubject(subject: string): string {
  return subject.replace(/[\r\n]/g, "").trim();
}
