// In-memory + localStorage mock store for the temp mail app.
// Replace with a real backend later (Lovable Cloud + inbound email webhook).

export type Domain = {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  dnsStatus?: "pending" | "verified" | "error";
  routing?: "disabled" | "pending" | "enabled";
};

export type Email = {
  id: string;
  address: string;
  domain: string;
  from: string;
  fromName: string;
  subject: string;
  preview: string;
  body: string;
  html?: string;
  receivedAt: number;
  read: boolean;
};

export type CheckLog = { id: string; address: string; at: number; count: number };
export type Session = { address: string; createdAt: number; expiresAt: number };

const LS_KEY = "tempmail-store-v1";

type Store = {
  domains: Domain[];
  emails: Email[];
  checks: CheckLog[];
  stats: {
    totalCreated: number;
    totalChecks: number;
    addressCounts: Record<string, number>;
  };
};

const DEFAULT_DOMAINS: Domain[] = [
  {
    id: "d1",
    name: "mailnova.dev",
    active: true,
    createdAt: Date.now() - 86400000 * 30,
    dnsStatus: "verified",
    routing: "enabled",
  },
  {
    id: "d2",
    name: "inboxrush.net",
    active: true,
    createdAt: Date.now() - 86400000 * 22,
    dnsStatus: "verified",
    routing: "enabled",
  },
  {
    id: "d3",
    name: "tempwave.io",
    active: true,
    createdAt: Date.now() - 86400000 * 14,
    dnsStatus: "verified",
    routing: "enabled",
  },
  {
    id: "d4",
    name: "ghostbox.io",
    active: true,
    createdAt: Date.now() - 86400000 * 6,
    dnsStatus: "verified",
    routing: "enabled",
  },
  {
    id: "d5",
    name: "flashmail.dev",
    active: false,
    createdAt: Date.now() - 86400000 * 3,
    dnsStatus: "pending",
    routing: "pending",
  },
];

const SAMPLE_SENDERS = [
  {
    from: "no-reply@github.com",
    name: "GitHub",
    subject: "Verify your email address",
    preview: "Please verify your email to finish signing up.",
  },
  {
    from: "team@vercel.com",
    name: "Vercel",
    subject: "Your deployment is live",
    preview: "Your project has been deployed successfully.",
  },
  {
    from: "security@google.com",
    name: "Google",
    subject: "New sign-in alert",
    preview: "We noticed a new sign-in to your Google Account.",
  },
  {
    from: "hello@figma.com",
    name: "Figma",
    subject: "You've been invited to a team",
    preview: "Join your team on Figma to start collaborating.",
  },
  {
    from: "receipts@stripe.com",
    name: "Stripe",
    subject: "Your receipt from Acme Inc.",
    preview: "Thanks for your purchase. Here's your receipt.",
  },
  {
    from: "notifications@slack.com",
    name: "Slack",
    subject: "New message in #general",
    preview: "You have unread messages waiting in Slack.",
  },
  {
    from: "news@producthunt.com",
    name: "Product Hunt",
    subject: "Today's top products",
    preview: "The hottest launches shipped today.",
  },
  {
    from: "otp@discord.com",
    name: "Discord",
    subject: "Your verification code: 483920",
    preview: "Use this code to verify your account.",
  },
  {
    from: "welcome@notion.so",
    name: "Notion",
    subject: "Welcome to Notion",
    preview: "Get started with your new workspace.",
  },
  {
    from: "code@x.com",
    name: "X",
    subject: "Your login code is 719203",
    preview: "Enter this code within 5 minutes to sign in.",
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function seedEmails(domains: Domain[]): Email[] {
  const now = Date.now();
  const active = domains.filter((d) => d.active);
  const list: Email[] = [];
  for (let i = 0; i < 8; i++) {
    const d = active[i % active.length];
    const addr = `user${1000 + i}@${d.name}`;
    const s = SAMPLE_SENDERS[i % SAMPLE_SENDERS.length];
    list.push({
      id: uid(),
      address: addr,
      domain: d.name,
      from: s.from,
      fromName: s.name,
      subject: s.subject,
      preview: s.preview,
      body: `${s.preview}\n\nHalo,\n\nIni email demo. Setelah backend Cloudflare Email Routing terhubung, email asli akan tampil di sini secara realtime.\n\n— Tim ${s.name}`,
      receivedAt: now - i * 1000 * 60 * (5 + i),
      read: i > 2,
    });
  }
  return list;
}

function load(): Store {
  if (typeof window === "undefined") {
    return {
      domains: DEFAULT_DOMAINS,
      emails: [],
      checks: [],
      stats: { totalCreated: 0, totalChecks: 0, addressCounts: {} },
    };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // ignore parse errors
  }
  const seed: Store = {
    domains: DEFAULT_DOMAINS,
    emails: seedEmails(DEFAULT_DOMAINS),
    checks: [],
    stats: {
      totalCreated: 3247,
      totalChecks: 18930,
      addressCounts: {
        "hello@mailnova.dev": 142,
        "test@inboxrush.net": 98,
        "temp@tempwave.io": 76,
        "demo@mailnova.dev": 54,
        "signup@ghostbox.io": 41,
      },
    },
  };
  save(seed);
  return seed;
}

function save(s: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("tempmail:update"));
}

export function getStore(): Store {
  return load();
}

export function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener("tempmail:update", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("tempmail:update", h);
    window.removeEventListener("storage", h);
  };
}

