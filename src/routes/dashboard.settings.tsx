import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, User, Lock, Bell, Mail } from "lucide-react";

import { updateProfileFn } from "@/lib/server-fns/auth-fns";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, refresh } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [defaultToken, setDefaultToken] = useState(false);
  const [defaultDomain, setDefaultDomain] = useState("random");
  const [notifications, setNotifications] = useState(false);

  const updateProfile = useMutation({
    mutationFn: () => updateProfileFn({ data: { name } }),
    onSuccess: () => {
      toast.success("Profil diperbarui");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const newPw = fd.get("newPassword") as string;
    const confirm = fd.get("confirm") as string;
    if (newPw.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }
    if (newPw !== confirm) {
      toast.error("Password tidak cocok");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password berhasil diubah");
    form.reset();
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-medium sm:text-3xl">Account Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola profil, keamanan, dan preferensi.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-[#303030]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="mailbox">Mailbox Defaults</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="border border-[#303030] bg-[#181818] p-6">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-medium">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled className="mt-1.5 bg-white/5" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
              </div>
              <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Profil
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <form onSubmit={changePassword} className="border border-[#303030] bg-[#181818] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-medium">Change Password</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input id="newPassword" name="newPassword" type="password" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="confirm">Konfirmasi Password Baru</Label>
                <Input id="confirm" name="confirm" type="password" className="mt-1.5" />
              </div>
              <Button type="submit">Ubah Password</Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="mailbox" className="mt-4">
          <div className="border border-[#303030] bg-[#181818] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-medium">Mailbox Defaults</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Default Token Enabled</div>
                  <div className="text-xs text-muted-foreground">
                    Otomatis aktifkan token untuk mailbox baru.
                  </div>
                </div>
                <Switch
                  checked={defaultToken}
                  onCheckedChange={(v) => setDefaultToken(v === true)}
                />
              </div>
              <div>
                <Label>Default Domain Selection</Label>
                <select
                  value={defaultDomain}
                  onChange={(e) => setDefaultDomain(e.target.value)}
                  className="mt-1.5 h-9 w-full border border-input bg-transparent px-3 text-sm"
                >
                  <option value="random">Random Public Domain</option>
                  <option value="random_private">Random My Domain</option>
                  <option value="random_all">Random From All Available Domains</option>
                </select>
              </div>
              <Button onClick={() => toast.success("Preferensi tersimpan")}>
                Simpan Preferensi
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <div className="border border-[#303030] bg-[#181818] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-medium">Notifications</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-xs text-muted-foreground">
                  Terima notifikasi email penting.
                </div>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={(v) => setNotifications(v === true)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
