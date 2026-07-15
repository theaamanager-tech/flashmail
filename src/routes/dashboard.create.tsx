import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shuffle, Copy, Check, Loader2, ShieldCheck } from "lucide-react";

import { createMailboxFn, getAvailableDomainsFn } from "@/lib/server-fns/member-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/create")({
  component: CreateEmailPage,
});

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

function CreateEmailPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [domain, setDomain] = useState("random");
  const [domainScope, setDomainScope] = useState<"public" | "private" | "all">("all");
  const [tokenEnabled, setTokenEnabled] = useState(false);
  const [created, setCreated] = useState<{
    email: string;
    publicId: string;
    token?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: domains } = useQuery({
    queryKey: ["available-domains"],
    queryFn: () => getAvailableDomainsFn(),
  });

  const create = useMutation({
    mutationFn: createMailboxFn,
    onSuccess: (res) => {
      toast.success("Mailbox dibuat", { description: res.mailbox.email_address });
      setCreated({
        email: res.mailbox.email_address,
        publicId: res.mailbox.public_id,
        token: res.plaintextToken ?? undefined,
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cleanUsername = username.trim().toLowerCase();
  const valid = !cleanUsername || USERNAME_RE.test(cleanUsername);

  function handleCreate() {
    if (cleanUsername && !valid) {
      toast.error("Username 3–32 karakter (a-z, 0-9, . _ -)");
      return;
    }
    const input: {
      username?: string;
      domain?: string;
      randomDomain?: boolean;
      domainScope?: "public" | "private" | "all";
      tokenEnabled?: boolean;
    } = { tokenEnabled };
    if (cleanUsername) input.username = cleanUsername;
    if (domain === "random") {
      input.randomDomain = true;
      input.domainScope = domainScope;
    } else if (domain === "random_public") {
      input.randomDomain = true;
      input.domainScope = "public";
    } else if (domain === "random_private") {
      input.randomDomain = true;
      input.domainScope = "private";
    } else {
      input.domain = domain;
    }
    create.mutate({ data: input });
  }

  function shuffle() {
    const pool = "abcdefghijklmnopqrstuvwxyz0123456789";
    let u = "";
    for (let i = 0; i < 10; i++) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      u += pool[buf[0] % pool.length];
    }
    setUsername(u);
  }

  function copy() {
    if (!created) return;
    navigator.clipboard.writeText(created.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-2xl font-medium sm:text-3xl">Create Email</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Buat mailbox baru dengan domain publik atau pribadi.
      </p>

      <div className="mt-8 border border-[#303030] bg-[#181818] p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <Label>Username</Label>
            <div className="relative mt-2">
              <Input
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9._-]/g, "")
                      .slice(0, 32),
                  )
                }
                placeholder="random atau ketik username"
                className="font-mono"
              />
              <button
                type="button"
                onClick={shuffle}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-white"
                title="Random username"
              >
                <Shuffle className="h-4 w-4" />
              </button>
            </div>
            {cleanUsername && !valid && (
              <p className="mt-2 text-xs text-destructive">3–32 karakter, hanya a-z 0-9 . _ -</p>
            )}
          </div>

          <div>
            <Label>Domain</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="mt-2 w-full min-w-[240px] font-mono">
                <SelectValue placeholder="Pilih domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random domain</SelectItem>
                <SelectItem value="random_public">Random public domain</SelectItem>
                <SelectItem value="random_private">Random private domain</SelectItem>
                <SelectItem disabled value="sep1">
                  — Public Domains —
                </SelectItem>
                {(domains?.publicDomains ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    @{d.name}
                  </SelectItem>
                ))}
                {(domains?.privateDomains ?? []).length > 0 && (
                  <SelectItem disabled value="sep2">
                    — My Private Domains —
                  </SelectItem>
                )}
                {(domains?.privateDomains ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.name}>
                    @{d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {domain.startsWith("random") && (
          <div className="mt-6">
            <Label>Random Scope</Label>
            <Select
              value={domainScope}
              onValueChange={(v) => setDomainScope(v as "public" | "private" | "all")}
            >
              <SelectTrigger className="mt-2 w-full sm:w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Random from all available domains</SelectItem>
                <SelectItem value="public">Random public domain</SelectItem>
                <SelectItem value="private">Random my private domain</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Switch
            id="token"
            checked={tokenEnabled}
            onCheckedChange={(v) => setTokenEnabled(v === true)}
          />
          <Label htmlFor="token" className="font-normal">
            Protect this mailbox with access token
          </Label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={handleCreate} disabled={create.isPending || (!!cleanUsername && !valid)}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Email
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard/mailboxes" })}>
            My Mailboxes
          </Button>
        </div>
      </div>

      {created && (
        <div className="mt-8 border border-primary bg-primary/10 p-6 animate-slide-in">
          <div className="caption-upper mb-2 text-white/70">Alamat aktif</div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-lg font-semibold">{created.email}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/dashboard/mailboxes" })}>
                Lihat Inbox
              </Button>
            </div>
          </div>
          {created.token && (
            <div className="mt-4 border-t border-[#303030] pt-4">
              <div className="caption-upper mb-1 text-white/70">
                Access token (hanya tampil sekali)
              </div>
              <div className="flex items-center gap-2">
                <code className="break-all rounded bg-black/30 px-2 py-1 font-mono text-xs">
                  {created.token}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/inbox/${created.publicId}?token=${created.token}`,
                    );
                    toast.success("Access link disalin");
                  }}
                >
                  <Copy className="h-4 w-4" /> Link
                </Button>
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-white/60">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Session tersimpan
          </div>
        </div>
      )}
    </div>
  );
}
