import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Key, Plus, Trash2, RefreshCw, Copy, Check, Loader2, Eye, EyeOff } from "lucide-react";

import {
  createApiKeyFn,
  getApiKeysFn,
  regenerateApiKeyFn,
  revokeApiKeyFn,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/api-keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<{ id: string; plaintext: string } | null>(null);

  const { data: keys, refetch } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => getApiKeysFn(),
  });

  const create = useMutation({
    mutationFn: () => createApiKeyFn({ data: { name } }),
    onSuccess: (res) => {
      toast.success("API key dibuat");
      setName("");
      setRevealed({ id: res.apiKey.id, plaintext: res.plaintext });
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeApiKeyFn({ data: { id } }),
    onSuccess: () => {
      toast.success("API key revoked");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const regenerate = useMutation({
    mutationFn: (id: string) => regenerateApiKeyFn({ data: { id } }),
    onSuccess: (res) => {
      toast.success("API key diregenerate");
      setRevealed({ id: res.apiKey.id, plaintext: res.plaintext });
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-medium sm:text-3xl">API Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola API key untuk akses programmatic.
        </p>
      </div>

      <div className="mb-8 border border-[#303030] bg-[#181818] p-5">
        <Label>Nama API Key</Label>
        <div className="mt-2 flex gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production, My Bot, Development…"
            className="flex-1"
          />
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" /> Create Key
          </Button>
        </div>
      </div>

      <div className="border border-[#303030] bg-[#181818]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(keys ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Key className="mx-auto mb-3 h-8 w-8 opacity-40" />
                  Belum ada API key.
                </TableCell>
              </TableRow>
            ) : (
              (keys ?? []).map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {k.key_prefix}••••••••
                    {revealed?.id === k.id && (
                      <span className="ml-2 text-success">{revealed.plaintext}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={k.is_active ? "default" : "secondary"}>
                      {k.is_active ? "Active" : "Revoked"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleString("id-ID") : "Never"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(k.created_at).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    {k.is_active && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => regenerate.mutate(k.id)}
                          disabled={regenerate.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revoke.mutate(k.id)}
                          disabled={revoke.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!revealed} onOpenChange={() => setRevealed(null)}>
        <DialogContent className="bg-[#181818] border-[#303030]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">API Key Created</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Simpan key ini sekarang. Kami tidak akan menampilkannya lagi.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-black/30 px-3 py-2 font-mono text-xs">
              {revealed?.plaintext}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(revealed?.plaintext ?? "");
                toast.success("Disalin");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
