import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Search, Mail, Loader2 } from "lucide-react";

import { getMailboxesFn, getEmailsFn } from "@/lib/server-fns/member-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/emails")({
  component: EmailsHistoryPage,
});

type Mailbox = Awaited<ReturnType<typeof getMailboxesFn>>["items"][number];
type EmailItem = Awaited<ReturnType<typeof getEmailsFn>>["items"][number];
type AllEmail = EmailItem & { mailbox: Mailbox };

function EmailsHistoryPage() {
  const [search, setSearch] = useState("");
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);
  const [isRead, setIsRead] = useState<boolean | undefined>(undefined);
  const [selectedEmail, setSelectedEmail] = useState<AllEmail | null>(null);

  const { data: mailboxes } = useQuery({
    queryKey: ["mailboxes-all"],
    queryFn: () => getMailboxesFn({ data: {} }),
  });

  const filteredMailboxes = selectedMailbox
    ? (mailboxes?.items ?? []).filter((m) => m.public_id === selectedMailbox)
    : (mailboxes?.items ?? []);

  const emailQueries = useQueries({
    queries: filteredMailboxes.map((m) => ({
      queryKey: ["emails", m.public_id, { search, isRead }],
      queryFn: () =>
        getEmailsFn({
          data: { publicId: m.public_id, options: { search, isRead, limit: 50 } },
        }),
      enabled: !!mailboxes,
    })),
  });

  const allEmails: AllEmail[] = filteredMailboxes
    .flatMap((m, i) => (emailQueries[i].data?.items ?? []).map((e) => ({ ...e, mailbox: m })))
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
    .slice(0, 100);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-medium sm:text-3xl">Email History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Email masuk dari semua mailbox milikmu.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari subject, sender, atau recipient…"
            className="pl-10"
          />
        </div>
        <select
          value={selectedMailbox ?? ""}
          onChange={(e) => setSelectedMailbox(e.target.value || null)}
          className="h-9 border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All Mailboxes</option>
          {(mailboxes?.items ?? []).map((m) => (
            <option key={m.public_id} value={m.public_id}>
              {m.email_address}
            </option>
          ))}
        </select>
        <select
          value={isRead === undefined ? "" : String(isRead)}
          onChange={(e) => {
            const v = e.target.value;
            setIsRead(v === "" ? undefined : v === "true");
          }}
          className="h-9 border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All Status</option>
          <option value="true">Read</option>
          <option value="false">Unread</option>
        </select>
      </div>

      <div className="border border-[#303030] bg-[#181818]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emailQueries.some((q) => q.isLoading) ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : allEmails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Mail className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  Tidak ada email.
                </TableCell>
              </TableRow>
            ) : (
              allEmails.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer hover:bg-[#303030]/50"
                  onClick={() => setSelectedEmail(e)}
                >
                  <TableCell>
                    <div className="text-sm">{e.sender_name || e.sender}</div>
                    <div className="text-xs text-muted-foreground">{e.sender}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.recipient}</TableCell>
                  <TableCell className={!e.is_read ? "font-semibold" : ""}>{e.subject}</TableCell>
                  <TableCell>
                    <Badge variant={e.mailbox.domain_type === "private" ? "default" : "secondary"}>
                      {e.mailbox.domain_type === "private" ? "Private" : "Public"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(e.received_at).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    {e.is_read ? (
                      <span className="text-xs text-muted-foreground">Read</span>
                    ) : (
                      <Badge className="h-2 w-2 rounded-full p-0" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl bg-[#181818] border-[#303030]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{selectedEmail?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-[80px_1fr] gap-2 text-muted-foreground">
              <span>From</span>
              <span className="text-foreground">
                {selectedEmail?.sender_name || selectedEmail?.sender} ({selectedEmail?.sender})
              </span>
              <span>To</span>
              <span className="font-mono text-foreground">{selectedEmail?.recipient}</span>
              <span>Date</span>
              <span className="text-foreground">
                {selectedEmail && new Date(selectedEmail.received_at).toLocaleString("id-ID")}
              </span>
            </div>
            <hr className="border-[#303030]" />
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
              {selectedEmail?.text_body || selectedEmail?.html_body || "(no body)"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
