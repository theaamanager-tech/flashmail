import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        map[issue.path[0] as string] = issue.message;
      });
      setErrors(map);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Berhasil masuk");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-screen">
      <SiteHeader />
      <main className="flex items-center justify-center px-4 py-20">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md border border-[#303030] bg-[#181818] p-8 animate-slide-in"
        >
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-medium">Masuk</h1>
            <p className="mt-2 text-sm text-muted-foreground">Akses dashboard member FlashMail</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="pl-10"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Ingat saya
                </Label>
              </div>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Lupa password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Masuk
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Daftar
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
