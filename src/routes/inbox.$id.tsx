import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Clock, Loader2, KeyRound } from "lucide-react";

import { getPublicMailboxFn } from "@/lib/server-fns/public-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/inbox/$id")({
  component: PublicInboxPage,
});

type PublicEmail = Awaited<ReturnType<typeof getPublicMailboxFn>>["emails"][number];

function PublicInboxPage() {
  const { id: publicId } = useParams({ from: "/inbox/$id" });
  const search = useSearch({ from: "/inbox/$id" }) as { token?: string };
  const [selected, setSelected] = useState<PublicEmail | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-inbox", publicId, search.token],
    queryFn: () => getPublicMailboxFn({ data: { publicId, token: search.token } }),
  });

  return (
    <div className="relative min-h-screen bg-[#181818]">
      <header className="sticky top-0 z-40 border-b border-[#303030] bg-[#181818]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-primary">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg tracking-tight" style={{ fontWeight: 500 }}>
              FlashMail Inbox
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {data?.mailbox.token_enabled && <KeyRound className="inline h-3 w-3 mr-1" />}
            Token Protected
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-medium font-mono">
            {data?.mailbox.email_address}
          </h1>
          <p className="text-sm text-muted-foreground">{data?.emails.length ?? 0} pesan</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
            Akses ditolak atau token tidak valid.
          </div>
        ) : (
          <div className="divide-y divide-[#303030] border-t border-[#303030]">
            {(data?.emails ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <Mail className="mb-4 h-10 w-10 opacity-40" />
                Inbox kosong.
              </div>
            )}
            {(data?.emails ?? []).map((e: PublicEmail) => (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className="flex w-full items-start gap-4 p-4 text-left transition hover:bg-[#303030]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#303030] text-xs font-bold uppercase">
                  {(e.sender_name || e.sender).slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm">{e.sender_name || e.sender}</span>
                    <span className="caption-upper shrink-0 flex items-center gap-1 text-white/50">
                      <Clock className="h-3 w-3" />
                      {new Date(e.received_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold">{e.subject}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {e.text_body || e.html_body}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl bg-[#181818] border-[#303030]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{selected?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-[80px_1fr] gap-2 text-muted-foreground">
              <span>From</span>
              <span className="text-foreground">
                {selected?.sender_name || selected?.sender} ({selected?.sender})
              </span>
              <span>To</span>
              <span className="font-mono text-foreground">{selected?.recipient}</span>
              <span>Date</span>
              <span className="text-foreground">
                {selected && new Date(selected.received_at).toLocaleString("id-ID")}
              </span>
            </div>
            <hr className="border-[#303030]" />
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
              {selected?.text_body || selected?.html_body || "(no body)"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
