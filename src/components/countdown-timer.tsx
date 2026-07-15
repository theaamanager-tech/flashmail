import { useEffect, useState } from "react";

export function CountdownTimer({
  expiresAt,
  onExpire,
}: {
  expiresAt: number;
  onExpire?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (expiresAt - now <= 0 && onExpire) onExpire();
  }, [now, expiresAt, onExpire]);

  const ms = Math.max(0, expiresAt - now);
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const expired = ms <= 0;
  const critical = ms < 60_000;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium font-mono transition ${
        expired
          ? "bg-destructive/15 text-destructive"
          : critical
            ? "bg-warning/15 text-[oklch(0.85_0.17_75)]"
            : "bg-white/5 text-muted-foreground"
      }`}
      title="Sisa waktu sebelum alamat & inbox dihapus"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${expired ? "bg-destructive" : critical ? "bg-[oklch(0.85_0.17_75)] animate-pulse" : "bg-primary animate-pulse-slow"}`}
      />
      {expired ? "Expired" : `${pad(h)}:${pad(m)}:${pad(s)}`}
    </span>
  );
}
