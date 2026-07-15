import filterXSS from "xss";

const xssOptions: import("xss").IFilterXSSOptions = {
  whiteList: {
    a: ["href", "title", "target"],
    b: [],
    br: [],
    code: [],
    div: [],
    em: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    hr: [],
    i: [],
    img: ["src", "alt", "title", "width", "height"],
    li: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    span: [],
    strong: [],
    sub: [],
    sup: [],
    table: [],
    tbody: [],
    td: [],
    tfoot: [],
    th: [],
    thead: [],
    tr: [],
    u: [],
    ul: [],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script"],
};

export function sanitizeEmailHtml(html: string): string {
  return filterXSS(html, xssOptions);
}

export function sanitizeEmailSubject(subject: string): string {
  return subject.replace(/[\r\n]/g, "").trim();
}
