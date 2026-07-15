import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import type { LucideIcon } from "lucide-react";
import {
  Shield,
  Users,
  Globe,
  Settings,
  LayoutDashboard,
  LogOut,
  Loader2,
  Ban,
  Check,
  Trash2,
  Plus,
} from "lucide-react";

import { getCurrentUserFn } from "@/lib/server-fns/auth-fns";
import {
  getAdminStatsFn,
  listUsersFn,
  listPublicDomainsFn,
  addPublicDomainFn,
  deletePublicDomainFn,
  togglePublicDomainFn,
  setUserSuspendedFn,
  setUserAdminFn,
  getSystemSettingsFn,
  updateSystemSettingFn,
} from "@/lib/server-fns/admin-fns";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  beforeLoad: async () => {
    const session = await getCurrentUserFn();
    if (!session?.profile.is_admin) throw redirect({ to: "/" });
  },
});

type AdminUser = Awaited<ReturnType<typeof listUsersFn>>[number];
type AdminDomain = Awaited<ReturnType<typeof listPublicDomainsFn>>[number];

interface AdminNavProps {
  tab: string;
  setTab: (value: string) => void;
  value: string;
  icon: LucideIcon;
  label: string;
}

function AdminPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  async function handleLogout() {
    await signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[#303030] bg-[#181818]">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-medium">Admin Panel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Keluar
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden w-56 shrink-0 border-r border-[#303030] bg-[#181818] p-4 lg:block lg:min-h-[calc(100vh-64px)]">
          <nav className="space-y-1">
            <AdminNav
              tab={tab}
              setTab={setTab}
              value="overview"
              icon={LayoutDashboard}
              label="Overview"
            />
            <AdminNav tab={tab} setTab={setTab} value="users" icon={Users} label="Users" />
            <AdminNav
              tab={tab}
              setTab={setTab}
              value="domains"
              icon={Globe}
              label="Public Domains"
            />
            <AdminNav
              tab={tab}
              setTab={setTab}
              value="settings"
              icon={Settings}
              label="System Settings"
            />
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsContent value="overview" className="mt-0">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="users" className="mt-0">
              <UsersTab />
            </TabsContent>
            <TabsContent value="domains" className="mt-0">
              <DomainsTab />
            </TabsContent>
            <TabsContent value="settings" className="mt-0">
              <SettingsTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function AdminNav({ tab, setTab, value, icon: Icon, label }: AdminNavProps) {
  return (
    <button
      onClick={() => setTab(value)}
      className={`flex w-full items-center gap-2 rounded-none px-3 py-2.5 text-left text-sm font-medium transition ${
        tab === value
          ? "border-l-2 border-primary bg-[#303030] text-white"
          : "text-muted-foreground hover:bg-[#303030]/50 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStatsFn(),
  });

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin text-primary" />;

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-2xl font-medium">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
        <StatCard label="Total Mailboxes" value={stats?.totalMailboxes ?? 0} />
        <StatCard label="Emails Today" value={stats?.emailsToday ?? 0} />
        <StatCard label="API Requests Today" value={stats?.apiRequestsToday ?? 0} />
        <StatCard label="Active API Keys" value={stats?.activeApiKeys ?? 0} />
        <StatCard label="Private Domains" value={stats?.privateDomains ?? 0} />
      </div>
    </div>
  );
}

function UsersTab() {
  const {
    data: users,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsersFn(),
  });

  const suspend = useMutation({
    mutationFn: ({ userId, suspended }: { userId: string; suspended: boolean }) =>
      setUserSuspendedFn({ data: { userId, suspended } }),
    onSuccess: () => refetch(),
  });

  const setAdmin = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      setUserAdminFn({ data: { userId, isAdmin } }),
    onSuccess: () => refetch(),
  });

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-2xl font-medium">Users</h1>
      <div className="mt-6 border border-[#303030] bg-[#181818]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : (
              (users ?? []).map((u: AdminUser) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell>{u.name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.is_admin ? "default" : "secondary"}>
                      {u.is_admin ? "Admin" : "Member"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_suspended ? "destructive" : "outline"}>
                      {u.is_suspended ? "Suspended" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAdmin.mutate({ userId: u.id, isAdmin: !u.is_admin })}
                    >
                      {u.is_admin ? "Remove Admin" : "Make Admin"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => suspend.mutate({ userId: u.id, suspended: !u.is_suspended })}
                    >
                      {u.is_suspended ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DomainsTab() {
  const [name, setName] = useState("");
  const { data: domains, refetch } = useQuery({
    queryKey: ["admin-public-domains"],
    queryFn: () => listPublicDomainsFn(),
  });

  const add = useMutation({
    mutationFn: () => addPublicDomainFn({ data: { name } }),
    onSuccess: () => {
      toast.success("Domain publik ditambahkan");
      setName("");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePublicDomainFn({ data: { id } }),
    onSuccess: () => refetch(),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => togglePublicDomainFn({ data: { id } }),
    onSuccess: () => refetch(),
  });

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-2xl font-medium">Public Domains</h1>
      <div className="mt-6 flex gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="example.com"
          className="max-w-xs"
        />
        <Button onClick={() => add.mutate()} disabled={add.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>
      <div className="mt-6 border border-[#303030] bg-[#181818]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(domains ?? []).map((d: AdminDomain) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono">@{d.name}</TableCell>
                <TableCell>
                  <Badge variant={d.active ? "default" : "secondary"}>
                    {d.active ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggle.mutate(d.id)}>
                    Toggle
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(d.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: settings, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getSystemSettingsFn(),
  });

  const update = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      updateSystemSettingFn({ data: { key, value } }),
    onSuccess: () => {
      toast.success("Setting disimpan");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [dailyLimit, setDailyLimit] = useState(settings?.daily_email_limit ?? "500");
  const [rateLimit, setRateLimit] = useState(settings?.api_rate_limit_per_minute ?? "60");

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-2xl font-medium">System Settings</h1>
      <div className="mt-6 max-w-md space-y-4 border border-[#303030] bg-[#181818] p-6">
        <div>
          <Label>Daily Email Limit</Label>
          <Input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>API Rate Limit / Minute</Label>
          <Input
            type="number"
            value={rateLimit}
            onChange={(e) => setRateLimit(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <Button
          onClick={() => {
            update.mutate({ key: "daily_email_limit", value: dailyLimit });
            update.mutate({ key: "api_rate_limit_per_minute", value: rateLimit });
          }}
        >
          Simpan
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border border-[#303030] bg-[#181818] p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-medium">{value}</div>
    </div>
  );
}
