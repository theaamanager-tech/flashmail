import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mail,
  ArrowLeft,
  RefreshCw,
  Copy,
  Key,
  ShieldCheck,
  Trash2,
  Users,
  Loader2,
  Check,
  X,
} from "lucide-react";

import {
  getMailboxDetailFn,
  getEmailsFn,
  getMailboxMembersFn,
  deleteMailboxFn,
  regenerateMailboxTokenFn,
  setTokenEnabledFn,
  inviteMailboxMemberFn,
  removeMailboxMemberFn,
  updateMailboxMemberRoleFn,
} from "@/lib/server-fns/member-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/dashboard/mailboxes/$id")({
  component: MailboxDetailPage,
});

type EmailItem = Awaited<ReturnType<typeof getEmailsFn>>["items"][number];
type Member = Awaited<ReturnType<typeof getMailboxMembersFn>>[number];

function MailboxDetailPage() {
  const { id: publicId } = useParams({ from: "/dashboard/mailboxes/$id" });
  const navigate = useNavigate();
  const [tab, setTab] = useState("inbox");
  const [copied, setCopied] = useState(false);

  const { data: mailbox, isLoading } = useQuery({
    queryKey: ["mailbox", publicId],
    queryFn: () => getMailboxDetailFn({ data: { publicId } }),
  });

  const { data: emails, refetch: refetchEmails } = useQuery({
    queryKey: ["mailbox-emails", publicId],
    queryFn: () => getEmailsFn({ data: { publicId } }),
    enabled: !!mailbox,
  });

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ["mailbox-members", publicId],
    queryFn: () => getMailboxMembersFn({ data: { publicId } }),
    enabled: !!mailbox,
  });

  const deleteMailbox = useMutation({
    mutationFn: () => deleteMailboxFn({ data: { id: mailbox?.id ?? "" } }),
    onSuccess: () => {
      toast.success("Mailbox dihapus");
      navigate({ to: "/dashboard/mailboxes" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const regenerate = useMutation({
    mutationFn: () => regenerateMailboxTokenFn({ data: { id: mailbox?.id ?? "" } }),
    onSuccess: () => {
      toast.success("Token diregenerate");
      refetchEmails();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setEnabled = useMutation({
    mutationFn: (enabled: boolean) =>
      setTokenEnabledFn({ data: { id: mailbox?.id ?? "", enabled } }),
    onSuccess: () => toast.success("Token setting diperbarui"),
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!mailbox) {
    return <div className="py-20 text-center text-muted-foreground">Mailbox tidak ditemukan.</div>;
  }

  const accessUrl = `${window.location.origin}/inbox/${mailbox.public_id}`;

  return (
    <div className="animate-fade-in">
      <Button
        variant="ghost"
        className="mb-4 px-0"
        onClick={() => navigate({ to: "/dashboard/mailboxes" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-medium font-mono">{mailbox.email_address}</h1>
            <Badge variant={mailbox.domain_type === "private" ? "default" : "secondary"}>
              {mailbox.domain_type === "private" ? "Private" : "Public"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Dibuat {new Date(mailbox.created_at).toLocaleString("id-ID")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/inbox/$id", params: { id: publicId } })}
          >
            <Mail className="mr-2 h-4 w-4" /> Public Inbox
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMailbox.mutate()}
            disabled={deleteMailbox.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Hapus
          </Button>
        </div>
      </div>

      <div className="mb-6 border border-[#303030] bg-[#181818] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Mailbox Access Token</div>
              <div className="text-xs text-muted-foreground">
                {mailbox.token_enabled
                  ? "Token aktif — dibutuhkan untuk akses publik"
                  : "Token tidak aktif"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={mailbox.token_enabled}
              onCheckedChange={(v) => setEnabled.mutate(v === true)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
            </Button>
          </div>
        </div>
        {mailbox.token_enabled && (
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 break-all bg-black/30 px-3 py-2 font-mono text-xs text-muted-foreground">
              {accessUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(accessUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
                toast.success("Access link disalin");
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#303030]">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="members">Access & Members</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <div className="border border-[#303030] bg-[#181818]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(emails?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      <Mail className="mx-auto mb-3 h-8 w-8 opacity-40" />
                      Belum ada email.
                    </TableCell>
                  </TableRow>
                ) : (
                  (emails?.items ?? []).map((e: EmailItem) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="text-sm">{e.sender_name || e.sender}</div>
                        <div className="text-xs text-muted-foreground">{e.sender}</div>
                      </TableCell>
                      <TableCell className={!e.is_read ? "font-semibold" : ""}>
                        {e.subject}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(e.received_at).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        {e.is_read ? (
                          <span className="text-xs text-muted-foreground">Read</span>
                        ) : (
                          <Badge variant="default" className="h-2 w-2 rounded-full p-0" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <MembersPanel publicId={publicId} members={members ?? []} onUpdate={refetchMembers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MembersPanel({
  publicId,
  members,
  onUpdate,
}: {
  publicId: string;
  members: Member[];
  onUpdate: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("viewer");
  const [canRegenerate, setCanRegenerate] = useState(false);

  const invite = useMutation({
    mutationFn: () => inviteMailboxMemberFn({ data: { publicId, email, role, canRegenerate } }),
    onSuccess: () => {
      toast.success("Anggota diundang");
      setEmail("");
      onUpdate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (memberId: string) => removeMailboxMemberFn({ data: { publicId, memberId } }),
    onSuccess: () => {
      toast.success("Anggota dihapus");
      onUpdate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateRole = useMutation({
    mutationFn: (p: { memberId: string; role: "member" | "viewer"; canRegenerate: boolean }) =>
      updateMailboxMemberRoleFn({
        data: { publicId, memberId: p.memberId, role: p.role, canRegenerate: p.canRegenerate },
      }),
    onSuccess: () => {
      toast.success("Peran diperbarui");
      onUpdate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="border border-[#303030] bg-[#181818] p-5">
        <h3 className="mb-4 font-display text-lg font-medium">Invite Member</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label>Email akun user</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "member" | "viewer")}
              className="mt-1.5 h-9 w-full border border-input bg-transparent px-3 text-sm"
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            id="can_regen"
            type="checkbox"
            checked={canRegenerate}
            onChange={(e) => setCanRegenerate(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <Label htmlFor="can_regen" className="font-normal">
            Can Regenerate Token
          </Label>
        </div>
        <Button className="mt-4" onClick={() => invite.mutate()} disabled={invite.isPending}>
          {invite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <Users className="mr-2 h-4 w-4" /> Invite
        </Button>
      </div>

      <div className="border border-[#303030] bg-[#181818]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Can Regenerate</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="text-sm">{m.profiles?.name ?? "User"}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role}</Badge>
                </TableCell>
                <TableCell>
                  {m.role === "owner" ? (
                    <ShieldCheck className="h-4 w-4 text-success" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {m.can_regenerate_token ? "Yes" : "No"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {m.role !== "owner" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateRole.mutate({
                            memberId: m.id,
                            role: m.role === "member" ? "viewer" : "member",
                            canRegenerate: m.can_regenerate_token,
                          })
                        }
                      >
                        Jadikan {m.role === "member" ? "Viewer" : "Member"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove.mutate(m.id)}
                        disabled={remove.isPending}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
