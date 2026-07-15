import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/password-strength";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

const schema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Password tidak cocok",
    path: ["confirm"],
  });

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ name, email, password, confirm });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        map[issue.path[0] as string] = issue.message;
      });
      setErrors(map);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { name: parsed.data.name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user && data.session) {
      toast.success("Pendaftaran berhasil");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Pendaftaran berhasil", {
        description: "Silakan cek email untuk verifikasi jika diperlukan.",
      });
      navigate({ to: "/login" });
    }
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
            <h1 className="font-display text-2xl font-medium">Daftar</h1>
            <p className="mt-2 text-sm text-muted-foreground">Buat akun member FlashMail</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nama</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-10"
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>

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
              <PasswordStrength password={password} />
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirm">Konfirmasi Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
              {errors.confirm && <p className="mt-1 text-xs text-destructive">{errors.confirm}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Daftar
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Masuk
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
