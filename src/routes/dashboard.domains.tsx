import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Globe, Plus, Trash2, Check, RefreshCw, Copy, Loader2 } from "lucide-react";

import {
  addPrivateDomainFn,
  deletePrivateDomainFn,
  getPrivateDomainsFn,
  verifyPrivateDomainFn,
} from "@/lib/server-fns/member-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/dashboard/domains")({
  component: DomainsPage,
});

const sampleRecords = [
  { type: "MX", name: "@", priority: "10", value: "route1.mx.cloudflare.net" },
  { type: "MX", name: "@", priority: "20", value: "route2.mx.cloudflare.net" },
  { type: "MX", name: "@", priority: "30", value: "route3.mx.cloudflare.net" },
  { type: "TXT", name: "@", priority: "-", value: "v=spf1 include:_spf.mx.cloudflare.net ~all" },
  { type: "TXT", name: "_dmarc", priority: "-", value: "v=DMARC1; p=none;" },
];

type PrivateDomain = Awaited<ReturnType<typeof addPrivateDomainFn>>;

function DomainsPage() {
  const [newDomain, setNewDomain] = useState("");
  const [setupDomain, setSetupDomain] = useState<PrivateDomain | null>(null);

  const { data: domains, refetch } = useQuery({
    queryKey: ["private-domains"],
    queryFn: () => getPrivateDomainsFn(),
  });

  const add = useMutation({
    mutationFn: () => addPrivateDomainFn({ data: { domain: newDomain } }),
    onSuccess: (d) => {
      toast.success("Domain ditambahkan");
      setNewDomain("");
      setSetupDomain(d);
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const verify = useMutation({
    mutationFn: (id: string) => verifyPrivateDomainFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Domain terverifikasi");
      setSetupDomain(null);
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePrivateDomainFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Domain dihapus");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium sm:text-3xl">My Domains</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola domain pribadi untuk mailbox.</p>
        </div>
      </div>

      <div className="mb-8 border border-[#303030] bg-[#181818] p-5">
        <Label>Tambah Private Domain</Label>
        <div className="mt-2 flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="mydomain.com"
              className="pl-10"
            />
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" /> Add Domain
          </Button>
        </div>
      </div>

      <div className="border border-[#303030] bg-[#181818]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>DNS</TableHead>
              <TableHead>Routing</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(domains ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  <Globe className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  Belum ada domain pribadi.
                </TableCell>
              </TableRow>
            ) : (
              (domains ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono">@{d.domain}</TableCell>
                  <TableCell>
                    <Badge variant={d.is_active ? "default" : "secondary"}>
                      {d.is_active ? "Active" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DnsBadge status={d.verification_status} />
                  </TableCell>
                  <TableCell className="text-xs capitalize">{d.routing_status}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSetupDomain(d)}>
                      Setup
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove.mutate(d.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!setupDomain} onOpenChange={() => setSetupDomain(null)}>
        <DialogContent className="max-w-2xl bg-[#181818] border-[#303030]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Setup — @{setupDomain?.domain}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-xs text-warning">
              Tambahkan DNS records berikut di penyedia DNS-mu, lalu klik Verify.
            </div>
            <div className="border border-[#303030]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Prio</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Copy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleRecords.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono font-semibold text-primary">
                        {r.type}
                      </TableCell>
                      <TableCell className="font-mono">{r.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {r.priority}
                      </TableCell>
                      <TableCell className="truncate font-mono text-muted-foreground">
                        {r.value}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(r.value);
                            toast.success("Disalin");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSetupDomain(null)}>
                Tutup
              </Button>
              <Button
                onClick={() => verify.mutate(setupDomain?.id ?? "")}
                disabled={verify.isPending || !setupDomain}
              >
                {verify.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Check className="mr-2 h-4 w-4" /> Verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DnsBadge({ status }: { status: string }) {
  if (status === "verified")
    return <Badge className="bg-success/15 text-success hover:bg-success/15">Verified</Badge>;
  if (status === "error") return <Badge variant="destructive">Error</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}
