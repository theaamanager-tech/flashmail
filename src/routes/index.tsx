import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  RefreshCw,
  Mail,
  Inbox,
  Check,
  Clock,
  Shuffle,
  ChevronDown,
  Trash2,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import {
  getStore,
  randomUsername,
  pickRandomDomain,
  registerCreated,
  logCheck,
  inboxFor,
  markRead,
  deleteEmail,
  simulateIncoming,
  type Email,
} from "@/lib/mock-store";
import { useStoreVersion } from "@/hooks/use-store";

export const Route = createFileRoute("/")({
  component: Home,
});

const ADDR_KEY = "tempmail-current-address";
const IDLE_MS = 10 * 60 * 1000; // 10 menit inactivity -> auto reload

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

function Home() {
  const storeVersion = useStoreVersion();
  const store = getStore();
  const activeDomains = store.domains.filter((d) => d.active);

  const [username, setUsername] = useState<string>("");
  const [domain, setDomain] = useState<string>("random");
  const [address, setAddress] = useState<string>("");
  const [, setExpiresAt] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Email | null>(null);
  const [domainOpen, setDomainOpen] = useState(false);
  const [justArrivedId, setJustArrivedId] = useState<string | null>(null);
  const initedRef = useRef(false);

  // Boot: rehydrate address or generate
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    const saved = typeof window !== "undefined" ? localStorage.getItem(ADDR_KEY) : null;
    if (saved) {
      setAddress(saved);
      setUsername(saved.split("@")[0] ?? "");
      setDomain(saved.split("@")[1] ?? "random");
    } else {
      const u = randomUsername();
      setUsername(u);
      const addr = `${u}@${pickRandomDomain()}`;
      commitAddress(addr);
    }
  }, []);

  const cleanUsername = username.trim().toLowerCase();
  const usernameValid = USERNAME_RE.test(cleanUsername);

  function commitAddress(addr: string) {
    setAddress(addr);
    setExpiresAt(0);
    setSelected(null);
    if (typeof window !== "undefined") {
      localStorage.setItem(ADDR_KEY, addr);
    }
    registerCreated(addr);
  }

  function createEmail() {
    if (!usernameValid) {
      toast.error("Username 3–32 karakter (a-z, 0-9, . _ -)");
      return;
    }
    const d = domain === "random" ? pickRandomDomain() : domain;
    const addr = `${cleanUsername}@${d}`;
    commitAddress(addr);
    toast.success("Alamat email siap digunakan", { description: addr });
    setTimeout(
      () => document.getElementById("inbox-section")?.scrollIntoView({ behavior: "smooth" }),
      60,
    );
  }

  function shuffleUsername() {
    setUsername(randomUsername());
  }

  function copy() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Alamat email disalin");
    setTimeout(() => setCopied(false), 1500);
  }

  function refresh() {
    if (!address) return;
    logCheck(address);
    if (Math.random() < 0.5) {
      const email = simulateIncoming(address);
      setJustArrivedId(email.id);
      toast(`Email baru dari ${email.fromName}`, {
        description: email.subject,
      });
      setTimeout(() => setJustArrivedId(null), 1200);
    } else {
      toast("Belum ada email baru");
    }
  }

  // Realtime polling — random small chance of new email
  useEffect(() => {
    if (!address) return;
    const t = setInterval(() => {
      if (Math.random() < 0.22) {
        const email = simulateIncoming(address);
        setJustArrivedId(email.id);
        toast(`📩 ${email.fromName}`, { description: email.subject });
        setTimeout(() => setJustArrivedId(null), 1200);
      }
    }, 12_000);
    return () => clearInterval(t);
  }, [address]);

  // Enter to create
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && document.activeElement?.tagName === "INPUT") {
        createEmail();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanUsername, domain]);

  const inbox = useMemo(() => (address ? inboxFor(address) : []), [address, storeVersion]);

  // Inactivity auto-reload (10 menit tanpa aktivitas)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => window.location.reload(), IDLE_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Solid black background */}

      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-8 sm:px-8">
        {/* Hero — editorial */}
        <section className="mt-6 animate-fade-in">
          <div className="caption-upper text-white/60">
            <span className="mr-3 inline-block h-2 w-2 bg-primary align-middle" />
            Disposable Email · Sekali Pakai
          </div>
          <h1
            className="mt-6 font-display text-[44px] leading-[1.05] tracking-[-0.01em] sm:text-[64px] md:text-[80px]"
            style={{ fontWeight: 500, letterSpacing: "-0.02em" }}
          >
            Instant Temporary Email.
            <br />
            <span className="text-white/60">Private. Fast. Simple.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm text-muted-foreground sm:text-base">
            Buat disposable email dalam beberapa detik. Custom username, pilih domain, atau biar
            sistem pilih untukmu. Inbox update otomatis.
          </p>
        </section>

        {/* Generator surface */}
        <section className="mt-16">
          <div className="border-t border-b border-[#303030] py-10 sm:py-12">
            <div className="caption-upper text-white/50">Email Generator</div>

            {/* Row: username input + domain dropdown */}
            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <label className="caption-upper mb-2 block text-white/50">Username</label>
                <div
                  className={`flex items-center border bg-[#181818] px-4 py-3 transition ${
                    username && !usernameValid
                      ? "border-destructive"
                      : "border-[#303030] focus-within:border-white"
                  }`}
                >
                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9._-]/g, "")
                          .slice(0, 32),
                      )
                    }
                    placeholder="enter username"
                    className="min-w-0 flex-1 bg-transparent font-mono text-base outline-none placeholder:text-muted-foreground/50 sm:text-lg"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <button
                    onClick={shuffleUsername}
                    title="Generate random username"
                    className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center border border-[#303030] text-muted-foreground transition hover:border-white hover:text-white"
                  >
                    <Shuffle className="h-4 w-4" />
                  </button>
                </div>
                {username && !usernameValid && (
                  <p className="mt-2 text-[11px] text-destructive">
                    3–32 karakter, hanya a-z 0-9 . _ -
                  </p>
                )}
              </div>

              <div className="relative">
                <label className="caption-upper mb-2 block text-white/50">Domain</label>
                <button
                  onClick={() => setDomainOpen((v) => !v)}
                  className="flex h-[54px] w-full items-center justify-between gap-2 border border-[#303030] bg-[#181818] px-4 font-mono text-sm transition hover:border-white sm:min-w-[240px]"
                >
                  <span className="truncate">
                    {domain === "random" ? "Random domain" : `@${domain}`}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition ${domainOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {domainOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setDomainOpen(false)} />
                    <div className="absolute right-0 z-40 mt-2 w-full min-w-[260px] overflow-hidden border border-[#303030] bg-[#181818] shadow-2xl animate-slide-in">
                      <button
                        onClick={() => {
                          setDomain("random");
                          setDomainOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition hover:bg-[#303030] ${domain === "random" ? "bg-[#303030]" : ""}`}
                      >
                        <Shuffle className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">Random domain</div>
                          <div className="text-[11px] text-muted-foreground">
                            Pilih otomatis dari domain aktif
                          </div>
                        </div>
                      </button>
                      <div className="h-px bg-[#303030]" />
                      {activeDomains.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            setDomain(d.name);
                            setDomainOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left font-mono text-sm transition hover:bg-[#303030] ${domain === d.name ? "bg-[#303030]" : ""}`}
                        >
                          <span>@{d.name}</span>
                          {domain === d.name && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={createEmail} className="ferrari-cta ferrari-cta-primary">
                Create Email
              </button>
              <button
                onClick={copy}
                disabled={!address}
                className="ferrari-cta ferrari-cta-outline disabled:opacity-40"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => {
                  const u = randomUsername();
                  setUsername(u);
                  const d = domain === "random" ? pickRandomDomain() : domain;
                  commitAddress(`${u}@${d}`);
                }}
                className="ferrari-cta ferrari-cta-outline"
              >
                New Email
              </button>
            </div>

            {/* Active address */}
            {address && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-l-2 border-primary bg-[#303030] px-5 py-4">
                <div className="min-w-0">
                  <div className="caption-upper text-white/50">Alamat aktif</div>
                  <div className="mt-1 truncate font-mono text-base font-semibold sm:text-lg">
                    {address}
                  </div>
                </div>
                <div className="caption-upper flex items-center gap-1.5 text-white/50">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Session tersimpan
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Inbox */}
        <section id="inbox-section" className="mt-16">
          <div className="border-t border-[#303030] pt-10">
            <div className="flex flex-wrap items-end justify-between gap-3 pb-6">
              <div>
                <div className="caption-upper text-white/50">Inbox</div>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl" style={{ fontWeight: 500 }}>
                  {inbox.length === 0 ? "Waiting for emails" : `${inbox.length} Pesan`}
                </h2>
              </div>
              <button
                onClick={refresh}
                disabled={!address}
                className="ferrari-cta ferrari-cta-outline disabled:opacity-40"
                style={{ height: 40, padding: "0 20px", fontSize: 12 }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Cek Sekarang
              </button>
            </div>

            <div className="max-h-[560px] divide-y divide-[#303030] overflow-y-auto border-t border-[#303030]">
              {inbox.length === 0 && <EmptyInbox />}

              {inbox.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelected(e);
                    markRead(e.id);
                  }}
                  className={`group flex w-full items-start gap-4 p-4 text-left transition hover:bg-[#303030] ${
                    e.id === justArrivedId ? "bg-primary/10 animate-slide-in" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#303030] text-xs font-bold uppercase text-white">
                    {e.fromName.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${!e.read ? "font-semibold" : ""}`}>
                        {e.fromName}
                      </span>
                      <span className="caption-upper shrink-0 flex items-center gap-1 text-white/50">
                        <Clock className="h-3 w-3" />
                        {timeAgo(e.receivedAt)}
                      </span>
                    </div>
                    <div
                      className={`mt-1 truncate text-sm ${!e.read ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {e.subject}
                    </div>
                    <div className="truncate text-xs text-muted-foreground/70">{e.preview}</div>
                  </div>
                  {!e.read && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </div>
        </section>

        {selected && (
          <EmailModal
            email={selected}
            onClose={() => setSelected(null)}
            onDelete={() => {
              deleteEmail(selected.id);
              setSelected(null);
              toast.success("Email dihapus");
            }}
          />
        )}

        {/* Feature strip */}
        <section className="mt-16 grid gap-0 border-t border-[#303030] sm:grid-cols-3">
          <Feature
            icon={<Zap className="h-4 w-4 text-primary" />}
            title="Instan"
            desc="Alamat baru dalam satu klik."
          />
          <Feature
            icon={<ShieldCheck className="h-4 w-4 text-primary" />}
            title="Private"
            desc="Tanpa daftar. Tanpa jejak."
          />
          <Feature
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            title="Realtime"
            desc="Inbox update otomatis."
          />
        </section>
      </main>
    </div>
  );
}

function EmailModal({
  email,
  onClose,
  onDelete,
}: {
  email: Email;
  onClose: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-2xl overflow-hidden border border-[#303030] bg-[#181818] animate-slide-in"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#303030] px-6 py-4">
          <div className="min-w-0">
            <div className="caption-upper truncate text-white/50">Pesan</div>
            <div className="truncate font-mono text-[11px] text-muted-foreground">
              to {email.address}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onDelete}
              className="ferrari-cta ferrari-cta-outline"
              style={{
                height: 36,
                padding: "0 16px",
                fontSize: 11,
                borderColor: "#f13a2c",
                color: "#f13a2c",
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-9 w-9 items-center justify-center border border-[#303030] text-muted-foreground transition hover:border-white hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6 sm:p-8">
          <h3
            className="font-display text-2xl sm:text-3xl"
            style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            {email.subject}
          </h3>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#303030] pb-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{email.fromName}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{email.from}</div>
            </div>
            <span className="caption-upper shrink-0 flex items-center gap-1 text-white/50">
              <Clock className="h-3 w-3" />
              {new Date(email.receivedAt).toLocaleString("id-ID")}
            </span>
          </div>
          <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
            {email.body}
          </pre>
        </div>
      </div>
    </div>
  );
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="mb-6 flex h-16 w-16 items-center justify-center border border-[#303030]">
        <Mail className="h-6 w-6 text-primary" />
      </div>
      <p className="caption-upper text-white/80">Your inbox is waiting</p>
      <p className="mt-3 max-w-xs text-xs text-muted-foreground">
        Email yang dikirim ke alamat ini akan muncul di sini secara otomatis.
      </p>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="border-b border-[#303030] p-6 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center border border-[#303030]">
          {icon}
        </div>
        <div className="caption-upper">{title}</div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function timeAgo(t: number) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
