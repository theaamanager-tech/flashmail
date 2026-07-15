import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Filter, Inbox, Trash2, Key, RefreshCw, Loader2, ChevronRight } from "lucide-react";

import { getMailboxesFn } from "@/lib/server-fns/member-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/dashboard/mailboxes")({
  component: MailboxesPage,
});

function MailboxesPage() {
  const [search, setSearch] = useState("");
  const [domainType, setDomainType] = useState<"all" | "public" | "private">("all");
  const [status, setStatus] = useState<"all" | "active" | "expired">("all");
  const [token, setToken] = useState<"all" | "enabled" | "disabled">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "last_activity">("newest");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["mailboxes", { search, domainType, status, token, sortBy }],
    queryFn: () =>
      getMailboxesFn({
        data: {
          search,
          domainType: domainType === "all" ? undefined : domainType,
          status: status === "all" ? undefined : status,
          tokenEnabled: token === "enabled" ? true : token === "disabled" ? false : undefined,
          sortBy,
        },
      }),
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium sm:text-3xl">My Mailboxes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Total Mailboxes Created: <span className="text-foreground">{data?.total ?? 0}</span>
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/create">Create Email</Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari email atau username…"
            className="pl-10"
          />
        </div>
        <Select value={domainType} onValueChange={(v) => setDomainType(v as typeof domainType)}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            <SelectItem value="public">Public Domain</SelectItem>
            <SelectItem value="private">Private Domain</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={token} onValueChange={(v) => setToken(v as typeof token)}>
          <SelectTrigger className="w-[150px]">
            <Key className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Token</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="last_activity">Last Activity</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="border border-[#303030] bg-[#181818]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email Address</TableHead>
              <TableHead>Domain Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Emails</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : (data?.items ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  Belum ada mailbox.
                </TableCell>
              </TableRow>
            ) : (
              (data?.items ?? []).map((m) => <MailboxRow key={m.id} mailbox={m} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type Mailbox = Awaited<ReturnType<typeof getMailboxesFn>>["items"][number];

function MailboxRow({ mailbox }: { mailbox: Mailbox }) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-mono text-sm">{mailbox.email_address}</div>
        <div className="text-xs text-muted-foreground">@{mailbox.username}</div>
      </TableCell>
      <TableCell>
        <Badge variant={mailbox.domain_type === "private" ? "default" : "secondary"}>
          {mailbox.domain_type === "private" ? "Private" : "Public"}
        </Badge>
      </TableCell>
      <TableCell>
        <StatusBadge status={mailbox.status} />
      </TableCell>
      <TableCell>
        {mailbox.token_enabled ? (
          <Badge variant="outline" className="gap-1">
            <Key className="h-3 w-3" /> Enabled
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Disabled</span>
        )}
      </TableCell>
      <TableCell>{mailbox.email_count ?? 0}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(mailbox.created_at).toLocaleDateString("id-ID")}
      </TableCell>
      <TableCell className="text-right">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard/mailboxes/$id" params={{ id: mailbox.public_id }}>
            Detail <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return <Badge className="bg-success/15 text-success hover:bg-success/15">Active</Badge>;
  if (status === "expired") return <Badge variant="secondary">Expired</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