// ---------- Random username ----------

const ADJECTIVES = [
  "silent",
  "cosmic",
  "neon",
  "lunar",
  "misty",
  "pixel",
  "vivid",
  "atlas",
  "nova",
  "onyx",
  "ember",
  "aurora",
  "cobalt",
  "eclipse",
  "frost",
  "galaxy",
  "indigo",
  "jade",
  "solar",
  "topaz",
  "amber",
  "brisk",
  "crystal",
  "dusk",
  "electric",
  "forest",
  "glossy",
  "hyper",
  "icy",
  "jazzy",
  "swift",
  "turbo",
  "urban",
  "vapor",
  "wild",
  "zesty",
  "royal",
  "noble",
  "radiant",
  "stellar",
  "quiet",
  "brave",
  "clever",
  "daring",
  "gentle",
  "happy",
  "lucky",
  "mellow",
  "proud",
  "witty",
];
const NOUNS = [
  "fox",
  "wave",
  "wolf",
  "byte",
  "fern",
  "harbor",
  "comet",
  "tiger",
  "raven",
  "otter",
  "atlas",
  "meadow",
  "echo",
  "harbor",
  "phoenix",
  "cipher",
  "willow",
  "panther",
  "falcon",
  "lynx",
  "ember",
  "frost",
  "glacier",
  "horizon",
  "island",
  "jungle",
  "koi",
  "lotus",
  "mystic",
  "nebula",
  "orbit",
  "prism",
  "quill",
  "ridge",
  "spark",
  "tempest",
  "utopia",
  "vortex",
  "whisper",
  "zenith",
  "eagle",
  "hawk",
  "dolphin",
  "panda",
  "dragon",
  "griffin",
  "seraph",
  "valor",
  "voyage",
  "reef",
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomUsername(): string {
  const style = Math.floor(Math.random() * 3);
  const num = Math.floor(Math.random() * 90 + 10);
  if (style === 0) return `${rand(ADJECTIVES)}${rand(NOUNS)}${num}`;
  if (style === 1) return `${rand(ADJECTIVES)}.${rand(NOUNS)}${num}`;
  return `${rand(NOUNS)}${num}${rand(ADJECTIVES).slice(0, 3)}`;
}

export function randomAddress(domain?: string): string {
  const s = getStore();
  const active = s.domains.filter((d) => d.active);
  const d = domain ?? active[Math.floor(Math.random() * active.length)]?.name ?? "mailnova.dev";
  return `${randomUsername()}@${d}`;
}

export function pickRandomDomain(): string {
  const s = getStore();
  const active = s.domains.filter((d) => d.active);
  return active[Math.floor(Math.random() * active.length)]?.name ?? "mailnova.dev";
}

export function registerCreated(address: string) {
  const s = load();
  s.stats.totalCreated += 1;
  s.stats.addressCounts[address] = (s.stats.addressCounts[address] ?? 0) + 1;
  save(s);
}

export function logCheck(address: string) {
  const s = load();
  const count = s.emails.filter((e) => e.address === address).length;
  s.checks.unshift({ id: uid(), address, at: Date.now(), count });
  s.checks = s.checks.slice(0, 200);
  s.stats.totalChecks += 1;
  save(s);
  return count;
}

export function inboxFor(address: string): Email[] {
  return load()
    .emails.filter((e) => e.address === address)
    .sort((a, b) => b.receivedAt - a.receivedAt);
}

export function markRead(id: string) {
  const s = load();
  const e = s.emails.find((x) => x.id === id);
  if (e) {
    e.read = true;
    save(s);
  }
}

export function deleteEmail(id: string) {
  const s = load();
  s.emails = s.emails.filter((e) => e.id !== id);
  save(s);
}

export function purgeAddress(address: string) {
  const s = load();
  s.emails = s.emails.filter((e) => e.address !== address);
  save(s);
}

/** Simulate an incoming email for a specific address. Returns the created email. */
export function simulateIncoming(address: string): Email {
  const s = load();
  const domain = address.split("@")[1] ?? "mailnova.dev";
  const sample = SAMPLE_SENDERS[Math.floor(Math.random() * SAMPLE_SENDERS.length)];
  const email: Email = {
    id: uid(),
    address,
    domain,
    from: sample.from,
    fromName: sample.name,
    subject: sample.subject,
    preview: sample.preview,
    body: `${sample.preview}\n\nHalo,\n\nIni pesan simulasi untuk demo inbox realtime. Setelah backend Cloudflare Email Routing terhubung, email asli akan muncul secara otomatis.\n\n— Tim ${sample.name}`,
    receivedAt: Date.now(),
    read: false,
  };
  s.emails.unshift(email);
  save(s);
  return email;
}

// ---------- Admin ----------

export function addDomain(name: string) {
  const s = load();
  const clean = name.trim().toLowerCase().replace(/^@/, "");
  if (!clean || s.domains.some((d) => d.name === clean)) return;
  s.domains.unshift({
    id: uid(),
    name: clean,
    active: false,
    createdAt: Date.now(),
    dnsStatus: "pending",
    routing: "pending",
  });
  save(s);
}

export function toggleDomain(id: string) {
  const s = load();
  const d = s.domains.find((x) => x.id === id);
  if (d) {
    d.active = !d.active;
    save(s);
  }
}

export function verifyDomainMock(id: string) {
  const s = load();
  const d = s.domains.find((x) => x.id === id);
  if (d) {
    d.dnsStatus = "verified";
    d.routing = "enabled";
    d.active = true;
    save(s);
  }
}

export function deleteDomain(id: string) {
  const s = load();
  s.domains = s.domains.filter((d) => d.id !== id);
  save(s);
}

export function recentEmailsAllDomains(limit = 10): Email[] {
  return load()
    .emails.sort((a, b) => b.receivedAt - a.receivedAt)
    .slice(0, limit);
}

export function topAddresses(limit = 5) {
  const s = load();
  return Object.entries(s.stats.addressCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([address, count]) => ({ address, count }));
}

export function domainDistribution() {
  const s = load();
  const counts: Record<string, number> = {};
  for (const [addr, n] of Object.entries(s.stats.addressCounts)) {
    const d = addr.split("@")[1];
    if (d) counts[d] = (counts[d] ?? 0) + n;
  }
  return Object.entries(counts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
}
